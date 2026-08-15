import { Elysia } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { apiKeys, users } from '../db/schema';
import { hashApiKey } from './apiKeyCrypto';
import { validateSession, sanitizeUser } from './userAuth';
import { ipMatchesAllowlist } from '../lib/ipMatch';

export type ApiKeyRecord = typeof apiKeys.$inferSelect;
export type UserRecord = ReturnType<typeof sanitizeUser>;

function extractToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  const xApiKey = request.headers.get('x-api-key');
  if (xApiKey) return xApiKey.trim();

  // Also check cookie if present
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/mb_session=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

/** Derives `apiKey` and `currentUser` on every request:
 * supports both API Keys (`mb_...`) and User Session Tokens (`mbs_...`). */
export const authPlugin = new Elysia({ name: 'auth' }).derive(
  { as: 'global' },
  async ({ request, server }): Promise<{ apiKey: ApiKeyRecord | null; currentUser: UserRecord | null }> => {
    const token = extractToken(request);
    if (!token) return { apiKey: null, currentUser: null };

    // 1. Check if token is a user session
    if (token.startsWith('mbs_')) {
      const sessionResult = validateSession(token);
      if (sessionResult) {
        const syntheticApiKey: ApiKeyRecord = {
          id: `session-${sessionResult.user.id}`,
          name: `User Session (${sessionResult.user.name})`,
          hashedKey: '',
          keyPrefix: 'session',
          scope: sessionResult.user.role === 'admin' ? 'admin' : 'send_only',
          allowedOrigins: null,
          allowedIps: null,
          lastUsedAt: new Date().toISOString(),
          revoked: false,
          createdAt: sessionResult.user.createdAt,
        };
        return { apiKey: syntheticApiKey, currentUser: sessionResult.user };
      }
    }

    // 2. Check if token is an API key
    const hashedKey = hashApiKey(token);
    const record = db.select().from(apiKeys).where(eq(apiKeys.hashedKey, hashedKey)).get();
    if (!record || record.revoked) return { apiKey: null, currentUser: null };

    if (record.allowedOrigins) {
      const allowed: string[] = JSON.parse(record.allowedOrigins);
      if (allowed.length > 0) {
        const origin = request.headers.get('origin');
        if (!origin || !allowed.includes(origin)) return { apiKey: null, currentUser: null };
      }
    }

    if (record.allowedIps) {
      const allowed: string[] = JSON.parse(record.allowedIps);
      if (allowed.length > 0) {
        const ip = server?.requestIP(request)?.address;
        if (!ip || !ipMatchesAllowlist(ip, allowed)) return { apiKey: null, currentUser: null };
      }
    }

    db.update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, record.id))
      .run();

    return { apiKey: record, currentUser: null };
  },
);

type ResponseSet = { status?: number | string };

function unauthorized(set: ResponseSet) {
  set.status = 401;
  return { error: 'unauthorized', message: 'Authentication required: missing or invalid credentials' };
}

function forbidden(set: ResponseSet) {
  set.status = 403;
  return { error: 'forbidden', message: 'Insufficient permissions for this action' };
}

/** Route guard: requires a valid key or user session with admin scope. */
export function requireAdmin({ apiKey, set }: { apiKey: ApiKeyRecord | null; set: ResponseSet }) {
  if (!apiKey) return unauthorized(set);
  if (apiKey.scope !== 'admin') return forbidden(set);
}

/** Route guard: requires any valid, non-revoked credentials (admin or send_only). */
export function requireSend({ apiKey, set }: { apiKey: ApiKeyRecord | null; set: ResponseSet }) {
  if (!apiKey) return unauthorized(set);
}
