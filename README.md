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

Copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars` and fill in the values once the
Google OAuth client exists (added in P04 — not needed yet for `pnpm dev`).

## Commands

Run from the repo root:

```bash
pnpm dev        # Next.js dev server (apps/web), Node runtime, fast iteration
pnpm build      # next build, every workspace package
pnpm lint       # eslint, every workspace package
pnpm typecheck  # tsc --noEmit, every workspace package
pnpm test       # vitest, every workspace package (packages/core runs inside workerd)
pnpm preview    # builds the Cloudflare Worker bundle and runs it locally with wrangler
pnpm deploy     # builds and deploys apps/web to Cloudflare Workers
```

`pnpm preview` and `pnpm deploy` run in `apps/web` and require Wrangler to be authenticated
against a real Cloudflare account. Local D1/R2 bindings are simulated automatically; no
Cloudflare account is needed just to run `pnpm preview`.

### Database bindings

`apps/web/wrangler.jsonc` declares the `DB` (D1) and `BOARD` (R2) bindings. Create the resources
once per Cloudflare account and paste the printed database id over the placeholder:

```bash
wrangler d1 create clearpath
```

```bash
wrangler r2 bucket create clearpath-board
```

After changing `wrangler.jsonc`, regenerate typed env bindings:

```bash
pnpm --filter web cf-typegen
```

That writes `apps/web/cloudflare-env.d.ts` (gitignored, thousands of lines of workerd runtime
types). The small committed `apps/web/worker-env.d.ts` declares the same bindings, so a fresh
clone typechecks without running it.

## Data model

Tables live in [`migrations/`](./migrations) as plain SQL, applied by
`wrangler d1 migrations`; [`packages/core/src/db/schema.ts`](./packages/core/src/db/schema.ts) is
the Drizzle view of the same tables.

| table            | holds                                                              |
| ---------------- | ------------------------------------------------------------------ |
| `users`          | one row per account (Google, later Apple), reminder time           |
| `sessions`       | SHA-256 of each session token, 30-day rolling expiry               |
| `manifestations` | the WOOP 顯化: wish, outcome, obstacle, if-cue, then-action, steps |
| `checkins`       | 足跡 — one per 顯化 per day (`did` / `partly` / `not_today`)       |
| `rehearsals`     | each 3-minute guided rehearsal                                     |
| `reviews`        | one weekly review per 顯化                                         |
| `board_items`    | the 顯化板 cards, in the `why` and `process` zones                 |

Ids are uuid v4 strings, instants are unix epoch seconds, calendar days are `'YYYY-MM-DD'` in the
user's own local day, and JSON array columns (`steps`, `cues_done`) are never null. Everything that
belongs to a person carries `user_id` and cascades from `users` / `manifestations` on delete.

D1 has no row-level security, so **every** read and write goes through
[`packages/core/src/repo`](./packages/core/src/repo). Each function there takes a `userId` and
scopes every query by it; nothing else in the codebase touches D1 or Drizzle, and components never
query the database directly. `packages/core/src/repo/isolation.test.ts` is the safety net: it
proves user B cannot read, change, delete or fetch the media of user A.

```bash
pnpm db:migrate         # wrangler d1 migrations apply clearpath --local
```

```bash
pnpm db:migrate:remote  # the same, against the real D1 database
```

```bash
pnpm db:seed            # one sample 顯化 (the 10K run) into the local database
```

The sample 顯化 exists twice, kept in step by a test: as SQL in
[`seeds/sample-manifestation.sql`](./seeds/sample-manifestation.sql) for `pnpm db:seed`, and as
TypeScript in `packages/core/src/seed` for tests and for the app.

### Photos

Photos go to the private R2 bucket under `users/{userId}/{manifestationId}/{uuid}.jpg` and are
never public. `GET /media/[...key]` resolves the session cookie, checks the key sits under that
user's own prefix, then streams the object: 401 without a session, and 404 both for a key that is
not yours and for one that is not there, so a key can never reveal that someone else's photo
exists.

## CI/CD

`.github/workflows/ci.yml` installs, lints, typechecks, tests and builds every pull request.
Pushes to `main` additionally deploy `apps/web` to Cloudflare Workers, using a scoped
Cloudflare API token stored as the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets — not configured yet, so the deploy job will fail until those secrets and a real D1
database ID are in place.
