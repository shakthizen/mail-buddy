import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { apiKeys } from '../db/schema';
import { authPlugin, requireAdmin } from '../auth/middleware';
import { getSettingsPayload, updateSettingsPayload } from '../lib/appSettings';
import { generateApiKey } from '../auth/apiKeyCrypto';
import { sendTestEmail, verifySmtpConnection } from '../smtp/mailer';
import { verifyS3Connection } from '../storage/s3';

function serializeKey(row: typeof apiKeys.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scope: row.scope,
    allowedOrigins: row.allowedOrigins ? JSON.parse(row.allowedOrigins) : [],
    allowedIps: row.allowedIps ? JSON.parse(row.allowedIps) : [],
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    revoked: row.revoked,
  };
}

export const settingsRoutes = new Elysia({ prefix: '/api/settings' })
  .use(authPlugin)
  .guard({ beforeHandle: requireAdmin })
  .get('/', () => getSettingsPayload())
  .put(
    '/',
    ({ body }) => updateSettingsPayload(body),
    {
      body: t.Object({
        smtp: t.Optional(
          t.Object({
            host: t.Optional(t.String()),
            port: t.Optional(t.Number()),
            user: t.Optional(t.String()),
            password: t.Optional(t.String()),
            secure: t.Optional(t.Boolean()),
            fromAddress: t.Optional(t.String()),
            fromName: t.Optional(t.String()),
          }),
        ),
        storage: t.Optional(
          t.Object({
            provider: t.Optional(t.Union([t.Literal('local'), t.Literal('s3')])),
            s3BucketName: t.Optional(t.String()),
            s3Region: t.Optional(t.String()),
            s3Endpoint: t.Optional(t.String()),
            s3AccessKeyId: t.Optional(t.String()),
            s3SecretAccessKey: t.Optional(t.String()),
            s3ForcePathStyle: t.Optional(t.Boolean()),
            s3PublicUrl: t.Optional(t.String()),
          }),
        ),
        general: t.Optional(
          t.Object({
            publicUrl: t.Optional(t.String()),
          }),
        ),
      }),
    },
  )
  .post(
    '/test-email',
    async ({ body, set }) => {
      try {
        const result = await sendTestEmail(body.to);
        return {
          success: true,
          message: `Test email sent successfully to ${body.to}`,
          messageId: result.messageId,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          error: 'smtp_error',
          message: err instanceof Error ? err.message : String(err),
        };
      }
    },
    {
      body: t.Object({
        to: t.String(),
      }),
    },
  )
  .post('/test-storage', async ({ set }) => {
    const settings = getSettingsPayload(false);
    if (settings.storage.provider === 'local') {
      return { ok: true, provider: 'local', message: 'Local storage is active and ready' };
    }
    const result = await verifyS3Connection();
    if (!result.ok) {
      set.status = 400;
      return { ok: false, provider: 's3', error: 's3_connection_failed', message: result.message };
    }
    return { ok: true, provider: 's3', message: 'Successfully connected to S3 bucket' };
  })
  .get('/api-keys', () => ({ apiKeys: db.select().from(apiKeys).all().map(serializeKey) }))
  .post(
    '/api-keys',
    ({ body }) => {
      const { plaintext, hashedKey, keyPrefix } = generateApiKey();
      const id = crypto.randomUUID();
      db.insert(apiKeys)
        .values({
          id,
          name: body.name,
          hashedKey,
          keyPrefix,
          scope: body.scope,
          allowedOrigins: body.allowedOrigins?.length ? JSON.stringify(body.allowedOrigins) : null,
          allowedIps: body.allowedIps?.length ? JSON.stringify(body.allowedIps) : null,
        })
        .run();
      const row = db.select().from(apiKeys).where(eq(apiKeys.id, id)).get()!;
      return { ...serializeKey(row), key: plaintext };
    },
    {
      body: t.Object({
        name: t.String(),
        scope: t.Union([t.Literal('admin'), t.Literal('send_only')]),
        allowedOrigins: t.Optional(t.Array(t.String())),
        allowedIps: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .put(
    '/api-keys/:id',
    ({ params, body, set }) => {
      const existing = db.select().from(apiKeys).where(eq(apiKeys.id, params.id)).get();
      if (!existing) {
        set.status = 404;
        return { error: 'not_found', message: `API key ${params.id} not found` };
      }
      db.update(apiKeys)
        .set({
          name: body.name ?? existing.name,
          allowedOrigins:
            body.allowedOrigins !== undefined
              ? body.allowedOrigins.length
                ? JSON.stringify(body.allowedOrigins)
                : null
              : existing.allowedOrigins,
          allowedIps:
            body.allowedIps !== undefined
              ? body.allowedIps.length
                ? JSON.stringify(body.allowedIps)
                : null
              : existing.allowedIps,
        })
        .where(eq(apiKeys.id, params.id))
        .run();
      return serializeKey(db.select().from(apiKeys).where(eq(apiKeys.id, params.id)).get()!);
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        allowedOrigins: t.Optional(t.Array(t.String())),
        allowedIps: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .delete('/api-keys/:id', ({ params, set }) => {
    const existing = db.select().from(apiKeys).where(eq(apiKeys.id, params.id)).get();
    if (!existing) {
      set.status = 404;
      return { error: 'not_found', message: `API key ${params.id} not found` };
    }
    db.update(apiKeys).set({ revoked: true }).where(eq(apiKeys.id, params.id)).run();
    set.status = 204;
  });
