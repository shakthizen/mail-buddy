import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { users, sessions } from '../db/schema';

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: 'bcrypt',
    cost: 10,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export function sanitizeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function isInitialized(): boolean {
  const result = db.select({ count: sql<number>`count(*)` }).from(users).get();
  return (result?.count ?? 0) > 0;
}

export function createSession(userId: string): string {
  const rawBytes = crypto.getRandomValues(new Uint8Array(24));
  const token = 'mbs_' + Buffer.from(rawBytes).toString('base64url');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.insert(sessions)
    .values({
      id: token,
      userId,
      expiresAt,
    })
    .run();

  return token;
}

export function validateSession(token: string) {
  const session = db.select().from(sessions).where(eq(sessions.id, token)).get();
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.delete(sessions).where(eq(sessions.id, token)).run();
    return null;
  }

  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!user) {
    db.delete(sessions).where(eq(sessions.id, token)).run();
    return null;
  }

  return { user: sanitizeUser(user) };
}

export function deleteSession(token: string): void {
  db.delete(sessions).where(eq(sessions.id, token)).run();
}
