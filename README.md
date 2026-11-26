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
- A Google Cloud OAuth client (web), for sign-in (only for a real sign-in; `pnpm e2e` does
  not need one)

## Setup

```bash
pnpm install
```

Copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars`. Its placeholders are enough to run
and test everything locally; signing in with a real Google account needs your own client, as
described under [Signing in](#signing-in).

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

### Signing in

Google is the only sign-in on the web. The flow is hand-rolled against the protocol in
`packages/auth` — OpenID Connect authorization code with PKCE (S256), `state` and `nonce`,
Web Crypto only, no auth library:

1. `/api/auth/google/start` mints a code verifier, state and nonce, seals them into a
   ten-minute AES-GCM cookie and redirects to Google.
2. `/api/auth/google/callback` opens that cookie, checks the state, exchanges the code with
   the verifier, and verifies the ID token: RS256 against Google's cached JWKS, issuer,
   audience, expiry, the nonce from this attempt, and a verified email.
3. The session token is 32 random bytes in an HttpOnly, Secure, SameSite=Lax cookie. D1
   stores only its SHA-256 hash, on a 30-day rolling expiry.

To sign in for real, create an OAuth 2.0 web client at `console.cloud.google.com` with the
redirect URI `<origin>/api/auth/google/callback` (`http://localhost:8787/api/auth/google/callback`
locally), then put the id and secret in `.dev.vars`. In production they are Wrangler secrets:

```bash
cd apps/web && wrangler secret put GOOGLE_CLIENT_SECRET
```

```bash
cd apps/web && wrangler secret put COOKIE_KEY
```

`COOKIE_KEY` is 32 random bytes as base64url, which seals the short-lived sign-in cookie:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### The development sign-in

`pnpm e2e` cannot reach Google, so there is a second way in that exists only locally. With
`DEV_SEED_TOKEN` set in `apps/web/.dev.vars`, opening

```
http://localhost:8787/api/dev/seed?token=<DEV_SEED_TOKEN>
```

creates a user and one seeded 顯化, signs in, and redirects to that 顯化's path. In production
the variable is absent — it is never a Wrangler secret — and the route answers 404 like any
path that does not exist.
