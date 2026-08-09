import { Elysia } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { apiKeys } from '../db/schema';
import { hashApiKey } from './apiKeyCrypto';
import { ipMatchesAllowlist } from '../lib/ipMatch';

export type ApiKeyRecord = typeof apiKeys.$inferSelect;

function extractKey(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  const xApiKey = request.headers.get('x-api-key');
  return xApiKey?.trim() ?? null;
}

/** Derives `apiKey` on every request: null if missing/unknown/revoked, or restricted
 * away by the key's allowedOrigins/allowedIps. Auth failures are enforced by the
 * requireAdmin/requireSend guards below, not here, so public routes stay unaffected. */
export const authPlugin = new Elysia({ name: 'auth' }).derive(
  { as: 'global' },
  async ({ request, server }): Promise<{ apiKey: ApiKeyRecord | null }> => {
    const plaintext = extractKey(request);
    if (!plaintext) return { apiKey: null };

    const hashedKey = hashApiKey(plaintext);
    const record = db.select().from(apiKeys).where(eq(apiKeys.hashedKey, hashedKey)).get();
    if (!record || record.revoked) return { apiKey: null };

    if (record.allowedOrigins) {
      const allowed: string[] = JSON.parse(record.allowedOrigins);
      if (allowed.length > 0) {
        const origin = request.headers.get('origin');
        if (!origin || !allowed.includes(origin)) return { apiKey: null };
      }
    }

    if (record.allowedIps) {
      const allowed: string[] = JSON.parse(record.allowedIps);
      if (allowed.length > 0) {
        const ip = server?.requestIP(request)?.address;
        if (!ip || !ipMatchesAllowlist(ip, allowed)) return { apiKey: null };
      }
    }

    db.update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, record.id))
      .run();

    return { apiKey: record };
  },
);

type ResponseSet = { status?: number | string };

function unauthorized(set: ResponseSet) {
  set.status = 401;
  return { error: 'unauthorized', message: 'Missing or invalid API key' };
}

function forbidden(set: ResponseSet) {
  set.status = 403;
  return { error: 'forbidden', message: 'This API key does not have permission for this route' };
}

/** Route guard: requires a valid key with admin scope. */
export function requireAdmin({ apiKey, set }: { apiKey: ApiKeyRecord | null; set: ResponseSet }) {
  if (!apiKey) return unauthorized(set);
  if (apiKey.scope !== 'admin') return forbidden(set);
}

/** Route guard: requires any valid, non-revoked key (admin or send_only). */
export function requireSend({ apiKey, set }: { apiKey: ApiKeyRecord | null; set: ResponseSet }) {
  if (!apiKey) return unauthorized(set);
}
