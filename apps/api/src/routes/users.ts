import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users, sessions } from '../db/schema';
import { hashPassword, sanitizeUser } from '../auth/userAuth';
import { authPlugin, requireAdmin } from '../auth/middleware';

export const usersRoutes = new Elysia({ prefix: '/api/users' })
  .use(authPlugin)
  .guard({ beforeHandle: requireAdmin })
  .get('/', () => {
    const list = db.select().from(users).all();
    return {
      users: list.map(sanitizeUser),
    };
  })
  .post(
    '/',
    async ({ body, set }) => {
      const email = body.email.toLowerCase().trim();
      const existing = db.select().from(users).where(eq(users.email, email)).get();
      if (existing) {
        set.status = 400;
        return { error: 'email_exists', message: 'A user with this email address already exists' };
      }

      const id = crypto.randomUUID();
      const passwordHash = await hashPassword(body.password);

      db.insert(users)
        .values({
          id,
          name: body.name.trim(),
          email,
          passwordHash,
          role: body.role ?? 'member',
        })
        .run();

      const created = db.select().from(users).where(eq(users.id, id)).get()!;
      return { user: sanitizeUser(created) };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
        role: t.Optional(t.Union([t.Literal('admin'), t.Literal('member')])),
      }),
    },
  )
  .delete('/:id', ({ params, currentUser, set }) => {
    if (currentUser && currentUser.id === params.id) {
      set.status = 400;
      return { error: 'cannot_delete_self', message: 'You cannot delete your own user account' };
    }

    const existing = db.select().from(users).where(eq(users.id, params.id)).get();
    if (!existing) {
      set.status = 404;
      return { error: 'not_found', message: `User ${params.id} not found` };
    }

    db.delete(sessions).where(eq(sessions.userId, params.id)).run();
    db.delete(users).where(eq(users.id, params.id)).run();

    set.status = 204;
  });
