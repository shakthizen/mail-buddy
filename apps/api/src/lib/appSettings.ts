import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { settings } from '../db/schema';

const MASK = '••••••••';

function get(key: string): string | null {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}

function set(key: string, value: string) {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function getSettingsPayload(maskSecrets = true) {
  const smtpPassword = get('smtp_password') ?? process.env.SMTP_PASSWORD ?? null;
  const s3SecretKey = get('s3_secret_access_key') ?? process.env.S3_SECRET_ACCESS_KEY ?? null;

  return {
    smtp: {
      host: get('smtp_host') ?? process.env.SMTP_HOST ?? '',
      port: Number(get('smtp_port') ?? process.env.SMTP_PORT ?? 587),
      user: get('smtp_user') ?? process.env.SMTP_USER ?? '',
      password: smtpPassword ? (maskSecrets ? MASK : smtpPassword) : '',
      secure: (get('smtp_secure') ?? process.env.SMTP_SECURE) === 'true',
      fromAddress: get('smtp_from_address') ?? process.env.SMTP_FROM ?? '',
      fromName: get('smtp_from_name') ?? process.env.SMTP_FROM_NAME ?? '',
    },
    storage: {
      provider: (get('storage_provider') ?? process.env.STORAGE_PROVIDER ?? 'local') as 'local' | 's3',
      s3BucketName: get('s3_bucket_name') ?? process.env.S3_BUCKET_NAME ?? '',
      s3Region: get('s3_region') ?? process.env.S3_REGION ?? 'us-east-1',
      s3Endpoint: get('s3_endpoint') ?? process.env.S3_ENDPOINT ?? '',
      s3AccessKeyId: get('s3_access_key_id') ?? process.env.S3_ACCESS_KEY_ID ?? '',
      s3SecretAccessKey: s3SecretKey ? (maskSecrets ? MASK : s3SecretKey) : '',
      s3ForcePathStyle:
        (get('s3_force_path_style') ?? process.env.S3_FORCE_PATH_STYLE) === 'true' ||
        Boolean(get('s3_endpoint') ?? process.env.S3_ENDPOINT),
      s3PublicUrl: get('s3_public_url') ?? process.env.S3_PUBLIC_URL ?? '',
    },
    general: {
      publicUrl: get('public_url') ?? process.env.PUBLIC_URL ?? '',
    },
  };
}

export interface UpdateSettingsInput {
  smtp?: Partial<{
    host: string;
    port: number;
    user: string;
    password: string;
    secure: boolean;
    fromAddress: string;
    fromName: string;
  }>;
  storage?: Partial<{
    provider: 'local' | 's3';
    s3BucketName: string;
    s3Region: string;
    s3Endpoint: string;
    s3AccessKeyId: string;
    s3SecretAccessKey: string;
    s3ForcePathStyle: boolean;
    s3PublicUrl: string;
  }>;
  general?: Partial<{
    publicUrl: string;
  }>;
}

export function updateSettingsPayload(input: UpdateSettingsInput) {
  if (input.smtp) {
    if (input.smtp.host !== undefined) set('smtp_host', input.smtp.host);
    if (input.smtp.port !== undefined) set('smtp_port', String(input.smtp.port));
    if (input.smtp.user !== undefined) set('smtp_user', input.smtp.user);
    if (input.smtp.password !== undefined && input.smtp.password !== MASK) {
      set('smtp_password', input.smtp.password);
    }
    if (input.smtp.secure !== undefined) set('smtp_secure', String(input.smtp.secure));
    if (input.smtp.fromAddress !== undefined) set('smtp_from_address', input.smtp.fromAddress);
    if (input.smtp.fromName !== undefined) set('smtp_from_name', input.smtp.fromName);
  }
  if (input.storage) {
    if (input.storage.provider !== undefined) set('storage_provider', input.storage.provider);
    if (input.storage.s3BucketName !== undefined) set('s3_bucket_name', input.storage.s3BucketName);
    if (input.storage.s3Region !== undefined) set('s3_region', input.storage.s3Region);
    if (input.storage.s3Endpoint !== undefined) set('s3_endpoint', input.storage.s3Endpoint);
    if (input.storage.s3AccessKeyId !== undefined) set('s3_access_key_id', input.storage.s3AccessKeyId);
    if (input.storage.s3SecretAccessKey !== undefined && input.storage.s3SecretAccessKey !== MASK) {
      set('s3_secret_access_key', input.storage.s3SecretAccessKey);
    }
    if (input.storage.s3ForcePathStyle !== undefined) {
      set('s3_force_path_style', String(input.storage.s3ForcePathStyle));
    }
    if (input.storage.s3PublicUrl !== undefined) set('s3_public_url', input.storage.s3PublicUrl);
  }
  if (input.general) {
    if (input.general.publicUrl !== undefined) set('public_url', input.general.publicUrl);
  }
  return getSettingsPayload();
}

/** Internal accessor for the mailer - never masked. */
export function getSmtpConfig() {
  return getSettingsPayload(false).smtp;
}

/** Internal accessor for storage - never masked. */
export function getStorageConfig() {
  return getSettingsPayload(false).storage;
}

/** Internal accessor for general config. */
export function getGeneralConfig() {
  return getSettingsPayload(false).general;
}

