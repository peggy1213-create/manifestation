# Clear Path (顯化)

A science-based manifestation (顯化) web app for Taiwan, zh-TW first. Users write a 顯化 with WOOP
(Wish, Outcome, Obstacle, Plan), build a process-first vision board (顯化板), rehearse it in a
3-minute guided session, and record daily footprints on a 66-day path.

## Product rules (never break)
- Evidence over magic. No "universe", "vibration", "attract" or brain-mechanism claims in copy.
- Every outcome visualisation is followed by the obstacle and an if-then plan.
- Process over outcome: rehearsal and vision board give most space to repeatable steps.
- Kind tracking: missed days are neutral grey. No streak shaming, no countdowns, no guilt copy.
- Private by default. Note text and photos never leave our own Cloudflare account.
- No third-party analytics or tracking scripts. Metrics come from our own D1 data.
- Self-help, not therapy. If text mentions self-harm, show 安心專線 1925 gently.

## Language
- All user-facing copy in 繁體中文 (zh-TW), stored in messages/zh-TW.json via next-intl.
- Use 顯化 / 願望, never 目標. Use 實現 not 達成, 小行動 not 任務, 記下今天 not 打卡,
  足跡 not 進度/KPI, 今天沒做到 not 失敗. In English copy never "goal", "target", "KPI", "achieve".
- Code and database may use plain technical names (manifestations, checkins).

## Stack (Cloudflare only)
- pnpm + Turborepo monorepo
  - apps/web: Next.js (App Router) on Cloudflare Workers via @opennextjs/cloudflare,
    TypeScript strict, Tailwind
  - packages/core: pure TS domain logic (WOOP model, 66-day cycle, streaks, cue rules), no React
  - packages/auth: hand-rolled OAuth 2.0 authorization code + PKCE, Web Crypto only
  - packages/tokens: design tokens shared by web and future Expo app
  - apps/mobile: Expo (added in phase 4)
- Database: Cloudflare D1 (SQLite). Migrations in migrations/ via wrangler d1 migrations.
  Typed queries with Drizzle ORM (drizzle-orm/d1). No RLS exists: every query goes through
  packages/core/repo functions that take userId and scope by it. Never query D1 from components.
- Files: Cloudflare R2, private bucket; photos served only through an authenticated Worker route.
- Scheduled work: Cron Triggers. Rate limits: Workers rate-limiting binding.
- Content: MDX in apps/web/content/resources.
- Tests: Vitest (packages, with Miniflare/workers pool for D1), Playwright for key flows.

## Auth rules
- Google is the only sign-in on the web; Sign in with Apple is added for iOS later.
- Authorization code + PKCE (S256), state and nonce, all generated with crypto.getRandomValues
  and crypto.subtle. No auth libraries, no Node crypto.
- Verify Google ID tokens: RS256 signature against Google's JWKS (cached), iss, aud, exp, nonce,
  email_verified.
- Sessions: random 32-byte token in an HttpOnly, Secure, SameSite=Lax cookie; only its SHA-256
  hash is stored in D1 sessions. 30-day rolling expiry. Origin check on every mutating request.
- Secrets (GOOGLE_CLIENT_SECRET, COOKIE_KEY) live in Wrangler secrets, never in code.

## Design: Warm notebook (暖調筆記)
- ink #2E2219 (dark #F3E9DC), paper #FBF4EA (dark #17110C), paper-2 #F3E6D3 (dark #221A13)
- terracotta #D9683C (dark #E8835A): path dots, tiles, marks, large headings only
- terracotta-strong #B4502A (dark #F09A73): buttons with white text and links (passes AA)
- honey #F6C85F (highlighter, always with ink text), kraft #C9A27A (dark #6B5440): grid, dividers
- Noto Sans TC (headings 700, body 400) + Inter for Latin/numbers; body 16–17px, line-height 1.75
- Motifs: faint kraft graph-paper grid, honey highlighter swipe behind one phrase, notebook margin line
- Light and dark mode; 44px touch targets; visible focus; WCAG AA contrast

## Conventions
- Small, reviewable changes. Explain the plan before large edits.
- Domain logic goes in packages/core with unit tests, not in components.
- Server components by default; client components only for interaction.
- Every data access function takes userId; add a test that user B cannot read user A's data.
- Mobile-first layouts; test at 375px and 1280px.

## Commands
- pnpm dev | pnpm build | pnpm test | pnpm lint | pnpm e2e
- pnpm preview (wrangler, Workers runtime locally) | pnpm deploy
- wrangler d1 migrations apply clearpath --local | --remote

## Done means
Build, lint and tests pass; it runs in the Workers runtime (pnpm preview), not only in Node;
no console errors; zh-TW copy only; works in light and dark at 375px.
