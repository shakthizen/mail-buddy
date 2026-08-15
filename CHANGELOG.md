# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The app binary (`v*.*.*` tags) and the SDK (`sdk-v*.*.*` tags) are versioned and released independently - see "Releases" in `README.md`.

## [Unreleased]

### Added

- **User Authentication & Initial Admin Setup**:
  - First-run onboarding wizard creating the primary administrative account (`name`, `email`, `passwordHash`).
  - Public registration disabled by default for maximum self-hosted security.
  - Session tokens with 30-day expiration (`mbs_...`) and dual auth middleware supporting both API keys and user sessions.
  - Team User Management (`/settings/users`) allowing administrators to create team accounts with an integrated secure random password generator and clipboard copy tool.
- **Full Amazon S3 & S3-Compatible Storage Engine**:
  - Implemented `@aws-sdk/client-s3` storage driver supporting AWS S3, LocalStack, MinIO, Cloudflare R2, and DigitalOcean Spaces.
  - Configurable custom endpoints, path-style addressing, and public asset base URL.
  - Tested against live LocalStack integration tests (`storageS3.test.ts`).
- **Zero-Env Architecture & Dynamic SQLite Settings**:
  - Application boots out-of-the-box with zero required environment variables.
  - All operational settings (SMTP, Storage, General) are persisted directly in SQLite with encrypted/masked secret handling.
- **Dedicated Settings Pages & Live Verification Tools**:
  - Separated SMTP (`/settings/smtp`) and Storage (`/settings/storage`) into dedicated pages.
  - Added **"Send Real-Time Test Email"** tool to verify SMTP connectivity with instant diagnostics feedback.
  - Added **"Test S3 Bucket Access"** tool to verify bucket credentials and permissions.
- **Breadcrumbs Navigation**:
  - Automatic breadcrumbs bar across all dashboard views.
- **Recursive Template Compilation & Live Preview Engine**:
  - `POST /api/templates/preview` endpoint with recursive embed resolution (`{{embed "uuid"}}`) and cycle detection.
  - Cross-embed placeholder aggregation: template variables list automatically discovers placeholders from all embedded partial templates.
  - Three preview modes in the Template Editor: **Visual Preview** (with Desktop and Mobile 375px viewport toggles), **Compiled HTML Output Inspector** (with 1-click copy), and **Interactive Test Variables Drawer** (with sample data).
  - Clear distinction between **Inbuilt System Variables** (clickable 1-click insert tags) and **Discovered Custom Variables** (non-clickable informative badges).
- **Template Integration Code Snippets Modal**:
  - Pre-filled code examples in **Client SDK (Node/TS)**, **Fetch (JavaScript)**, and **cURL** for each template with 1-click copy.
- **UI Revamp & HeroUI Styling**:
  - Toned-down slate/zinc dark surfaces (`#0b0f19`, `#111827`, `#1e293b`) with ambient mesh background gradients and glassmorphism.
  - Redesigned sidebar with grouped sections, separators, active glow indicators, and bottom user profile/logout dock.
- **Comprehensive Test Suite**:
  - Expanded test coverage to 116 passing tests across 15 test files in `apps/api` and `packages/sdk`.

### Changed

- Enhanced `packages/sdk` (`mail-buddy-sdk`) with `client.auth`, `client.users`, and `client.templates.preview` resources.
- Modernized all dashboard views and components.

---

## [0.1.0] - 2026-08-09

### Added

- **API server** (`apps/api`): Elysia + Drizzle + `bun:sqlite`, compiling to a single executable with the dashboard embedded.
- **Dashboard** (`apps/web`): React + Tailwind admin UI.
- **Node SDK** (`packages/sdk`, `mail-buddy-sdk`): Typed client covering initial API endpoints.
- **Test suite**: 94 tests in `apps/api` and 10 in `packages/sdk`.

[Unreleased]: https://github.com/shakthizen/mail-buddy/compare/v0.1.0...main
[0.1.0]: https://github.com/shakthizen/mail-buddy/releases/tag/v0.1.0
