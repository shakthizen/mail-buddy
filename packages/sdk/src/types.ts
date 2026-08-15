export type ApiKeyScope = 'admin' | 'send_only';

export interface MailBuddyClientOptions {
  /** Base URL of the self-hosted Mail Buddy server, e.g. "https://mail.example.com" */
  baseUrl: string;
  /** API key created via the Settings > API Keys page (or session token / bootstrap key). */
  apiKey?: string;
  /** Override the default fetch implementation (useful for testing). */
  fetch?: typeof fetch;
}

export interface PageParams {
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  htmlContent: string;
  designJson: string | null;
  placeholders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  htmlContent: string;
  designJson?: string;
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>;

export interface PreviewTemplateInput {
  htmlContent: string;
  variables?: Record<string, any>;
}

export interface PreviewTemplateResponse {
  renderedHtml: string;
  resolvedTemplate: string;
  placeholders: string[];
  embeds: Array<{ id: string; name: string }>;
  variablesUsed: Record<string, any>;
}

export interface Asset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  urlPath: string;
  createdAt: string;
}

export interface SendSingleInput {
  to: string | string[];
  subject: string;
  templateUuid: string;
  variables?: Record<string, unknown>;
}

export interface SendRecipient {
  to: string;
  variables?: Record<string, unknown>;
}

export interface SendBatchInput {
  subject: string;
  templateUuid: string;
  recipients: SendRecipient[];
}

export type SendInput = SendSingleInput | SendBatchInput;

export interface SendResultEntry {
  to: string;
  status: 'queued' | 'skipped' | 'rejected';
  reason?: string;
}

export interface SendResponse {
  results: SendResultEntry[];
}

export interface SettingsPayload {
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
    secure: boolean;
    fromAddress?: string;
    fromName?: string;
  };
  storage: {
    provider: 'local' | 's3';
    s3BucketName?: string;
    s3Region?: string;
    s3Endpoint?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3ForcePathStyle?: boolean;
    s3PublicUrl?: string;
  };
  general?: {
    publicUrl?: string;
  };
}

export type UpdateSettingsInput = Partial<{
  smtp: Partial<SettingsPayload['smtp']>;
  storage: Partial<SettingsPayload['storage']>;
  general: Partial<{ publicUrl: string }>;
}>;

export interface TestEmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

export interface TestStorageResponse {
  ok: boolean;
  provider: 'local' | 's3';
  message?: string;
  error?: string;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  scope: ApiKeyScope;
  /** Allowed Origin header values. Empty/undefined = open (any origin). */
  allowedOrigins: string[];
  /** Allowed source IPs/CIDR ranges. Empty/undefined = open (any IP). */
  allowedIps: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revoked: boolean;
}

export interface CreateApiKeyInput {
  name: string;
  scope: ApiKeyScope;
  /** Restrict this key to specific origins/domains. Omit or leave empty for an open key. */
  allowedOrigins?: string[];
  /** Restrict this key to specific IPs/CIDR ranges. Omit or leave empty for an open key. */
  allowedIps?: string[];
}

export type UpdateApiKeyInput = Partial<Pick<CreateApiKeyInput, 'name' | 'allowedOrigins' | 'allowedIps'>>;

export interface CreateApiKeyResponse extends ApiKeySummary {
  /** Plaintext key value. Shown only once, at creation time. */
  key: string;
}

export interface Suppression {
  email: string;
  templateId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface AddSuppressionInput {
  email: string;
  templateId?: string;
  reason?: string;
}

export interface CheckSuppressionResult {
  suppressed: boolean;
  templateId: string | null;
}

export interface HealthResponse {
  status: 'ok';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  createdAt: string;
  updatedAt: string;
}

export interface AuthStatusResponse {
  initialized: boolean;
  user: User | null;
}

export interface AuthLoginResponse {
  user: User;
  token: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
}

export interface MailBuddyApiErrorBody {
  error: string;
  message: string;
}
