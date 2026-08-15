import { Elysia } from 'elysia';
import { env } from './env';
import { logger } from './lib/logger';
import './db/client';
import { ensureBootstrapApiKey } from './auth/bootstrap';
import { healthRoutes } from './routes/health';
import { templateRoutes } from './routes/templates';
import { assetRoutes, publicUploadRoutes } from './routes/assets';
import { settingsRoutes } from './routes/settings';
import { suppressionRoutes, publicUnsubscribeRoutes } from './routes/suppressions';
import { sendRoutes } from './routes/send';
import { authRoutes } from './routes/auth';
import { usersRoutes } from './routes/users';
import { startDeliveryWorker } from './worker/deliveryWorker';
import { webAssets } from './webAssets.generated';

ensureBootstrapApiKey();
startDeliveryWorker();

const hasWebBuild = Object.keys(webAssets).length > 0;

const app = new Elysia()
  .use(healthRoutes)
  .use(authRoutes)
  .use(usersRoutes)
  .use(publicUploadRoutes)
  .use(publicUnsubscribeRoutes)
  .use(templateRoutes)
  .use(assetRoutes)
  .use(settingsRoutes)
  .use(suppressionRoutes)
  .use(sendRoutes)
  .get('*', ({ request, set }) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      set.status = 404;
      return { error: 'not_found', message: 'Unknown route' };
    }

    if (!hasWebBuild) {
      set.headers['content-type'] = 'text/plain';
      return 'Mail Buddy API is running. Dashboard build not found - run `bun run web:build` first.';
    }

    // Embedded in the compiled binary - no filesystem access needed. Unknown paths
    // fall back to index.html so client-side routing (React Router) works on refresh.
    const asset = webAssets[url.pathname] ?? webAssets['/index.html'];
    set.headers['content-type'] = asset.contentType;
    return new Response(asset.content);
  })
  .listen(env.PORT);

logger.success(`Mail Buddy listening on http://localhost:${app.server?.port}`);
