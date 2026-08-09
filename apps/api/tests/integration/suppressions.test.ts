import { describe, expect, test, beforeEach } from 'bun:test';
import { buildTestApp, seedApiKey, authHeaders, jsonRequest, resetDb } from '../helpers';
import { createUnsubscribeToken } from '../../src/lib/unsubscribeToken';

beforeEach(resetDb);

describe('suppressions - admin API', () => {
  test('add + check a global suppression (no templateId)', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });

    await jsonRequest(app, 'POST', '/api/suppressions', {
      headers: authHeaders(plaintext),
      body: { email: 'a@example.com', reason: 'unsubscribed' },
    });

    const checkNoTemplate = await jsonRequest(app, 'GET', '/api/suppressions/a@example.com', {
      headers: authHeaders(plaintext),
    });
    expect(checkNoTemplate.body.suppressed).toBe(true);

    const checkWithTemplate = await jsonRequest(app, 'GET', '/api/suppressions/a@example.com?templateId=t1', {
      headers: authHeaders(plaintext),
    });
    expect(checkWithTemplate.body.suppressed).toBe(true); // global row suppresses every template too
  });

  test('a per-template suppression does not affect other templates', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });

    await jsonRequest(app, 'POST', '/api/suppressions', {
      headers: authHeaders(plaintext),
      body: { email: 'b@example.com', templateId: 'newsletter' },
    });

    const suppressedForNewsletter = await jsonRequest(
      app,
      'GET',
      '/api/suppressions/b@example.com?templateId=newsletter',
      { headers: authHeaders(plaintext) },
    );
    expect(suppressedForNewsletter.body.suppressed).toBe(true);

    const notSuppressedElsewhere = await jsonRequest(
      app,
      'GET',
      '/api/suppressions/b@example.com?templateId=receipts',
      { headers: authHeaders(plaintext) },
    );
    expect(notSuppressedElsewhere.body.suppressed).toBe(false);

    const notSuppressedGlobally = await jsonRequest(app, 'GET', '/api/suppressions/b@example.com', {
      headers: authHeaders(plaintext),
    });
    expect(notSuppressedGlobally.body.suppressed).toBe(false);
  });

  test('remove deletes only the matching (email, templateId) row', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });

    await jsonRequest(app, 'POST', '/api/suppressions', {
      headers: authHeaders(plaintext),
      body: { email: 'c@example.com', templateId: 't1' },
    });
    await jsonRequest(app, 'POST', '/api/suppressions', {
      headers: authHeaders(plaintext),
      body: { email: 'c@example.com' }, // global row too
    });

    await jsonRequest(app, 'DELETE', '/api/suppressions/c@example.com?templateId=t1', {
      headers: authHeaders(plaintext),
    });

    const perTemplate = await jsonRequest(app, 'GET', '/api/suppressions/c@example.com?templateId=t1', {
      headers: authHeaders(plaintext),
    });
    expect(perTemplate.body.suppressed).toBe(true); // still suppressed globally

    const global = await jsonRequest(app, 'GET', '/api/suppressions/c@example.com', {
      headers: authHeaders(plaintext),
    });
    expect(global.body.suppressed).toBe(true);
  });

  test('list is filterable by templateId', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    await jsonRequest(app, 'POST', '/api/suppressions', {
      headers: authHeaders(plaintext),
      body: { email: 'x@example.com', templateId: 'promo' },
    });
    await jsonRequest(app, 'POST', '/api/suppressions', {
      headers: authHeaders(plaintext),
      body: { email: 'y@example.com', templateId: 'other' },
    });

    const { body } = await jsonRequest(app, 'GET', '/api/suppressions?templateId=promo', {
      headers: authHeaders(plaintext),
    });
    expect(body.suppressions.every((s: { templateId: string }) => s.templateId === 'promo')).toBe(true);
    expect(body.suppressions.some((s: { email: string }) => s.email === 'x@example.com')).toBe(true);
  });
});

describe('public unsubscribe endpoint', () => {
  test('a valid token suppresses the email for that template', async () => {
    const app = buildTestApp();
    const token = createUnsubscribeToken({ email: 'unsub@example.com', templateId: 't1' });

    const response = await app.handle(new Request(`http://localhost/api/unsubscribe?token=${token}`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ unsubscribed: true, email: 'unsub@example.com', templateId: 't1' });

    const { plaintext } = seedApiKey({ scope: 'admin' });
    const check = await jsonRequest(app, 'GET', '/api/suppressions/unsub@example.com?templateId=t1', {
      headers: authHeaders(plaintext),
    });
    expect(check.body.suppressed).toBe(true);
  });

  test('a tampered token is rejected with 400 and does not suppress anything', async () => {
    const app = buildTestApp();
    const token = createUnsubscribeToken({ email: 'safe@example.com', templateId: 't1' });
    const tampered = token.slice(0, -1) + (token.at(-1) === 'a' ? 'b' : 'a');

    const response = await app.handle(new Request(`http://localhost/api/unsubscribe?token=${tampered}`));
    expect(response.status).toBe(400);

    const { plaintext } = seedApiKey({ scope: 'admin' });
    const check = await jsonRequest(app, 'GET', '/api/suppressions/safe@example.com?templateId=t1', {
      headers: authHeaders(plaintext),
    });
    expect(check.body.suppressed).toBe(false);
  });

  test('missing token param is rejected by schema validation', async () => {
    const app = buildTestApp();
    const response = await app.handle(new Request('http://localhost/api/unsubscribe'));
    expect(response.status).toBe(422); // Elysia's validation-failure status - `token` is a required query param
  });

  test('unsubscribe endpoint requires no API key', async () => {
    const app = buildTestApp();
    const token = createUnsubscribeToken({ email: 'noauth@example.com', templateId: null });
    const response = await app.handle(new Request(`http://localhost/api/unsubscribe?token=${token}`));
    expect(response.status).toBe(200);
  });
});
