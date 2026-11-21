# Fonts

Self-hosted via `next/font/local` instead of `next/font/google`, so the build has no
runtime dependency on Google's servers (consistent with CLAUDE.md's "no third-party
… tracking scripts" / Cloudflare-only stance) and the build doesn't depend on fetching
~200 unicode-range-split files per family from fonts.googleapis.com.

- `inter-latin-variable.woff2` — Inter (variable, wght 100–900), Latin subset, from
  Google Fonts v20. Covers the `--font-inter` weights we use (400, 700).
- `noto-sans-tc-400.woff2` / `noto-sans-tc-700.woff2` — Noto Sans TC, static weights,
  from Google Fonts v40. Full character set (needed for 繁體中文).

Both families are licensed under the SIL Open Font License 1.1.
