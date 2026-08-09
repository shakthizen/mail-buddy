import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { suppressions } from '../db/schema';
import { authPlugin, requireAdmin } from '../auth/middleware';
import { parsePagination } from '../lib/pagination';
import { addSuppression, isSuppressed, removeSuppression } from '../lib/suppression';
import { verifyUnsubscribeToken } from '../lib/unsubscribeToken';

const paginationQuery = {
  limit: t.Optional(t.String()),
  offset: t.Optional(t.String()),
};

export const suppressionRoutes = new Elysia({ prefix: '/api/suppressions' })
  .use(authPlugin)
  .guard({ beforeHandle: requireAdmin })
  .get(
    '/',
    ({ query }) => {
      const { limit, offset } = parsePagination(query);
      const rows = query.templateId
        ? db.select().from(suppressions).where(eq(suppressions.templateId, query.templateId)).limit(limit).offset(offset).all()
        : db.select().from(suppressions).limit(limit).offset(offset).all();
      return { suppressions: rows, limit, offset };
    },
    { query: t.Object({ ...paginationQuery, templateId: t.Optional(t.String()) }) },
  )
  .get(
    '/:email',
    ({ params, query }) => ({
      suppressed: isSuppressed(params.email, query.templateId ?? null),
      templateId: query.templateId ?? null,
    }),
    {
      params: t.Object({ email: t.String() }),
      query: t.Object({ templateId: t.Optional(t.String()) }),
    },
  )
  .post(
    '/',
    ({ body }) => addSuppression(body),
    {
      body: t.Object({
        email: t.String(),
        templateId: t.Optional(t.String()),
        reason: t.Optional(t.String()),
      }),
    },
  )
  .delete(
    '/:email',
    ({ params, query, set }) => {
      removeSuppression(params.email, query.templateId ?? null);
      set.status = 204;
    },
    {
      params: t.Object({ email: t.String() }),
      query: t.Object({ templateId: t.Optional(t.String()) }),
    },
  );

/** Public, unauthenticated - reached from the one-click unsubscribe link in email footers. */
export const publicUnsubscribeRoutes = new Elysia().get(
  '/api/unsubscribe',
  ({ query, set }) => {
    const payload = verifyUnsubscribeToken(query.token);
    if (!payload) {
      set.status = 400;
      return { error: 'invalid_token', message: 'Invalid or tampered unsubscribe token' };
    }

    addSuppression({ email: payload.email, templateId: payload.templateId ?? undefined, reason: 'unsubscribed' });
    return { unsubscribed: true, email: payload.email, templateId: payload.templateId };
  },
  { query: t.Object({ token: t.String() }) },
);
