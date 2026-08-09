import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '../db/client';
import { suppressions } from '../db/schema';

/** Checks both the template-specific row and the global (templateId = null) row. */
export function isSuppressed(email: string, templateId: string | null): boolean {
  const row = db
    .select()
    .from(suppressions)
    .where(
      and(
        eq(suppressions.email, email),
        templateId
          ? or(eq(suppressions.templateId, templateId), isNull(suppressions.templateId))
          : isNull(suppressions.templateId),
      ),
    )
    .get();
  return !!row;
}

export function addSuppression(input: { email: string; templateId?: string | null; reason?: string }) {
  const templateId = input.templateId ?? null;
  const existing = db
    .select()
    .from(suppressions)
    .where(
      and(
        eq(suppressions.email, input.email),
        templateId ? eq(suppressions.templateId, templateId) : isNull(suppressions.templateId),
      ),
    )
    .get();
  if (existing) return existing;

  const id = crypto.randomUUID();
  db.insert(suppressions)
    .values({ id, email: input.email, templateId, reason: input.reason ?? null })
    .run();
  return db.select().from(suppressions).where(eq(suppressions.id, id)).get()!;
}

export function removeSuppression(email: string, templateId: string | null) {
  db.delete(suppressions)
    .where(
      and(
        eq(suppressions.email, email),
        templateId ? eq(suppressions.templateId, templateId) : isNull(suppressions.templateId),
      ),
    )
    .run();
}
