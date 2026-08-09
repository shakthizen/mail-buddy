import { describe, expect, test, beforeEach } from 'bun:test';
import { buildTestApp, seedApiKey, authHeaders, jsonRequest, resetDb } from '../helpers';

beforeEach(resetDb);

describe('templates CRUD', () => {
  test('create auto-extracts placeholders and returns them', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const { status, body } = await jsonRequest(app, 'POST', '/api/templates', {
      headers: authHeaders(plaintext),
      body: { name: 'Welcome', htmlContent: '<p>Hi {{username}}</p>{{#if vip}}VIP{{/if}}' },
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ name: 'Welcome' });
    expect(body.placeholders.sort()).toEqual(['username', 'vip']);
    expect(body.id).toBeTruthy();
  });

  test('get returns 404 for an unknown id', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const { status, body } = await jsonRequest(app, 'GET', '/api/templates/does-not-exist', {
      headers: authHeaders(plaintext),
    });
    expect(status).toBe(404);
    expect(body).toMatchObject({ error: 'not_found' });
  });

  test('update re-extracts placeholders when htmlContent changes', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const created = (
      await jsonRequest(app, 'POST', '/api/templates', {
        headers: authHeaders(plaintext),
        body: { name: 'T', htmlContent: '<p>{{a}}</p>' },
      })
    ).body;

    const updated = await jsonRequest(app, 'PUT', `/api/templates/${created.id}`, {
      headers: authHeaders(plaintext),
      body: { htmlContent: '<p>{{b}}</p>' },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.placeholders).toEqual(['b']);
  });

  test('update leaves fields untouched when omitted', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const created = (
      await jsonRequest(app, 'POST', '/api/templates', {
        headers: authHeaders(plaintext),
        body: { name: 'Original', description: 'desc', htmlContent: '<p>{{a}}</p>' },
      })
    ).body;

    const updated = await jsonRequest(app, 'PUT', `/api/templates/${created.id}`, {
      headers: authHeaders(plaintext),
      body: { description: 'new desc' },
    });
    expect(updated.body.name).toBe('Original');
    expect(updated.body.description).toBe('new desc');
    expect(updated.body.htmlContent).toBe('<p>{{a}}</p>');
  });

  test('delete removes the template and a second get 404s', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const created = (
      await jsonRequest(app, 'POST', '/api/templates', {
        headers: authHeaders(plaintext),
        body: { name: 'ToDelete', htmlContent: '<p>x</p>' },
      })
    ).body;

    const del = await jsonRequest(app, 'DELETE', `/api/templates/${created.id}`, {
      headers: authHeaders(plaintext),
    });
    expect(del.status).toBe(204);

    const get = await jsonRequest(app, 'GET', `/api/templates/${created.id}`, {
      headers: authHeaders(plaintext),
    });
    expect(get.status).toBe(404);
  });

  test('delete on an unknown id returns 404', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    const { status } = await jsonRequest(app, 'DELETE', '/api/templates/does-not-exist', {
      headers: authHeaders(plaintext),
    });
    expect(status).toBe(404);
  });

  test('list respects limit and offset', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });
    for (let i = 0; i < 3; i++) {
      await jsonRequest(app, 'POST', '/api/templates', {
        headers: authHeaders(plaintext),
        body: { name: `T${i}`, htmlContent: '<p>x</p>' },
      });
    }
    const { body } = await jsonRequest(app, 'GET', '/api/templates?limit=2&offset=0', {
      headers: authHeaders(plaintext),
    });
    expect(body.templates.length).toBe(2);
    expect(body.limit).toBe(2);
  });

  test('send_only key cannot create templates', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'send_only' });
    const { status } = await jsonRequest(app, 'POST', '/api/templates', {
      headers: authHeaders(plaintext),
      body: { name: 'nope', htmlContent: '<p>x</p>' },
    });
    expect(status).toBe(403);
  });
});
