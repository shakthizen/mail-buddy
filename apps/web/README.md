# mail-buddy-web

The Mail Buddy admin dashboard - React + Vite + Tailwind. Built to static assets and embedded directly into the compiled `apps/api` binary at build time (see `apps/api/scripts/generate-web-assets.ts`); it's not deployed as a separate service.

See the root [`README.md`](../../README.md) for the full project overview, and [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for dev setup.

## Commands (run from the repo root)

```bash
bun run web:dev    # dev server with hot reload, proxies /api and /uploads to http://localhost:3000
bun run web:build  # production build -> dist/
```
