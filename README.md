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

Copy `apps/web/.env.example` to `apps/web/.env.local` and set `NEXT_PUBLIC_SITE_URL`. It is
baked into the build, because `sitemap.xml`, the RSS feed and the Open Graph image URLs are
generated statically and need an absolute origin. Set the same value in CI for `pnpm build`.

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

### Database bindings

`apps/web/wrangler.jsonc` declares the `DB` (D1) and `BOARD` (R2) bindings with placeholder
resource IDs. These become real once P03 runs `wrangler d1 create clearpath` and
`wrangler r2 bucket create clearpath-board` and the IDs are filled in.

After changing `wrangler.jsonc`, regenerate typed env bindings:

```bash
pnpm --filter web cf-typegen
```

## 資源 (resources) content

Articles live as MDX in `apps/web/content/resources/`, one file per article, named after its
slug. Each needs this frontmatter:

```yaml
title: 標題
summary: 一兩句話的摘要
topic: 顯化方法 # one of 顯化方法 | 想像練習 | 習慣 | 研究解讀
published: 2026-09-22 # YYYY-MM-DD
reviewed: 2026-11-23 # YYYY-MM-DD, shown as 最後檢閱
exercise: /workspace/woop # the workspace route the article hands the reader on to
draft: true # hidden in production until this is false or removed
references: # at least one; rendered as the 參考文獻 block
  - author: Gollwitzer, P. M.
    year: 1999
    title: 'Implementation intentions: Strong effects of simple plans. American Psychologist, 54(7), 493–503.'
    url: https://doi.org/10.1037/0003-066X.54.7.493
```

The body carries the first three parts — `研究怎麼說`, `常見誤解`, `今天就試` — and the
`參考文獻` block is rendered from the frontmatter, so a reference is written once. `Callout`,
`TryToday` and `Citation` are available without importing them (see `apps/web/mdx-components.tsx`).

### How the content reaches the app

Workers have no filesystem to read `content/` from at request time, so
`apps/web/scripts/generate-resources.mjs` turns the directory into
`apps/web/lib/resources/generated.ts` before `dev`, `build`, `lint` and `typecheck`. That file is
generated, not committed. The script validates frontmatter and fails the build with the offending
file and field; an invalid `topic` fails `tsc` instead, against the `ResourceTopic` union in
`packages/core`.

### Drafts

`draft: true` keeps an article out of production: it is not listed, not linked, not in
`sitemap.xml` or the RSS feed, and its URL 404s. Drafts show in `pnpm dev`, and in a production
build started with `SHOW_DRAFTS=1` for review. The rule is `draftsVisible()` in
`packages/core/src/resources.ts`.

### Open Graph images

Each article gets a prerendered 1200×630 PNG. `next/og` needs a real TTF to draw 繁體中文, so
`apps/web/assets/fonts/` holds a committed Noto Sans TC subset covering exactly the characters our
titles and labels use (~71 kB per weight). If a new title introduces a character outside that
subset, the build fails and tells you to run:

```bash
pnpm --filter web build:og-font
```

That script needs Python 3 with `fonttools` (`pip install fonttools brotli`) and is the only step
in this repo that is not plain Node. It is a maintenance script, not part of `pnpm build`.

## CI/CD

`.github/workflows/ci.yml` installs, lints, typechecks, tests and builds every pull request.
Pushes to `main` additionally deploy `apps/web` to Cloudflare Workers, using a scoped
Cloudflare API token stored as the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets — not configured yet, so the deploy job will fail until those secrets and a real D1
database ID are in place.
