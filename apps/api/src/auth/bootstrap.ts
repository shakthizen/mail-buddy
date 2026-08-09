import { db } from '../db/client';
import { apiKeys } from '../db/schema';
import { generateApiKey } from './apiKeyCrypto';
import { logger } from '../lib/logger';

/**
 * On first boot, if no API keys exist yet, generate one admin-scoped key and
 * print it once. This is the only bootstrap path — there is no permanent
 * environment-variable override, so losing this key before saving it means
 * resetting via direct database access.
 */
export function ensureBootstrapApiKey() {
  const existing = db.select({ id: apiKeys.id }).from(apiKeys).limit(1).get();
  if (existing) return;

  const { plaintext, hashedKey, keyPrefix } = generateApiKey();

  db.insert(apiKeys)
    .values({
      id: crypto.randomUUID(),
      name: 'Bootstrap key',
      hashedKey,
      keyPrefix,
      scope: 'admin',
      allowedOrigins: null,
      allowedIps: null,
    })
    .run();

  logger.box({
    title: 'Mail Buddy — first boot',
    message:
      `No API keys found. Generated an admin key - save it now,\n` +
      `it will never be shown again:\n\n` +
      `  ${plaintext}\n\n` +
      `Paste this into the dashboard login screen to continue.`,
    style: { borderColor: 'yellow', borderStyle: 'round' },
  });
}
