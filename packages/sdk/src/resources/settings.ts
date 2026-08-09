import type { HttpClient } from '../http';
import type {
  ApiKeySummary,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  SettingsPayload,
  UpdateApiKeyInput,
  UpdateSettingsInput,
} from '../types';

export function createSettingsResource(request: HttpClient) {
  return {
    get: () => request<SettingsPayload>({ path: '/api/settings' }),
    update: (data: UpdateSettingsInput) =>
      request<SettingsPayload>({ method: 'PUT', path: '/api/settings', body: data }),
  };
}

export function createApiKeysResource(request: HttpClient) {
  return {
    list: () => request<{ apiKeys: ApiKeySummary[] }>({ path: '/api/settings/api-keys' }),
    create: (data: CreateApiKeyInput) =>
      request<CreateApiKeyResponse>({ method: 'POST', path: '/api/settings/api-keys', body: data }),
    update: (id: string, data: UpdateApiKeyInput) =>
      request<ApiKeySummary>({ method: 'PUT', path: `/api/settings/api-keys/${id}`, body: data }),
    revoke: (id: string) => request<void>({ method: 'DELETE', path: `/api/settings/api-keys/${id}` }),
  };
}
