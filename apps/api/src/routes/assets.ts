import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { extname } from 'node:path';
import { db } from '../db/client';
import { assets } from '../db/schema';
import { authPlugin, requireAdmin } from '../auth/middleware';
import { parsePagination } from '../lib/pagination';
import { saveFile, deleteFile } from '../storage';
import { env } from '../env';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MAX_UPLOAD_SIZE_BYTES = env.MAX_UPLOAD_SIZE_BYTES;

export const assetRoutes = new Elysia({ prefix: '/api/assets' })
  .use(authPlugin)
  .guard({ beforeHandle: requireAdmin })
  .get(
    '/',
    ({ query }) => {
      const { limit, offset } = parsePagination(query);
      const rows = db.select().from(assets).limit(limit).offset(offset).all();
      return { assets: rows, limit, offset };
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/upload',
    async ({ body, set }) => {
      const file = body.file;

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        set.status = 400;
        return {
          error: 'invalid_file_type',
          message: `Unsupported file type "${file.type}". Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
        };
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        set.status = 400;
        return {
          error: 'file_too_large',
          message: `File exceeds the maximum upload size of ${MAX_UPLOAD_SIZE_BYTES} bytes`,
        };
      }

      const id = crypto.randomUUID();
      const filename = `${id}${extname(file.name)}`;
      const urlPath = await saveFile(filename, new Uint8Array(await file.arrayBuffer()), file.type);

      db.insert(assets)
        .values({
          id,
          filename,
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          urlPath,
        })
        .run();

      return db.select().from(assets).where(eq(assets.id, id)).get();
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    },
  )
  .delete('/:id', async ({ params, set }) => {
    const existing = db.select().from(assets).where(eq(assets.id, params.id)).get();
    if (!existing) {
      set.status = 404;
      return { error: 'not_found', message: `Asset ${params.id} not found` };
    }
    await deleteFile(existing.filename);
    db.delete(assets).where(eq(assets.id, params.id)).run();
    set.status = 204;
  });

/** Public, unauthenticated route - uploaded images must be viewable by any mail client. */
export const publicUploadRoutes = new Elysia().get('/uploads/:filename', async ({ params, set }) => {
  const { readFile } = await import('../storage');
  const file = await readFile(params.filename);
  if (!file) {
    set.status = 404;
    return { error: 'not_found', message: 'File not found' };
  }
  if ('data' in file && 'contentType' in file) {
    set.headers['content-type'] = file.contentType;
    return new Response(file.data, {
      headers: {
        'content-type': file.contentType,
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  }
  return file;
});
