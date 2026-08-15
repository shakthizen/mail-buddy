import { createHttpClient } from './http';
import { createTemplatesResource } from './resources/templates';
import { createAssetsResource } from './resources/assets';
import { createApiKeysResource, createSettingsResource } from './resources/settings';
import { createSuppressionsResource } from './resources/suppressions';
import { createAuthResource } from './resources/auth';
import { createUsersResource } from './resources/users';
import type { HealthResponse, MailBuddyClientOptions, SendInput, SendResponse } from './types';

export class MailBuddyClient {
  readonly templates: ReturnType<typeof createTemplatesResource>;
  readonly assets: ReturnType<typeof createAssetsResource>;
  readonly settings: ReturnType<typeof createSettingsResource>;
  readonly apiKeys: ReturnType<typeof createApiKeysResource>;
  readonly suppressions: ReturnType<typeof createSuppressionsResource>;
  readonly auth: ReturnType<typeof createAuthResource>;
  readonly users: ReturnType<typeof createUsersResource>;

  private readonly request: ReturnType<typeof createHttpClient>;

  constructor(options: MailBuddyClientOptions) {
    const fetchImpl = options.fetch ?? fetch;
    if (!fetchImpl) {
      throw new Error(
        'No fetch implementation available - pass one explicitly via MailBuddyClientOptions.fetch on runtimes without a global fetch',
      );
    }

    this.request = createHttpClient(options.baseUrl, options.apiKey, fetchImpl);
    this.templates = createTemplatesResource(this.request);
    this.assets = createAssetsResource(this.request);
    this.settings = createSettingsResource(this.request);
    this.apiKeys = createApiKeysResource(this.request);
    this.suppressions = createSuppressionsResource(this.request);
    this.auth = createAuthResource(this.request);
    this.users = createUsersResource(this.request);
  }

  send(input: SendInput) {
    return this.request<SendResponse>({ method: 'POST', path: '/api/send', body: input });
  }

  health() {
    return this.request<HealthResponse>({ path: '/health' });
  }
}

export { MailBuddyApiError } from './http';
export * from './types';
