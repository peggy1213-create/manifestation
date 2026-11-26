# Clear Path (顯化)

A science-based manifestation (顯化) web app for Taiwan, zh-TW first. See [`CLAUDE.md`](./CLAUDE.md)
for the product rules, stack and conventions every change follows.

## Stack

pnpm + Turborepo monorepo, deployed to Cloudflare Workers:

- `apps/web` — Next.js (App Router), TypeScript strict, Tailwind, deployed via
  [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
- `packages/core` — pure TS domain logic (WOOP model, 66-day cycle, streaks), no React
- `packages/auth` — hand-rolled OAuth 2.0 + PKCE (Web Crypto only, no auth libraries)
- `packages/tokens` — design tokens shared by web and the future Expo app

Data lives in Cloudflare D1 (SQLite via Drizzle ORM) and Cloudflare R2 (private file storage).
There is no third-party analytics, auth SDK, or hosting provider in this stack — Cloudflare only.

## Requirements

- Node 20+ (see `.nvmrc`)
- pnpm (`corepack enable && corepack prepare pnpm@10.28.0 --activate`)
- A Cloudflare account with Wrangler, for `pnpm preview` / `pnpm deploy`
- A Google Cloud OAuth client (web), for login (added in P04)

## Setup

```bash
pnpm install
```

Copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars`. The Google values can stay empty
until the sign-in flow exists (P04), but set `DEV_SEED_TOKEN` to any string: it opens the
development-only route described under [Signing in before P04](#signing-in-before-p04).

Then create the local D1 and apply the migrations:

```bash
cd apps/web && wrangler d1 migrations apply clearpath --local
```

## Commands

Run from the repo root:

```bash
pnpm dev        # Next.js dev server (apps/web), Node runtime, fast iteration
pnpm build      # next build, every workspace package
pnpm lint       # eslint, every workspace package
pnpm typecheck  # tsc --noEmit, every workspace package
pnpm test       # vitest, every workspace package
pnpm e2e        # Playwright, against the Worker bundle (builds and starts it)
pnpm preview    # builds the Cloudflare Worker bundle and runs it locally with wrangler
pnpm deploy     # builds and deploys apps/web to Cloudflare Workers
```

`pnpm preview` and `pnpm deploy` run in `apps/web` and require Wrangler to be authenticated
against a real Cloudflare account. Local D1/R2 bindings are simulated automatically; no
Cloudflare account is needed just to run `pnpm preview`.

### Database bindings

`apps/web/wrangler.jsonc` declares the `DB` (D1) and `BOARD` (R2) bindings with placeholder
resource IDs. These become real once `wrangler d1 create clearpath` and
`wrangler r2 bucket create clearpath-board` have run and the IDs are filled in. Local
`pnpm dev`, `pnpm preview` and `pnpm e2e` work against simulated bindings without them.

Schema changes are hand-written SQL in `migrations/`, applied with:

```bash
cd apps/web && wrangler d1 migrations apply clearpath --local
```

```bash
cd apps/web && wrangler d1 migrations apply clearpath --remote
```

`packages/core/src/db/schema.ts` mirrors that SQL for Drizzle; the SQL file stays the source
of truth. The bindings are typed in `apps/web/env.d.ts`, which is committed;
`pnpm --filter web cf-typegen` writes a generated `cloudflare-env.d.ts` beside it that merges
into the same interface and is gitignored.

### Signing in before P04

Google sign-in does not exist yet, so `/app/[id]` has a development-only way in. With
`DEV_SEED_TOKEN` set in `apps/web/.dev.vars`, open:

```
http://localhost:8787/api/dev/seed?token=<DEV_SEED_TOKEN>
```

It creates a user and one seeded 顯化, signs in with a session cookie, and redirects to that
顯化's path. In production the variable is absent — it is never a Wrangler secret — and the
route answers 404 like any path that does not exist.

## CI/CD

`.github/workflows/ci.yml` installs, lints, typechecks, tests and builds every pull request.
Pushes to `main` additionally deploy `apps/web` to Cloudflare Workers, using a scoped
Cloudflare API token stored as the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets — not configured yet, so the deploy job will fail until those secrets and a real D1
database ID are in place.
