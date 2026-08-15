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

  test('create and update extract placeholders recursively from embedded templates', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });

    // 1. Create a child header template with variables `site_title` and `user_avatar`
    const headerRes = await jsonRequest(app, 'POST', '/api/templates', {
      headers: authHeaders(plaintext),
      body: {
        name: 'Header Partial',
        htmlContent: '<header><h1>{{site_title}}</h1><img src="{{user_avatar}}"/></header>',
      },
    });
    expect(headerRes.status).toBe(200);
    const headerId = headerRes.body.id;

    // 2. Create parent template embedding header and using `order_id`
    const parentRes = await jsonRequest(app, 'POST', '/api/templates', {
      headers: authHeaders(plaintext),
      body: {
        name: 'Receipt Email',
        htmlContent: `{{embed "${headerId}"}}\n<main><p>Order #{{order_id}}</p></main>`,
      },
    });
    expect(parentRes.status).toBe(200);
    // Should include placeholders from both parent and child template!
    expect(parentRes.body.placeholders.sort()).toEqual(['order_id', 'site_title', 'user_avatar']);
  });

  test('POST /api/templates/preview resolves embedded templates and compiles variables', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });

    // Create a partial template
    const header = await jsonRequest(app, 'POST', '/api/templates', {
      headers: authHeaders(plaintext),
      body: {
        name: 'Brand Header',
        htmlContent: '<header><h1>{{brand_name}}</h1></header>',
      },
    });

    // Preview a template embedding the header
    const previewRes = await jsonRequest(app, 'POST', '/api/templates/preview', {
      headers: authHeaders(plaintext),
      body: {
        htmlContent: `{{embed "${header.body.id}"}}\n<p>Hello {{username}}</p>`,
        variables: {
          brand_name: 'Acme Corp',
          username: 'Jane Doe',
        },
      },
    });

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.renderedHtml).toContain('<h1>Acme Corp</h1>');
    expect(previewRes.body.renderedHtml).toContain('<p>Hello Jane Doe</p>');
    expect(previewRes.body.placeholders.sort()).toEqual(['brand_name', 'username']);
    expect(previewRes.body.embeds).toHaveLength(1);
    expect(previewRes.body.embeds[0].id).toBe(header.body.id);
  });

  test('POST /api/templates/preview returns 400 on circular embed cycle', async () => {
    const app = buildTestApp();
    const { plaintext } = seedApiKey({ scope: 'admin' });

    const t1Id = crypto.randomUUID();
    const t2Id = crypto.randomUUID();

    // Create t1 embedding t2
    await jsonRequest(app, 'POST', '/api/templates', {
      headers: authHeaders(plaintext),
      body: {
        name: 'T1',
        htmlContent: `{{embed "${t2Id}"}}`,
      },
    });

    // Previewing t2 embedding t1 directly
    const previewRes = await jsonRequest(app, 'POST', '/api/templates/preview', {
      headers: authHeaders(plaintext),
      body: {
        htmlContent: `{{embed "${t1Id}"}}`,
      },
    });

    expect(previewRes.status).toBe(400);
    expect(previewRes.body.error).toBe('compilation_error');
  });
});
