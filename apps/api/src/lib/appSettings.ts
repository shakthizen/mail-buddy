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
  const smtpPassword = get('smtp_password');
  return {
    smtp: {
      host: get('smtp_host') ?? '',
      port: Number(get('smtp_port') ?? 587),
      user: get('smtp_user') ?? '',
      password: smtpPassword ? (maskSecrets ? MASK : smtpPassword) : '',
      secure: get('smtp_secure') === 'true',
    },
    storage: {
      provider: (get('storage_provider') ?? process.env.STORAGE_PROVIDER ?? 'local') as 'local' | 's3',
      s3BucketName: get('s3_bucket_name') ?? undefined,
      s3Region: get('s3_region') ?? undefined,
      s3Endpoint: get('s3_endpoint') ?? undefined,
    },
  };
}

export interface UpdateSettingsInput {
  smtp?: Partial<{ host: string; port: number; user: string; password: string; secure: boolean }>;
  storage?: Partial<{ provider: 'local' | 's3'; s3BucketName: string; s3Region: string; s3Endpoint: string }>;
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
  }
  if (input.storage) {
    if (input.storage.provider !== undefined) set('storage_provider', input.storage.provider);
    if (input.storage.s3BucketName !== undefined) set('s3_bucket_name', input.storage.s3BucketName);
    if (input.storage.s3Region !== undefined) set('s3_region', input.storage.s3Region);
    if (input.storage.s3Endpoint !== undefined) set('s3_endpoint', input.storage.s3Endpoint);
  }
  return getSettingsPayload();
}

/** Internal accessor for the mailer - never masked. */
export function getSmtpConfig() {
  return getSettingsPayload(false).smtp;
}
