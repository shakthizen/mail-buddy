import type { MailBuddyApiErrorBody } from './types';

export class MailBuddyApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, body: MailBuddyApiErrorBody) {
    super(body.message);
    this.name = 'MailBuddyApiError';
    this.status = status;
    this.code = body.error;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  formData?: FormData;
}

export type HttpClient = <T>(options: RequestOptions) => Promise<T>;

export function createHttpClient(baseUrl: string, apiKey: string | undefined, fetchImpl: typeof fetch): HttpClient {
  return async function request<T>(options: RequestOptions): Promise<T> {
    const url = new URL(options.path, baseUrl);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    let body: FormData | string | undefined;
    if (options.formData) {
      body = options.formData;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const response = await fetchImpl(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body,
    });

    if (response.status === 204) return undefined as T;

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload: unknown = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorBody: MailBuddyApiErrorBody = isJson
        ? (payload as MailBuddyApiErrorBody)
        : { error: 'unknown_error', message: String(payload) };
      throw new MailBuddyApiError(response.status, errorBody);
    }

    return payload as T;
  };
}
