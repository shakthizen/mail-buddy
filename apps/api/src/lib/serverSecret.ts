import { db } from '../db/client';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

const SECRET_KEY = '_server_secret';

/**
 * A persistent random secret generated once on first boot and stored in the
 * `setting` table. Used to HMAC-sign unsubscribe tokens (see lib/unsubscribeToken.ts)
 * so links can't be forged or replayed against a different email/template.
 */
export function getServerSecret(): string {
  const existing = db.select().from(settings).where(eq(settings.key, SECRET_KEY)).get();
  if (existing) return existing.value;

  const secret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
  db.insert(settings).values({ key: SECRET_KEY, value: secret }).run();
  return secret;
}
