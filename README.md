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

## The 顯化 builder

- `/app/new` — a blank 顯化
- `/app/[id]/edit` — the same flow on an existing one
- `/app/[id]` — the finished 顯化, read-only
- `/app` — what this person has written

One question per screen: 願望 → 最好的結果（看到／聽到／感覺）→ 內在障礙 → 如果…就… →
過程步驟（一行一個，附什麼時候、在哪裡）→ 可能性 1–10. The 如果…就… sentence previews live as
it is typed, drafts autosave, and 放下 (release) keeps the 顯化 with its note.

The rules behind it are in `packages/core`, not in the screen:

- `manifestation.ts` — the model, the character limits, `ifThenParts` for the live preview
- `validation.ts` — `validateDraft` (never rejects a half-written draft) and
  `validateManifestation` (all four WOOP parts, at least one 小行動, a likelihood of 1–10)
- `likelihood.ts` — below 4, suggest a smaller 願望
- `care.ts` — when someone's own words mention self-harm, offer 安心專線 1925
- `repo/` — every D1 query, each one taking a `userId` and scoped by it

### Guests and signed-in users

Writing a 顯化 never waits for a sign-in. The first autosave creates a guest **user row** plus a
session, so a guest and a member are the same thing to every query — and when Google sign-in lands
(P04) it upgrades that same row, keeping everything the guest already wrote. The cookie holds a
random 32-byte token; D1 stores only its SHA-256 hash.

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
pnpm test       # vitest, every workspace package
pnpm preview    # builds the Cloudflare Worker bundle and runs it locally with wrangler
pnpm deploy     # builds and deploys apps/web to Cloudflare Workers
pnpm e2e        # Playwright, key flows (starts its own dev server)
```

`pnpm test` runs both kinds of unit test: pure domain logic in Node, and everything that touches
D1 in the Workers runtime via `@cloudflare/vitest-pool-workers` (`*.workers.test.ts`), against the
real migrations in `migrations/`.

`pnpm preview` and `pnpm deploy` run in `apps/web` and require Wrangler to be authenticated
against a real Cloudflare account. Local D1/R2 bindings are simulated automatically; no
Cloudflare account is needed just to run `pnpm preview`.

### Database bindings

`apps/web/wrangler.jsonc` declares the `DB` (D1) and `BOARD` (R2) bindings with placeholder
resource IDs. These become real once P03 runs `wrangler d1 create clearpath` and
`wrangler r2 bucket create clearpath-board` and the IDs are filled in.

Apply the migrations to the local database before `pnpm dev` or `pnpm e2e`:

```bash
pnpm --filter web exec wrangler d1 migrations apply clearpath --local
```

Migrations live in `migrations/` at the repo root, so `packages/core` tests run against the same
SQL the app does.

After changing `wrangler.jsonc`, regenerate typed env bindings:

```bash
pnpm --filter web cf-typegen
```

## CI/CD

`.github/workflows/ci.yml` installs, lints, typechecks, tests and builds every pull request, and
runs the Playwright key flows in a second job.
Pushes to `main` additionally deploy `apps/web` to Cloudflare Workers, using a scoped
Cloudflare API token stored as the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets — not configured yet, so the deploy job will fail until those secrets and a real D1
database ID are in place.
