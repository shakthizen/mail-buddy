---
name: sync-docs
description: Guide and checklist to keep README.md, CHANGELOG.md, SDK documentation, and docs-site synchronized whenever features, endpoints, configuration, or UI changes are made in Mail Buddy.
---

# Mail Buddy Documentation Sync Skill

Use this skill whenever completing a task, implementing new features, modifying API endpoints, adjusting configuration/settings, or preparing a commit.

---

## 📋 Documentation Sync Checklist

Whenever functionality is added, updated, or refactored, verify and update the following 4 documentation hubs:

### 1. Root `README.md`
- **Feature Highlights**: Keep feature list current (Authentication, Zero-Env, S3 Storage, Template Engine, SDK).
- **Quickstart & Commands**: Ensure boot, build, and test commands match repository scripts.
- **Environment & Configuration**: Document any new settings or environment variables.

### 2. `CHANGELOG.md`
- Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format under `## [Unreleased]`.
- Categorize updates under `### Added`, `### Changed`, `### Fixed`, or `### Removed`.
- Include user-facing UI changes, backend API additions, SDK capabilities, and test coverage milestones.

### 3. SDK Documentation (`packages/sdk/README.md`)
- **Exported Resources**: Document any new client methods (e.g. `client.auth`, `client.users`, `client.templates.preview`, `client.settings`).
- **Code Snippets**: Keep single send, batch send, and preview examples accurate and type-safe.

### 4. Static Docs Site (`docs-site/`)
- **`docs-site/index.html`**:
  - Update hero tagline and feature grid cards.
  - Keep footprint diagram and quickstart snippet current.
- **`docs-site/docs.html`**:
  - Update quickstart, onboarding, and zero-env configuration guides.
  - Keep API endpoint tables, storage provider descriptions, and SDK code blocks synchronized with `apps/api`.
  - Remove completed items from "Known gaps".

---

## ⚡ Verification Workflow

1. Run `bun test` to ensure all unit and integration tests pass.
2. Build the web dashboard: `bun run --filter mail-buddy-web build`.
3. Compile the single binary: `bun run --filter mail-buddy-api compile`.
4. Inspect `git status` to verify documentation files are staged and committed alongside code changes.
