import type { HttpClient } from '../http';
import type { AddSuppressionInput, CheckSuppressionResult, PageParams, Suppression } from '../types';

export function createSuppressionsResource(request: HttpClient) {
  return {
    list: (params: PageParams & { templateId?: string } = {}) =>
      request<{ suppressions: Suppression[]; limit: number; offset: number }>({
        path: '/api/suppressions',
        query: params,
      }),
    check: (email: string, params: { templateId?: string; [key: string]: string | undefined } = {}) =>
      request<CheckSuppressionResult>({ path: `/api/suppressions/${encodeURIComponent(email)}`, query: params }),
    add: (data: AddSuppressionInput) =>
      request<Suppression>({ method: 'POST', path: '/api/suppressions', body: data }),
    remove: (email: string, params: { templateId?: string; [key: string]: string | undefined } = {}) =>
      request<void>({
        method: 'DELETE',
        path: `/api/suppressions/${encodeURIComponent(email)}`,
        query: params,
      }),
  };
}
