import { describe, expect, test, mock } from 'bun:test';
import { createHttpClient, MailBuddyApiError } from '../http';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createHttpClient', () => {
  test('sends Authorization header and JSON body', async () => {
    const fetchMock = mock(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://example.com/api/templates');
      expect(init?.method).toBe('POST');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
      expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect(init?.body).toBe(JSON.stringify({ name: 'x' }));
      return jsonResponse(200, { id: '1' });
    });

    const request = createHttpClient('https://example.com', 'test-key', fetchMock as unknown as typeof fetch);
    const result = await request({ method: 'POST', path: '/api/templates', body: { name: 'x' } });

    expect(result).toEqual({ id: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('serializes query params and skips undefined values', async () => {
    const fetchMock = mock(async (url: string | URL) => {
      const parsed = new URL(String(url));
      expect(parsed.searchParams.get('limit')).toBe('10');
      expect(parsed.searchParams.has('offset')).toBe(false);
      return jsonResponse(200, { ok: true });
    });

    const request = createHttpClient('https://example.com', 'test-key', fetchMock as unknown as typeof fetch);
    await request({ path: '/api/templates', query: { limit: 10, offset: undefined } });
  });

  test('throws MailBuddyApiError with status and code on non-ok response', async () => {
    const fetchMock = mock(async () => jsonResponse(404, { error: 'not_found', message: 'Template not found' }));
    const request = createHttpClient('https://example.com', 'test-key', fetchMock as unknown as typeof fetch);

    await expect(request({ path: '/api/templates/missing' })).rejects.toThrow(MailBuddyApiError);

    try {
      await request({ path: '/api/templates/missing' });
      throw new Error('expected request to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MailBuddyApiError);
      const apiError = error as MailBuddyApiError;
      expect(apiError.status).toBe(404);
      expect(apiError.code).toBe('not_found');
      expect(apiError.message).toBe('Template not found');
    }
  });

  test('returns undefined for 204 No Content responses', async () => {
    const fetchMock = mock(async () => new Response(null, { status: 204 }));
    const request = createHttpClient('https://example.com', 'test-key', fetchMock as unknown as typeof fetch);
    const result = await request({ method: 'DELETE', path: '/api/templates/1' });
    expect(result).toBeUndefined();
  });

  test('sends FormData without a Content-Type override', async () => {
    const fetchMock = mock(async (_url: string | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined();
      expect(init?.body).toBeInstanceOf(FormData);
      return jsonResponse(200, { id: 'asset-1' });
    });

    const request = createHttpClient('https://example.com', 'test-key', fetchMock as unknown as typeof fetch);
    const formData = new FormData();
    formData.set('file', new Blob(['hi']));
    await request({ method: 'POST', path: '/api/assets/upload', formData });
  });
});
