import { describe, expect, test, afterAll, beforeEach } from 'bun:test';
import { buildTestApp, seedApiKey, authHeaders, jsonRequest, resetDb } from '../helpers';

beforeEach(resetDb);

describe('auth middleware - key validity and scope', () => {
  test('rejects a request with no API key', async () => {
    const app = buildTestApp();
    const { status, body } = await jsonRequest(app, 'GET', '/api/templates');
    expect(status).toBe(401);
    expect(body).toMatchObject({ error: 'unauthorized' });
  });

  test('rejects an unknown key', async () => {
    const app = buildTestApp();
    const { status } = await jsonRequest(app, 'GET', '/api/templates', {
      headers: authHeaders('mb_totally-made-up-key'),
    });
    expect(status).toBe(401);
  });

  test('accepts a valid admin key', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const { status } = await jsonRequest(app, 'GET', '/api/templates', { headers: authHeaders(plaintext) });
    expect(status).toBe(200);
  });

  test('rejects a revoked key', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin', revoked: true });
    const { status } = await jsonRequest(app, 'GET', '/api/templates', { headers: authHeaders(plaintext) });
    expect(status).toBe(401);
  });

  test('send_only scope is rejected on admin-only routes', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'send_only' });
    const { status, body } = await jsonRequest(app, 'GET', '/api/templates', {
      headers: authHeaders(plaintext),
    });
    expect(status).toBe(403);
    expect(body).toMatchObject({ error: 'forbidden' });
  });

  test('accepts X-API-Key header as an alternative to Authorization: Bearer', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const { status } = await jsonRequest(app, 'GET', '/api/templates', {
      headers: { 'X-API-Key': plaintext },
    });
    expect(status).toBe(200);
  });
});

describe('auth middleware - origin restriction', () => {
  test('rejects a request with no matching Origin header when origins are restricted', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin', allowedOrigins: ['https://app.example.com'] });
    const { status } = await jsonRequest(app, 'GET', '/api/templates', {
      headers: authHeaders(plaintext, { Origin: 'https://evil.example.com' }),
    });
    expect(status).toBe(401);
  });

  test('rejects when no Origin header is sent at all but origins are restricted', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin', allowedOrigins: ['https://app.example.com'] });
    const { status } = await jsonRequest(app, 'GET', '/api/templates', { headers: authHeaders(plaintext) });
    expect(status).toBe(401);
  });

  test('accepts a matching Origin header', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin', allowedOrigins: ['https://app.example.com'] });
    const { status } = await jsonRequest(app, 'GET', '/api/templates', {
      headers: authHeaders(plaintext, { Origin: 'https://app.example.com' }),
    });
    expect(status).toBe(200);
  });

  test('an unrestricted key accepts any Origin (or none)', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const { status } = await jsonRequest(app, 'GET', '/api/templates', {
      headers: authHeaders(plaintext, { Origin: 'https://anything.example.com' }),
    });
    expect(status).toBe(200);
  });
});

describe('auth middleware - IP restriction (real listener, since requestIP needs a live server)', () => {
  const app = buildTestApp();
  const server = app.listen(0);
  const port = server.server!.port;
  // Use 127.0.0.1 explicitly (not "localhost") so the connection is IPv4 and
  // predictably matches the IPv4 CIDR ranges under test - "localhost" can
  // resolve to ::1 (IPv6) depending on the machine.
  const baseUrl = `http://127.0.0.1:${port}`;

  afterAll(() => {
    server.stop();
  });

  test('accepts a key restricted to 127.0.0.0/8 from a loopback request', async () => {
    const { plaintext } = seedApiKey({ scope: 'admin', allowedIps: ['127.0.0.0/8'] });
    const response = await fetch(`${baseUrl}/api/templates`, {
      headers: authHeaders(plaintext),
    });
    expect(response.status).toBe(200);
  });

  test('rejects a key restricted to an unrelated IP range', async () => {
    const { plaintext } = seedApiKey({ scope: 'admin', allowedIps: ['203.0.113.0/24'] });
    const response = await fetch(`${baseUrl}/api/templates`, {
      headers: authHeaders(plaintext),
    });
    expect(response.status).toBe(401);
  });
});
