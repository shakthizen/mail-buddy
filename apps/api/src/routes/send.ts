import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { templates, deliveryQueue } from '../db/schema';
import { authPlugin, requireSend } from '../auth/middleware';
import { prepareTemplate } from '../lib/handlebars';
import { isSuppressed } from '../lib/suppression';
import { createUnsubscribeToken } from '../lib/unsubscribeToken';
import { env } from '../env';

const variablesSchema = t.Optional(t.Record(t.String(), t.Unknown()));

const singleSendBody = t.Object({
  to: t.Union([t.String(), t.Array(t.String())]),
  subject: t.String(),
  templateUuid: t.String(),
  variables: variablesSchema,
});

const batchSendBody = t.Object({
  subject: t.String(),
  templateUuid: t.String(),
  recipients: t.Array(
    t.Object({
      to: t.String(),
      variables: variablesSchema,
    }),
  ),
});

interface RecipientEntry {
  to: string;
  variables: Record<string, unknown>;
}

interface SendResultEntry {
  to: string;
  status: 'queued' | 'skipped' | 'rejected';
  reason?: string;
}

interface SingleSendBody {
  to: string | string[];
  subject: string;
  templateUuid: string;
  variables?: Record<string, unknown>;
}

interface BatchSendBody {
  subject: string;
  templateUuid: string;
  recipients: { to: string; variables?: Record<string, unknown> }[];
}

function normalizeRecipients(body: SingleSendBody | BatchSendBody): RecipientEntry[] {
  if ('recipients' in body) {
    return body.recipients.map((r) => ({ to: r.to, variables: r.variables ?? {} }));
  }
  const addresses = Array.isArray(body.to) ? body.to : [body.to];
  return addresses.map((to) => ({ to, variables: body.variables ?? {} }));
}

function resolveBaseUrl(request: Request): string {
  if (env.PUBLIC_URL) return env.PUBLIC_URL.replace(/\/$/, '');
  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const host = request.headers.get('host') ?? 'localhost';
  return `${proto}://${host}`;
}

export const sendRoutes = new Elysia({ prefix: '/api/send' })
  .use(authPlugin)
  .guard({ beforeHandle: requireSend })
  .post(
    '/',
    async ({ body, set, request }) => {
      const template = db.select().from(templates).where(eq(templates.id, body.templateUuid)).get();
      if (!template) {
        set.status = 404;
        return { error: 'not_found', message: `Template ${body.templateUuid} not found` };
      }

      const recipients = normalizeRecipients(body);
      const { placeholders, render } = await prepareTemplate(template.htmlContent);
      const baseUrl = resolveBaseUrl(request);
      const results: SendResultEntry[] = [];

      for (const recipient of recipients) {
        const missing = placeholders.filter(
          (name) => name !== 'unsubscribe_link' && !(name in recipient.variables),
        );
        if (missing.length > 0) {
          results.push({
            to: recipient.to,
            status: 'rejected',
            reason: `Missing required variables: ${missing.join(', ')}`,
          });
          continue;
        }

        if (isSuppressed(recipient.to, body.templateUuid)) {
          results.push({ to: recipient.to, status: 'skipped', reason: 'suppressed' });
          continue;
        }

        const token = createUnsubscribeToken({ email: recipient.to, templateId: body.templateUuid });
        const unsubscribeLink = `${baseUrl}/api/unsubscribe?token=${token}`;
        const html = render({ ...recipient.variables, unsubscribe_link: unsubscribeLink });

        db.insert(deliveryQueue)
          .values({
            id: crypto.randomUUID(),
            recipient: recipient.to,
            subject: body.subject,
            htmlContent: html,
          })
          .run();

        results.push({ to: recipient.to, status: 'queued' });
      }

      set.status = 202;
      return { results };
    },
    {
      body: t.Union([singleSendBody, batchSendBody]),
    },
  );
