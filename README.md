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
  (the Lab notebook palette, type scale and spacing, mirrored as CSS custom
  properties in `tokens.css`)

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
pnpm lint:copy  # copy lint: banned wording, and copy hard-coded outside zh-TW.json
pnpm typecheck  # tsc --noEmit, every workspace package
pnpm test       # vitest, every workspace package
pnpm e2e        # playwright, the shell and keyboard navigation at 375px and 1280px
pnpm preview    # builds the Cloudflare Worker bundle and runs it locally with wrangler
pnpm deploy     # builds and deploys apps/web to Cloudflare Workers
```

`pnpm e2e` builds first and runs the suite against `next start` on port 3100, in two
projects — a 375px viewport and a 1280px one — because the shell swaps the header menu for a
bottom tab bar below `md`. The first run needs a browser: `pnpm --filter web exec playwright
install chromium`.

`pnpm preview` and `pnpm deploy` run in `apps/web` and require Wrangler to be authenticated
against a real Cloudflare account. Local D1/R2 bindings are simulated automatically; no
Cloudflare account is needed just to run `pnpm preview`.

### Database bindings

`apps/web/wrangler.jsonc` declares the `DB` (D1) and `BOARD` (R2) bindings with placeholder
resource IDs. These become real once P03 runs `wrangler d1 create clearpath` and
`wrangler r2 bucket create clearpath-board` and the IDs are filled in.

After changing `wrangler.jsonc`, regenerate typed env bindings:

```bash
pnpm --filter web cf-typegen
```

## Copy and language

All user-facing copy lives in `apps/web/messages/zh-TW.json` and is read through
[next-intl](https://next-intl.dev). zh-TW is the only locale, so there is no locale segment in
the URL and no next-intl middleware: `apps/web/i18n/request.ts` returns the one locale, and
`apps/web/next-intl.d.ts` types every message key against the catalogue, which turns a typo in
`t('nav.hoem')` into a build error.

`pnpm lint:copy` (`scripts/copy-lint.mjs`, no dependencies) fails when:

- a message uses 目標, 達成, KPI, 任務 or 打卡 — the product says 願望 / 顯化, 實現, 足跡,
  小行動 and 記下今天 instead; or
- Chinese text appears in `app/`, `components/`, `lib/` or `i18n/` outside a comment, which
  means a string was hard-coded instead of going through the catalogue.

## Site URL

Canonical URLs and Open Graph tags are absolute, so they need an origin. It defaults to
`https://clearpath.tw`; set `NEXT_PUBLIC_SITE_URL` per environment to override it. The contact
address in `messages/zh-TW.json` (`pages.contact.email`) is a placeholder until a real mailbox
exists.

## CI/CD

`.github/workflows/ci.yml` runs three checks on every pull request: the copy lint (no install
needed), then lint + typecheck + test + build, then the Playwright suite.
Pushes to `main` additionally deploy `apps/web` to Cloudflare Workers, using a scoped
Cloudflare API token stored as the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets — not configured yet, so the deploy job will fail until those secrets and a real D1
database ID are in place.
