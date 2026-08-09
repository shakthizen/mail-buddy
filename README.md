# Mail Buddy

[![Tests](https://github.com/shakthizen/mail-buddy/actions/workflows/ci.yml/badge.svg)](https://github.com/shakthizen/mail-buddy/actions/workflows/ci.yml)
[![Build and Release](https://github.com/shakthizen/mail-buddy/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/shakthizen/mail-buddy/actions/workflows/build-and-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Mail Buddy is an open-source, self-hostable email template manager and delivery API. It ships as **one compiled binary** - an Elysia (Bun) API server with the React admin dashboard embedded directly into the executable, no Docker, no separate frontend deployment, no external database process.

See [`project-plan.md`](./project-plan.md) for the full architecture, database schema, and REST API specification this implementation follows.

## What's implemented

- **API server** (`apps/api`): template CRUD with Handlebars placeholder auto-extraction, recursive `{{embed "uuid"}}` resolution with cycle detection, asset uploads (local storage), single + batch/personalized `/api/send` with a SQLite-backed delivery queue and exponential-backoff retry worker, database-backed scoped API keys (`admin` / `send_only`, optionally restricted to specific origins/IPs), settings management, and a per-template/global suppression list with signed one-click unsubscribe links.
- **Dashboard** (`apps/web`): first-run key login, template list + HTML/Handlebars editor (raw-HTML preview, no variable substitution yet), asset manager, Settings → API Keys and Settings → SMTP & Storage pages, and a Suppression List page.
- **Node SDK** (`packages/sdk`, published as `mail-buddy-sdk`): typed client covering every endpoint above. Built, typechecked, and unit tested - see [`packages/sdk/README.md`](./packages/sdk/README.md).
- **Claude Code skill** (`.claude/skills/mail-buddy`): integration guide for AI-assisted development against this API.
- **Test suite for the API server** (`apps/api/tests`): 94 tests (`bun run api:test`) - unit tests for the Handlebars placeholder parser, recursive embed resolution + cycle detection, IP/CIDR allowlist matching, API key hashing, HMAC unsubscribe tokens, and the delivery worker's backoff/retry logic (mocked mailer); integration tests exercising every route through the real Elysia app against an in-memory SQLite DB (auth scopes and origin/IP restrictions, template CRUD, asset upload validation, settings + API key management, per-template/global suppression logic, and single/batch send including the missing-placeholder and suppression-skip paths).

## Known gaps (not yet built)

- **S3 storage driver**: documented in the plan and stubbed in code (`STORAGE_PROVIDER=s3` throws a clear "not implemented" error), but only the `local` driver actually works right now.
- **Visual drag-and-drop template builder**: the editor is a raw HTML/Handlebars textarea with an unrendered live preview, not the block-based visual builder described in the plan's UI section. This is the single biggest remaining product gap.
- **The SDK has not been published to npm yet.** The publish workflow (`.github/workflows/sdk-publish.yml`) is scaffolded but intentionally disabled (`if: false`) until someone deliberately enables it with an `NPM_TOKEN` secret.

## Quickstart

Requires [Bun](https://bun.sh/) 1.x.

```bash
bun install                # installs all workspaces (apps/api, apps/web, packages/sdk)
bun run web:build          # builds the dashboard to apps/web/dist
bun run api:start          # generates the embedded-asset manifest, runs migrations, starts the server
```

On first boot with no API keys in the database, the server prints a one-time admin key to the console:

```
======================================================
 Mail Buddy - first boot: no API keys found.
 Generated an admin API key. Save it now - it will
 never be shown again:

   mb_...

 Paste this into the dashboard login screen to continue.
======================================================
```

Open `http://localhost:3000` and paste that key into the login screen.

### Compiling the single binary

```bash
cd apps/api
bun run compile   # -> ../../mail-buddy (regenerates the embedded dashboard manifest first)
```

The resulting binary is self-contained - it runs correctly from any working directory, with the dashboard and DB migrations both embedded. It lands around ~60-65MB: Bun always embeds its full runtime into `--compile` output, which is a fixed cost of the single-executable approach rather than something driven by this app's size (see `project-plan.md` section 8-A for detail).

Or grab a prebuilt binary for Linux (x64/arm64), macOS (x64/arm64), or Windows (x64) from the [`latest` release](https://github.com/shakthizen/mail-buddy/releases/tag/latest), rebuilt automatically from `main` on every push by `.github/workflows/build-and-release.yml`.

#### Deployment footprint

The API server and the dashboard are both **inside** the binary - only three things live outside it:

```
mail-buddy              # the binary itself (API + dashboard)
.env                    # optional - config; Bun loads this automatically from the cwd
mail-buddy.sqlite       # the database (path configurable via DATABASE_PATH)
uploads/                # locally-stored assets (path configurable via UPLOADS_DIR)
```

Copy `apps/api/.env.example` to `.env` next to the binary as a starting point - every value has a sane default, so an empty `.env` (or none at all) is a valid starting point too.

### Testing

```bash
bun run api:test   # unit + integration tests for apps/api, against an in-memory DB
bun run sdk:test   # unit tests for the SDK's HTTP client and resource routing
```

## Environment variables

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP port |
| `DATABASE_PATH` | `./mail-buddy.sqlite` | SQLite file location |
| `UPLOADS_DIR` | `./uploads` | Local asset storage directory (when `STORAGE_PROVIDER=local`) |
| `STORAGE_PROVIDER` | `local` | `local` or `s3` (`s3` is not yet implemented - see Known gaps) |
| `MAX_UPLOAD_SIZE_BYTES` | `5242880` (5MB) | Asset upload size limit |
| `PUBLIC_URL` | *(derived from request)* | Base URL used to build unsubscribe links; set explicitly behind a proxy |
| `SMTP_FROM` | *(SMTP user)* | Default "From" address for outgoing mail |
| `DELIVERY_WORKER_INTERVAL_MS` | `5000` | Delivery queue poll interval |
| `DELIVERY_WORKER_BATCH_SIZE` | `10` | Jobs processed per poll |
| `DELIVERY_WORKER_BASE_DELAY_MS` | `30000` | Retry backoff base (`base * attempts^2`, capped) |
| `DELIVERY_WORKER_MAX_DELAY_MS` | `1800000` (30min) | Retry backoff cap |
| `LOG_LEVEL` | `info` | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent` |

SMTP host/port/user/password and the active storage provider are configured at runtime via the dashboard's Settings → SMTP & Storage page (backed by `PUT /api/settings`), not environment variables - see `project-plan.md` section 4.

All environment variables are validated at startup with [envalid](https://github.com/af/envalid) (`apps/api/src/env.ts`) - the process exits with a clear message on a missing or malformed value instead of failing later.

## API

Full REST API specification (auth model, every endpoint, request/response shapes, delivery behavior) lives in [`project-plan.md`](./project-plan.md#4-rest-api-specification). Every endpoint documented there is implemented in `apps/api/src/routes/`.

Prefer using [`mail-buddy-sdk`](./packages/sdk) over calling the API directly where possible:

```ts
import { MailBuddyClient } from 'mail-buddy-sdk';

const client = new MailBuddyClient({ baseUrl: 'http://localhost:3000', apiKey: '...' });
await client.send({
  to: 'user@example.com',
  subject: 'Welcome',
  templateUuid: '...',
  variables: { username: 'Jane' },
});
```

## Monorepo layout

```
apps/api        Elysia server - REST API, delivery worker, embeds apps/web/dist at compile time
apps/web        React (Vite + Tailwind) admin dashboard
packages/sdk    mail-buddy-sdk - published Node.js client
```

## Contributing

Contributions are welcome - see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for dev setup, testing, and PR expectations, and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) for community standards. Found a security issue? Please follow [`SECURITY.md`](./SECURITY.md) instead of opening a public issue.

## Contributors

<a href="https://github.com/shakthizen/mail-buddy/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=shakthizen/mail-buddy" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

## License

MIT - see [`LICENSE`](./LICENSE).
