# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The app binary (`v*.*.*` tags) and the SDK (`sdk-v*.*.*` tags) are versioned and released independently - see "Releases" in `README.md`.

## [Unreleased]

Nothing yet.

## [0.1.0] - 2026-08-09

### Added

- **API server** (`apps/api`): Elysia + Drizzle + `bun:sqlite`, compiling to a single executable with the dashboard embedded. Template CRUD with Handlebars placeholder auto-extraction, recursive `{{embed "uuid"}}` resolution with cycle detection, local asset uploads (S3 driver stubbed, not implemented), database-backed API keys with `admin`/`send_only` scopes and optional origin/IP restriction, settings management, per-template/global suppression list with signed one-click unsubscribe links, single + batch/personalized `/api/send` with a SQLite-backed delivery queue and exponential-backoff retry worker.
- **Dashboard** (`apps/web`): React + Tailwind admin UI - first-run key login, template editor (raw HTML/Handlebars, no visual builder yet), asset manager, Settings (API Keys, SMTP & Storage), Suppression List.
- **Node SDK** (`packages/sdk`, `mail-buddy-sdk`): typed client covering every API endpoint, zero runtime dependencies, dual ESM/CJS build.
- **Test suite**: 94 tests in `apps/api` (unit + integration against an in-memory DB) and 10 in `packages/sdk`.
- **Claude Code skill** (`.claude/skills/mail-buddy`) documenting integration for AI-assisted development.
- Project documentation: `project-plan.md` (architecture/schema/API spec), `README.md` (with an auto-refreshing contributors badge via contrib.rocks), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, GitHub issue/PR templates, this `CHANGELOG.md`, and MIT `LICENSE` (root and `packages/sdk`).
- CI: `.github/workflows/ci.yml` runs typechecks, tests, and a dashboard build on every PR and branch push. `.github/workflows/build-and-release.yml` re-runs that gate on every push to `main` (publishing a rolling `latest` pre-release) and on `v*.*.*` tags (publishing a permanent, versioned release marked "Latest release", with cross-platform binaries for Linux x64/arm64, macOS x64/arm64, and Windows x64). `.github/workflows/sdk-publish.yml` publishes `mail-buddy-sdk` to npm on `sdk-v*.*.*` tags, setting the package version from the tag. All three have status badges in `README.md`.
- `apps/api/.env.example` documenting every configurable environment variable, and confirmation (verified end-to-end) that Bun's compiled binary auto-loads `.env` from its working directory with no extra setup.

### Known gaps

- S3 storage driver not implemented (`local` only).
- No visual drag-and-drop template builder yet (raw HTML/Handlebars editor only).

[Unreleased]: https://github.com/shakthizen/mail-buddy/compare/v0.1.0...main
[0.1.0]: https://github.com/shakthizen/mail-buddy/releases/tag/v0.1.0
