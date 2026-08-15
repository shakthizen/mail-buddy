import { cleanEnv, str, num, port, bool } from 'envalid';

/** Validated at startup - the process exits immediately with a clear message
 * if required variables are missing or malformed, instead of failing later
 * with a confusing runtime error. */
export const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  DATABASE_PATH: str({ default: './mail-buddy.sqlite' }),
  UPLOADS_DIR: str({ default: './uploads' }),
  PUBLIC_URL: str({ default: '' }),
  STORAGE_PROVIDER: str({ choices: ['local', 's3'], default: 'local' }),
  // S3 settings (used when STORAGE_PROVIDER is 's3')
  S3_BUCKET_NAME: str({ default: '' }),
  S3_REGION: str({ default: 'us-east-1' }),
  S3_ENDPOINT: str({ default: '' }),
  S3_ACCESS_KEY_ID: str({ default: '' }),
  S3_SECRET_ACCESS_KEY: str({ default: '' }),
  S3_FORCE_PATH_STYLE: bool({ default: false }),
  S3_PUBLIC_URL: str({ default: '' }),

  MAX_UPLOAD_SIZE_BYTES: num({ default: 5 * 1024 * 1024 }),
  SMTP_FROM: str({ default: '' }),
  DELIVERY_WORKER_INTERVAL_MS: num({ default: 5000 }),
  DELIVERY_WORKER_BATCH_SIZE: num({ default: 10 }),
  DELIVERY_WORKER_BASE_DELAY_MS: num({ default: 30_000 }),
  DELIVERY_WORKER_MAX_DELAY_MS: num({ default: 30 * 60_000 }),
  LOG_LEVEL: str({
    choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: 'info',
  }),
});

