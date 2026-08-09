import { describe, expect, test, mock } from 'bun:test';
import { MailBuddyClient } from '../index';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeClient(fetchMock: typeof fetch) {
  return new MailBuddyClient({ baseUrl: 'https://mail.example.com', apiKey: 'k', fetch: fetchMock });
}

describe('MailBuddyClient resource routing', () => {
  test('templates.get hits GET /api/templates/:id', async () => {
    const fetchMock = mock(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://mail.example.com/api/templates/abc');
      expect(init?.method ?? 'GET').toBe('GET');
      return jsonResponse(200, { id: 'abc' });
    });
    const client = makeClient(fetchMock as unknown as typeof fetch);
    await client.templates.get('abc');
  });

  test('send hits POST /api/send with the given payload', async () => {
    const fetchMock = mock(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://mail.example.com/api/send');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        to: 'a@example.com',
        subject: 'Hi',
        templateUuid: 't1',
      });
      return jsonResponse(202, { results: [{ to: 'a@example.com', status: 'queued' }] });
    });
    const client = makeClient(fetchMock as unknown as typeof fetch);
    const result = await client.send({ to: 'a@example.com', subject: 'Hi', templateUuid: 't1' });
    expect(result.results[0]?.status).toBe('queued');
  });

  test('suppressions.check hits GET with templateId query param', async () => {
    const fetchMock = mock(async (url: string | URL) => {
      const parsed = new URL(String(url));
      expect(parsed.pathname).toBe('/api/suppressions/a%40example.com');
      expect(parsed.searchParams.get('templateId')).toBe('t1');
      return jsonResponse(200, { suppressed: false, templateId: 't1' });
    });
    const client = makeClient(fetchMock as unknown as typeof fetch);
    await client.suppressions.check('a@example.com', { templateId: 't1' });
  });

  test('apiKeys.revoke hits DELETE /api/settings/api-keys/:id', async () => {
    const fetchMock = mock(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://mail.example.com/api/settings/api-keys/key-1');
      expect(init?.method).toBe('DELETE');
      return new Response(null, { status: 204 });
    });
    const client = makeClient(fetchMock as unknown as typeof fetch);
    await client.apiKeys.revoke('key-1');
  });

  test('health hits GET /health', async () => {
    const fetchMock = mock(async (url: string | URL) => {
      expect(String(url)).toBe('https://mail.example.com/health');
      return jsonResponse(200, { status: 'ok' });
    });
    const client = makeClient(fetchMock as unknown as typeof fetch);
    const result = await client.health();
    expect(result.status).toBe('ok');
  });
});
