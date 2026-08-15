import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  isInitialized,
  sanitizeUser,
} from '../auth/userAuth';
import { authPlugin } from '../auth/middleware';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(authPlugin)
  .get('/status', ({ currentUser }) => {
    return {
      initialized: isInitialized(),
      user: currentUser,
    };
  })
  .post(
    '/setup',
    async ({ body, set }) => {
      if (isInitialized()) {
        set.status = 400;
        return { error: 'already_initialized', message: 'Mail Buddy has already been initialized with an admin user' };
      }

      const email = body.email.toLowerCase().trim();
      const passwordHash = await hashPassword(body.password);
      const id = crypto.randomUUID();

      db.insert(users)
        .values({
          id,
          name: body.name.trim(),
          email,
          passwordHash,
          role: 'admin',
        })
        .run();

      const userRow = db.select().from(users).where(eq(users.id, id)).get()!;
      const token = createSession(id);

      return {
        user: sanitizeUser(userRow),
        token,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
      }),
    },
  )
  .post(
    '/login',
    async ({ body, set }) => {
      const email = body.email.toLowerCase().trim();
      const user = db.select().from(users).where(eq(users.email, email)).get();

      if (!user) {
        set.status = 401;
        return { error: 'invalid_credentials', message: 'Invalid email or password' };
      }

      const valid = await verifyPassword(body.password, user.passwordHash);
      if (!valid) {
        set.status = 401;
        return { error: 'invalid_credentials', message: 'Invalid email or password' };
      }

      const token = createSession(user.id);
      return {
        user: sanitizeUser(user),
        token,
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    },
  )
  .post('/logout', ({ request }) => {
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7).trim();
      if (token.startsWith('mbs_')) {
        deleteSession(token);
      }
    }
    return { success: true };
  })
  .get('/me', ({ currentUser, set }) => {
    if (!currentUser) {
      set.status = 401;
      return { error: 'unauthorized', message: 'Not logged in' };
    }
    return { user: currentUser };
  });
