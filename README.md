# Clear Path (顯化)

A science-based manifestation (顯化) web app for Taiwan, zh-TW first. See [`CLAUDE.md`](./CLAUDE.md)
for the product rules, stack and conventions every change follows.

## Stack

pnpm + Turborepo monorepo, deployed to Cloudflare Workers:

- `apps/web` — Next.js (App Router), TypeScript strict, Tailwind, deployed via
  [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
- `packages/core` — pure TS domain logic (WOOP model, 66-day cycle, streaks), no React
- `packages/auth` — hand-rolled OAuth 2.0 + PKCE (Web Crypto only, no auth libraries)
- `packages/tokens` — design tokens shared by web and the future Expo app (colours, type
  scale, spacing, radius), exported both as TypeScript objects and as CSS variables

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
pnpm test       # vitest, every workspace package
pnpm preview    # builds the Cloudflare Worker bundle and runs it locally with wrangler
pnpm deploy     # builds and deploys apps/web to Cloudflare Workers
```

`pnpm preview` and `pnpm deploy` run in `apps/web` and require Wrangler to be authenticated
against a real Cloudflare account. Local D1/R2 bindings are simulated automatically; no
Cloudflare account is needed just to run `pnpm preview`.

### Design system

The Lab notebook (實驗筆記) design system lives in `packages/tokens` (values) and
`apps/web/components/ui` (components). `apps/web/app/globals.css` is the Tailwind v4
preset: it maps the tokens' `--cp-*` CSS variables onto Tailwind's theme namespaces, so
`bg-ink`, `text-body` and `rounded-md` all read from the tokens and nothing hard-codes a
colour. Dark mode follows the system and can be forced with a `data-theme="light"|"dark"`
attribute on any element.

Run `pnpm dev` and open [`/styleguide`](http://localhost:3000/styleguide) to see every
component side by side in both themes.

### Database bindings

`apps/web/wrangler.jsonc` declares the `DB` (D1) and `BOARD` (R2) bindings with placeholder
resource IDs. These become real once P03 runs `wrangler d1 create clearpath` and
`wrangler r2 bucket create clearpath-board` and the IDs are filled in.

After changing `wrangler.jsonc`, regenerate typed env bindings:

```bash
pnpm --filter web cf-typegen
```

## CI/CD

`.github/workflows/ci.yml` installs, lints, typechecks, tests and builds every pull request.
Pushes to `main` additionally deploy `apps/web` to Cloudflare Workers, using a scoped
Cloudflare API token stored as the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets — not configured yet, so the deploy job will fail until those secrets and a real D1
database ID are in place.
