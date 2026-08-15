import { Elysia, t } from 'elysia';
import Handlebars from 'handlebars';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { templates } from '../db/schema';
import { authPlugin, requireAdmin } from '../auth/middleware';
import {
  extractPlaceholders,
  extractResolvedPlaceholders,
  resolveEmbedsWithMetadata,
  generateDefaultSampleVariables,
} from '../lib/handlebars';
import { parsePagination } from '../lib/pagination';

function serialize(row: typeof templates.$inferSelect) {
  return { ...row, placeholders: JSON.parse(row.placeholders) as string[] };
}

export const templateRoutes = new Elysia({ prefix: '/api/templates' })
  .use(authPlugin)
  .guard({ beforeHandle: requireAdmin })
  .get(
    '/',
    ({ query }) => {
      const { limit, offset } = parsePagination(query);
      const rows = db.select().from(templates).limit(limit).offset(offset).all();
      return { templates: rows.map(serialize), limit, offset };
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/preview',
    async ({ body, set }) => {
      try {
        const { resolvedHtml, embeds } = await resolveEmbedsWithMetadata(body.htmlContent);
        const placeholders = extractPlaceholders(resolvedHtml);

        // Generate realistic defaults for any placeholders not explicitly provided
        const defaultVars = generateDefaultSampleVariables(placeholders);
        const mergedVariables = {
          ...defaultVars,
          ...(body.variables ?? {}),
        };

        const compiled = Handlebars.compile(resolvedHtml, { noEscape: false });
        const renderedHtml = compiled(mergedVariables);

        return {
          renderedHtml,
          resolvedTemplate: resolvedHtml,
          placeholders,
          embeds,
          variablesUsed: mergedVariables,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          error: 'compilation_error',
          message: err instanceof Error ? err.message : String(err),
        };
      }
    },
    {
      body: t.Object({
        htmlContent: t.String(),
        variables: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .get('/:id', ({ params, set }) => {
    const row = db.select().from(templates).where(eq(templates.id, params.id)).get();
    if (!row) {
      set.status = 404;
      return { error: 'not_found', message: `Template ${params.id} not found` };
    }
    return serialize(row);
  })
  .post(
    '/',
    async ({ body }) => {
      const id = crypto.randomUUID();
      const placeholders = await extractResolvedPlaceholders(body.htmlContent);
      const now = new Date().toISOString();
      db.insert(templates)
        .values({
          id,
          name: body.name,
          description: body.description ?? null,
          htmlContent: body.htmlContent,
          designJson: body.designJson ?? null,
          placeholders: JSON.stringify(placeholders),
          createdAt: now,
          updatedAt: now,
        })
        .run();
      const row = db.select().from(templates).where(eq(templates.id, id)).get()!;
      return serialize(row);
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        htmlContent: t.String(),
        designJson: t.Optional(t.String()),
      }),
    },
  )
  .put(
    '/:id',
    async ({ params, body, set }) => {
      const existing = db.select().from(templates).where(eq(templates.id, params.id)).get();
      if (!existing) {
        set.status = 404;
        return { error: 'not_found', message: `Template ${params.id} not found` };
      }

      const htmlContent = body.htmlContent ?? existing.htmlContent;
      const placeholders = await extractResolvedPlaceholders(htmlContent);

      db.update(templates)
        .set({
          name: body.name ?? existing.name,
          description: body.description ?? existing.description,
          htmlContent,
          designJson: body.designJson ?? existing.designJson,
          placeholders: JSON.stringify(placeholders),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(templates.id, params.id))
        .run();

      const row = db.select().from(templates).where(eq(templates.id, params.id)).get()!;
      return serialize(row);
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        htmlContent: t.Optional(t.String()),
        designJson: t.Optional(t.String()),
      }),
    },
  )
  .delete('/:id', ({ params, set }) => {
    const existing = db.select().from(templates).where(eq(templates.id, params.id)).get();
    if (!existing) {
      set.status = 404;
      return { error: 'not_found', message: `Template ${params.id} not found` };
    }
    db.delete(templates).where(eq(templates.id, params.id)).run();
    set.status = 204;
  });
