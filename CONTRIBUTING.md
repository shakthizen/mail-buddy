# Contributing to Mail Buddy

Thanks for considering a contribution. This is a young project, so expect some rough edges - see the "Known gaps" section in [`README.md`](./README.md) for where help is most useful.

## Prerequisites

- [Bun](https://bun.sh/) 1.x (this project doesn't use Node/npm/yarn directly - everything runs through Bun)
- Git

## Getting set up

```bash
git clone https://github.com/shakthizen/mail-buddy.git
cd mail-buddy
bun install
```

The repo is a Bun workspace monorepo:

```
apps/api        Elysia server - REST API, delivery worker, embeds apps/web/dist at compile time
apps/web        React (Vite + Tailwind) admin dashboard
packages/sdk    mail-buddy-sdk - the published Node.js client
```

Run things during development:

```bash
bun run web:build   # build the dashboard once (needed before the API can serve it)
bun run api:dev     # API server with hot reload, http://localhost:3000
bun run web:dev     # dashboard dev server with API proxying, http://localhost:5173
```

`project-plan.md` at the repo root is the architecture and REST API specification this implementation follows - if you're not sure how something is supposed to behave, check there first.

## Making changes

- **Keep everything typed and validated.** API routes use Elysia's TypeBox schemas (`t.Object(...)`) for request validation - new routes/fields should follow that pattern, not loosely-typed `any`. The SDK and dashboard should stay fully typed too (`bunx tsc --noEmit` in `apps/api` and `packages/sdk`, `bun run build` in `apps/web`, should all pass with zero errors).
- **Write tests for new behavior**, not just happy-path smoke checks. `apps/api/tests` has unit tests for pure logic (`tests/unit`) and integration tests that exercise real routes against an in-memory SQLite DB (`tests/integration`) - see `tests/helpers.ts` for the test-app builder and `resetDb()` isolation helper. `packages/sdk/src/__tests__` covers the client with a mocked `fetch`.
- **Keep `project-plan.md` and `README.md` in sync with what you actually build.** If you add or change an API endpoint, schema field, or environment variable, update the corresponding section of `project-plan.md` in the same PR - don't leave the spec describing something that no longer matches the code (or vice versa).
- **Don't overclaim.** If something is partially implemented or has a known limitation, say so explicitly (see the "Known gaps" section in `README.md` for the existing pattern) rather than describing it as done.

## Running tests

```bash
bun run api:test   # apps/api - unit + integration tests
bun run sdk:test   # packages/sdk - unit tests
```

Both should pass with zero failures before opening a PR - the `Tests` workflow (`.github/workflows/ci.yml`) runs the same checks automatically on every PR and will block merge otherwise. If you touch `apps/api/src/db/schema.ts`, regenerate migrations with `cd apps/api && bun run db:generate` and update `apps/api/src/db/migrations.ts` to import the new migration file (see the comment there for why - migrations are embedded as text imports so they end up inside the compiled single binary).

Note that `apps/api/src/webAssets.generated.ts` is gitignored (it's a build artifact depending on `apps/web/dist`, also gitignored) - `bunx tsc --noEmit` in `apps/api` will fail on a fresh checkout until you run `bun run web:build && bun --filter mail-buddy-api generate:web-assets` at least once. `bun run api:dev`/`start`/`compile` all do this automatically; a bare typecheck does not.

## Commit messages and PRs

- Keep commits focused - one logical change per commit where reasonable.
- Describe *why* a change is needed, not just what changed, in the PR description.
- Link any related issue.
- A PR that changes API behavior should include or update tests covering that behavior.

## Questions

Open a [discussion or issue](https://github.com/shakthizen/mail-buddy/issues) if anything here is unclear or you want to sanity-check an approach before investing time in it.
