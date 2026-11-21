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
- A Google Cloud OAuth client (web), for sign-in

## Setup

```bash
pnpm install
```

Copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars` and fill in the values. That file
documents every secret and how to generate `COOKIE_KEY`; sign-in needs all three
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `COOKIE_KEY`).

Then create the local database tables:

```bash
pnpm --filter web exec wrangler d1 migrations apply clearpath --local
```

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

## Sign-in (hand-rolled OAuth 2.0 + PKCE)

Google is the only way to sign in on the web. There is no auth library and no Node crypto in
the stack: `packages/auth` is built on `crypto.getRandomValues` and `crypto.subtle` alone, and
`apps/web` wires it to D1 through the repo functions in `packages/core`.

| Route                       | What it does                                                                                                                                                                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /auth/google`          | Makes a PKCE verifier + S256 challenge, state and nonce, seals verifier/state/nonce/returnTo in a 10-minute AES-GCM cookie, redirects to Google with `prompt=select_account`                                                                                                      |
| `GET /auth/google/callback` | Compares state in constant time, swaps the code for tokens server-side, verifies the ID token (RS256 against Google's cached JWKS, then `iss`, `aud`, `exp`/`iat` ±60s, `nonce`, `email_verified`), upserts the account by `google_sub`, starts a session, clears the PKCE cookie |
| `POST /auth/logout`         | Deletes the session row, then the cookie                                                                                                                                                                                                                                          |
| `POST /api/guest/import`    | Moves the 顯化 written in guest mode into the signed-in account                                                                                                                                                                                                                   |
| `/login`, `/auth/error`     | zh-TW sign-in page, and one page for denied consent / an expired link / a token that did not verify                                                                                                                                                                               |

Sessions are a 32-byte random token in an `HttpOnly; Secure; SameSite=Lax; Path=/` cookie that
lasts 30 days and rolls forward on use. D1 stores only `SHA-256(token)`, so the `sessions`
table cannot be replayed if it leaks. `middleware.ts` keeps `/app/*` behind a session cookie
and refuses any `POST`/`PUT`/`PATCH`/`DELETE` whose `Origin` (or `Referer`) is not our own.

Guest mode holds one 顯化 in `localStorage` and nothing else: it never reaches the server
unless the person signs in and says to move it. The merge rules live in
`packages/core/src/guest.ts` — the account always wins, and moving the same 願望 twice adds
nothing.

### Secrets

| Name                   | Where                                                               |
| ---------------------- | ------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | `wrangler secret put GOOGLE_CLIENT_ID`                              |
| `GOOGLE_CLIENT_SECRET` | `wrangler secret put GOOGLE_CLIENT_SECRET`                          |
| `COOKIE_KEY`           | `wrangler secret put COOKIE_KEY` (32 random bytes, base64url)       |
| `APP_ORIGIN`           | Optional plain var, only for a Worker behind a host-rewriting proxy |

Locally the same names live in `apps/web/.dev.vars`, which is gitignored. Every origin you sign
in from needs `<origin>/auth/google/callback` on the OAuth client's authorised redirect URI
list — `http://localhost:3000` for `pnpm dev`, the port `pnpm preview` prints, the
`workers.dev` URL, and production.

### Database bindings

`apps/web/wrangler.jsonc` declares the `DB` (D1) and `BOARD` (R2) bindings with placeholder
resource IDs. These become real once `wrangler d1 create clearpath` and
`wrangler r2 bucket create clearpath-board` have run and the IDs are filled in.

Migrations are hand-written SQL in `migrations/`:

```bash
pnpm --filter web exec wrangler d1 migrations apply clearpath --local
pnpm --filter web exec wrangler d1 migrations apply clearpath --remote
```

`packages/core` tests run in the Workers runtime (Miniflare) against a real local D1, migrated
from that same folder — including a test that user B cannot read user A's data.

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
