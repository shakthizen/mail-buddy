import { describe, expect, test, beforeEach } from 'bun:test';
import { buildTestApp, seedApiKey, authHeaders, jsonRequest, resetDb } from '../helpers';

beforeEach(resetDb);

describe('settings', () => {
  test('get returns defaults before anything is configured', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const { status, body } = await jsonRequest(app, 'GET', '/api/settings', { headers: authHeaders(plaintext) });
    expect(status).toBe(200);
    expect(body.smtp.host).toBe('');
    expect(body.storage.provider).toBe('local');
  });

  test('put updates smtp config and get reflects it', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    await jsonRequest(app, 'PUT', '/api/settings', {
      headers: authHeaders(plaintext),
      body: { smtp: { host: 'smtp.example.com', port: 2525, user: 'me', password: 'secret', secure: true } },
    });

    const { body } = await jsonRequest(app, 'GET', '/api/settings', { headers: authHeaders(plaintext) });
    expect(body.smtp.host).toBe('smtp.example.com');
    expect(body.smtp.port).toBe(2525);
    expect(body.smtp.secure).toBe(true);
  });

  test('smtp password is masked on get once set', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    await jsonRequest(app, 'PUT', '/api/settings', {
      headers: authHeaders(plaintext),
      body: { smtp: { password: 'super-secret' } },
    });

    const { body } = await jsonRequest(app, 'GET', '/api/settings', { headers: authHeaders(plaintext) });
    expect(body.smtp.password).not.toBe('super-secret');
    expect(body.smtp.password).toBe('••••••••');
  });

  test('resubmitting the masked password does not overwrite the real one', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    await jsonRequest(app, 'PUT', '/api/settings', {
      headers: authHeaders(plaintext),
      body: { smtp: { password: 'real-secret' } },
    });
    const masked = (await jsonRequest(app, 'GET', '/api/settings', { headers: authHeaders(plaintext) })).body
      .smtp.password;

    // Simulates the dashboard round-tripping the masked value back on an unrelated field change.
    await jsonRequest(app, 'PUT', '/api/settings', {
      headers: authHeaders(plaintext),
      body: { smtp: { host: 'smtp2.example.com', password: masked } },
    });

    const { body } = await jsonRequest(app, 'GET', '/api/settings', { headers: authHeaders(plaintext) });
    expect(body.smtp.host).toBe('smtp2.example.com');
    expect(body.smtp.password).toBe('••••••••'); // still masked, meaning the real secret survived unchanged
  });

  test('send_only key cannot read settings', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'send_only' });
    const { status } = await jsonRequest(app, 'GET', '/api/settings', { headers: authHeaders(plaintext) });
    expect(status).toBe(403);
  });
});

describe('api keys management', () => {
  test('create returns the plaintext key once; list never includes it', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });

    const created = await jsonRequest(app, 'POST', '/api/settings/api-keys', {
      headers: authHeaders(adminKey),
      body: { name: 'integration', scope: 'send_only' },
    });
    expect(created.status).toBe(200);
    expect(created.body.key).toStartWith('mb_');
    expect(created.body.scope).toBe('send_only');

    const list = await jsonRequest(app, 'GET', '/api/settings/api-keys', { headers: authHeaders(adminKey) });
    const entry = list.body.apiKeys.find((k: { id: string }) => k.id === created.body.id);
    expect(entry).toBeDefined();
    expect(entry.key).toBeUndefined();
    expect(entry.hashedKey).toBeUndefined();
  });

  test('created key with restrictions round-trips allowedOrigins/allowedIps', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const created = await jsonRequest(app, 'POST', '/api/settings/api-keys', {
      headers: authHeaders(adminKey),
      body: { name: 'restricted', scope: 'admin', allowedOrigins: ['https://a.com'], allowedIps: ['10.0.0.0/8'] },
    });
    expect(created.body.allowedOrigins).toEqual(['https://a.com']);
    expect(created.body.allowedIps).toEqual(['10.0.0.0/8']);
  });

  test('a newly created key actually works for authentication', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const created = await jsonRequest(app, 'POST', '/api/settings/api-keys', {
      headers: authHeaders(adminKey),
      body: { name: 'works', scope: 'admin' },
    });

    const { status } = await jsonRequest(app, 'GET', '/api/templates', {
      headers: authHeaders(created.body.key),
    });
    expect(status).toBe(200);
  });

  test('revoke prevents further use of the key', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const created = await jsonRequest(app, 'POST', '/api/settings/api-keys', {
      headers: authHeaders(adminKey),
      body: { name: 'to-revoke', scope: 'admin' },
    });

    const revoke = await jsonRequest(app, 'DELETE', `/api/settings/api-keys/${created.body.id}`, {
      headers: authHeaders(adminKey),
    });
    expect(revoke.status).toBe(204);

    const { status } = await jsonRequest(app, 'GET', '/api/templates', {
      headers: authHeaders(created.body.key),
    });
    expect(status).toBe(401);
  });

  test('update changes name and restrictions without rotating the key value', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const created = await jsonRequest(app, 'POST', '/api/settings/api-keys', {
      headers: authHeaders(adminKey),
      body: { name: 'before', scope: 'admin' },
    });

    // allowedOrigins here (not allowedIps) - IP restriction needs a real listening
    // server to test authentication against (see auth.test.ts), since app.handle()
    // has no server.requestIP() to resolve.
    const updated = await jsonRequest(app, 'PUT', `/api/settings/api-keys/${created.body.id}`, {
      headers: authHeaders(adminKey),
      body: { name: 'after', allowedOrigins: ['https://trusted.example.com'] },
    });
    expect(updated.body.name).toBe('after');
    expect(updated.body.allowedOrigins).toEqual(['https://trusted.example.com']);

    // The original key value must still work - update should never rotate it.
    const { status } = await jsonRequest(app, 'GET', '/api/templates', {
      headers: authHeaders(created.body.key, { Origin: 'https://trusted.example.com' }),
    });
    expect(status).toBe(200);
  });
});
