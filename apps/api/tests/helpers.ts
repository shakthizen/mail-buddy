import { Elysia } from 'elysia';
import { db } from '../src/db/client';
import { apiKeys, assets, deliveryLogs, deliveryQueue, settings, suppressions, templates } from '../src/db/schema';
import { generateApiKey } from '../src/auth/apiKeyCrypto';

/** The test DB is one shared in-memory instance for the whole `bun test` run
 * (db/client.ts is a module-level singleton) - call this in `beforeEach` in
 * every integration test file so rows from one test don't leak into the next.
 * Clearing `setting` (which holds the unsubscribe-token HMAC secret) is safe:
 * each test that needs it signs and verifies within itself, so it just gets
 * regenerated lazily on first access. */
export function resetDb() {
  db.delete(deliveryLogs).run();
  db.delete(deliveryQueue).run();
  db.delete(suppressions).run();
  db.delete(assets).run();
  db.delete(templates).run();
  db.delete(apiKeys).run();
  db.delete(settings).run();
}
import { healthRoutes } from '../src/routes/health';
import { templateRoutes } from '../src/routes/templates';
import { assetRoutes, publicUploadRoutes } from '../src/routes/assets';
import { settingsRoutes } from '../src/routes/settings';
import { suppressionRoutes, publicUnsubscribeRoutes } from '../src/routes/suppressions';
import { sendRoutes } from '../src/routes/send';

/** Same route composition as src/index.ts, minus the static-SPA catch-all and the
 * worker/bootstrap side effects - those don't belong in a route-level test app. */
export function buildTestApp() {
  return new Elysia()
    .use(healthRoutes)
    .use(publicUploadRoutes)
    .use(publicUnsubscribeRoutes)
    .use(templateRoutes)
    .use(assetRoutes)
    .use(settingsRoutes)
    .use(suppressionRoutes)
    .use(sendRoutes);
}

export type TestApp = ReturnType<typeof buildTestApp>;

interface SeedKeyOptions {
  name?: string;
  scope?: 'admin' | 'send_only';
  allowedOrigins?: string[];
  allowedIps?: string[];
  revoked?: boolean;
}

/** Inserts an API key directly into the DB (bypassing HTTP) and returns its plaintext value. */
export function seedApiKey(options: SeedKeyOptions = {}): { id: string; plaintext: string } {
  const { plaintext, hashedKey, keyPrefix } = generateApiKey();
  const id = crypto.randomUUID();
  db.insert(apiKeys)
    .values({
      id,
      name: options.name ?? 'test key',
      hashedKey,
      keyPrefix,
      scope: options.scope ?? 'admin',
      allowedOrigins: options.allowedOrigins?.length ? JSON.stringify(options.allowedOrigins) : null,
      allowedIps: options.allowedIps?.length ? JSON.stringify(options.allowedIps) : null,
      revoked: options.revoked ?? false,
    })
    .run();
  return { id, plaintext };
}

export function authHeaders(plaintext: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${plaintext}`, ...extra };
}

export async function jsonRequest(
  app: TestApp,
  method: string,
  path: string,
  options: { headers?: Record<string, string>; body?: unknown } = {},
) {
  const headers: Record<string, string> = { ...options.headers };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  const response = await app.handle(new Request(`http://localhost${path}`, { method, headers, body }));
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  return { status: response.status, body: payload, response };
}
