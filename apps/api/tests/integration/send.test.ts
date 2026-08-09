import { describe, expect, test, beforeEach } from 'bun:test';
import { db } from '../../src/db/client';
import { deliveryQueue } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { buildTestApp, seedApiKey, authHeaders, jsonRequest, resetDb } from '../helpers';

beforeEach(resetDb);

async function createTemplate(app: ReturnType<typeof buildTestApp>, adminKey: string, htmlContent: string) {
  const { body } = await jsonRequest(app, 'POST', '/api/templates', {
    headers: authHeaders(adminKey),
    body: { name: 'T', htmlContent },
  });
  return body.id as string;
}

describe('POST /api/send - single recipient', () => {
  test('queues a valid send and stores the rendered HTML', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const templateId = await createTemplate(app, adminKey, '<p>Hi {{username}}</p>');

    const { status, body } = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: { to: 'user@example.com', subject: 'Hi', templateUuid: templateId, variables: { username: 'Jane' } },
    });

    expect(status).toBe(202);
    expect(body.results).toEqual([{ to: 'user@example.com', status: 'queued' }]);

    const row = db.select().from(deliveryQueue).where(eq(deliveryQueue.recipient, 'user@example.com')).get();
    expect(row?.htmlContent).toBe('<p>Hi Jane</p>');
    expect(row?.subject).toBe('Hi');
  });

  test('rejects a recipient missing a required variable, without queuing', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const templateId = await createTemplate(app, adminKey, '<p>Hi {{username}}</p>');

    const { body } = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: { to: 'user@example.com', subject: 'Hi', templateUuid: templateId },
    });

    expect(body.results[0].status).toBe('rejected');
    expect(body.results[0].reason).toContain('username');

    const row = db.select().from(deliveryQueue).where(eq(deliveryQueue.recipient, 'user@example.com')).get();
    expect(row).toBeUndefined();
  });

  test('an array of "to" addresses fans out with shared variables', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const templateId = await createTemplate(app, adminKey, '<p>Hi {{username}}</p>');

    const { body } = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: {
        to: ['a@example.com', 'b@example.com'],
        subject: 'Hi',
        templateUuid: templateId,
        variables: { username: 'Everyone' },
      },
    });

    expect(body.results.map((r: { to: string }) => r.to).sort()).toEqual(['a@example.com', 'b@example.com']);
    expect(body.results.every((r: { status: string }) => r.status === 'queued')).toBe(true);
  });

  test('404s when the template does not exist', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const { status } = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: { to: 'user@example.com', subject: 'Hi', templateUuid: 'does-not-exist' },
    });
    expect(status).toBe(404);
  });

  test('send_only scope is allowed to send', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const { plaintext: sendKey } = seedApiKey({ scope: 'send_only' });
    const templateId = await createTemplate(app, adminKey, '<p>Hi {{username}}</p>');

    const { status } = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(sendKey),
      body: { to: 'user@example.com', subject: 'Hi', templateUuid: templateId, variables: { username: 'X' } },
    });
    expect(status).toBe(202);
  });

  test('renders the embed tree and merges its placeholders', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const footerId = await createTemplate(app, adminKey, '<footer>{{company}}</footer>');
    const mainId = await createTemplate(app, adminKey, `<p>Hi {{username}}</p>{{embed "${footerId}"}}`);

    const { body } = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: {
        to: 'user@example.com',
        subject: 'Hi',
        templateUuid: mainId,
        variables: { username: 'Jane', company: 'Acme' },
      },
    });

    expect(body.results[0].status).toBe('queued');
    const row = db.select().from(deliveryQueue).where(eq(deliveryQueue.recipient, 'user@example.com')).get();
    expect(row?.htmlContent).toBe('<p>Hi Jane</p><footer>Acme</footer>');
  });

  test('an unsatisfiable embed cycle surfaces as a 500 rather than hanging or silently mis-sending', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    // Create template A referencing itself directly - a cycle.
    const created = await jsonRequest(app, 'POST', '/api/templates', {
      headers: authHeaders(adminKey),
      body: { name: 'cyclic', htmlContent: 'placeholder' },
    });
    const selfId = created.body.id as string;
    await jsonRequest(app, 'PUT', `/api/templates/${selfId}`, {
      headers: authHeaders(adminKey),
      body: { htmlContent: `loop {{embed "${selfId}"}}` },
    });

    const response = await app.handle(
      new Request('http://localhost/api/send', {
        method: 'POST',
        headers: { ...authHeaders(adminKey), 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'user@example.com', subject: 'Hi', templateUuid: selfId }),
      }),
    );
    expect(response.status).toBeGreaterThanOrEqual(500);
  });
});

describe('POST /api/send - batch/personalized', () => {
  test('each recipient gets its own rendered content and status', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const templateId = await createTemplate(app, adminKey, '<p>Hi {{username}}</p>');

    const { status, body } = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: {
        subject: 'Digest',
        templateUuid: templateId,
        recipients: [
          { to: 'a@example.com', variables: { username: 'Alice' } },
          { to: 'b@example.com', variables: { username: 'Bob' } },
        ],
      },
    });

    expect(status).toBe(202);
    expect(body.results).toEqual([
      { to: 'a@example.com', status: 'queued' },
      { to: 'b@example.com', status: 'queued' },
    ]);

    const rowA = db.select().from(deliveryQueue).where(eq(deliveryQueue.recipient, 'a@example.com')).get();
    const rowB = db.select().from(deliveryQueue).where(eq(deliveryQueue.recipient, 'b@example.com')).get();
    expect(rowA?.htmlContent).toBe('<p>Hi Alice</p>');
    expect(rowB?.htmlContent).toBe('<p>Hi Bob</p>');
  });

  test('mixed batch: one queued, one rejected (missing var), one skipped (suppressed)', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const templateId = await createTemplate(app, adminKey, '<p>Hi {{username}}</p>');

    await jsonRequest(app, 'POST', '/api/suppressions', {
      headers: authHeaders(adminKey),
      body: { email: 'suppressed@example.com', templateId },
    });

    const { body } = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: {
        subject: 'Digest',
        templateUuid: templateId,
        recipients: [
          { to: 'ok@example.com', variables: { username: 'Ok' } },
          { to: 'missing@example.com' },
          { to: 'suppressed@example.com', variables: { username: 'Nope' } },
        ],
      },
    });

    const byRecipient = Object.fromEntries(body.results.map((r: { to: string; status: string }) => [r.to, r.status]));
    expect(byRecipient['ok@example.com']).toBe('queued');
    expect(byRecipient['missing@example.com']).toBe('rejected');
    expect(byRecipient['suppressed@example.com']).toBe('skipped');
  });

  test('a globally suppressed recipient is skipped for any template', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const templateId = await createTemplate(app, adminKey, '<p>Hi {{username}}</p>');

    await jsonRequest(app, 'POST', '/api/suppressions', {
      headers: authHeaders(adminKey),
      body: { email: 'global@example.com' }, // no templateId = global
    });

    const { body } = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: {
        to: 'global@example.com',
        subject: 'Hi',
        templateUuid: templateId,
        variables: { username: 'X' },
      },
    });

    expect(body.results[0].status).toBe('skipped');
  });

  test('a suppressed-for-one-template recipient still receives a different template', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const templateA = await createTemplate(app, adminKey, '<p>A {{username}}</p>');
    const templateB = await createTemplate(app, adminKey, '<p>B {{username}}</p>');

    await jsonRequest(app, 'POST', '/api/suppressions', {
      headers: authHeaders(adminKey),
      body: { email: 'partial@example.com', templateId: templateA },
    });

    const sentA = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: { to: 'partial@example.com', subject: 'A', templateUuid: templateA, variables: { username: 'X' } },
    });
    const sentB = await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: { to: 'partial@example.com', subject: 'B', templateUuid: templateB, variables: { username: 'X' } },
    });

    expect(sentA.body.results[0].status).toBe('skipped');
    expect(sentB.body.results[0].status).toBe('queued');
  });

  test('the unsubscribe link injected into rendered content is scoped to the sending template', async () => {
    const app = buildTestApp();
    const { plaintext: adminKey } = seedApiKey({ scope: 'admin' });
    const templateId = await createTemplate(app, adminKey, '<a href="{{{unsubscribe_link}}}">bye</a>');

    await jsonRequest(app, 'POST', '/api/send', {
      headers: authHeaders(adminKey),
      body: { to: 'link@example.com', subject: 'Hi', templateUuid: templateId },
    });

    const row = db.select().from(deliveryQueue).where(eq(deliveryQueue.recipient, 'link@example.com')).get();
    expect(row?.htmlContent).toContain('/api/unsubscribe?token=');
  });
});
