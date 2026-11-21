// Design tokens shared by apps/web and the future Expo app (apps/mobile).
// Design language: "Lab notebook" (實驗筆記).
//
// The palette, type scale and spacing below are the single source of truth.
// `tokens.css` mirrors them as CSS custom properties for the web app; keep the
// two in sync (there is a unit test asserting they agree).

export const TOKENS_PACKAGE_NAME = '@clearpath/tokens';

/**
 * Core palette. Each entry is `[light, dark]`.
 *
 * `ink`, `paper`, `paper2`, `graphBlue`, `blueOnWhite`, `highlighter` and
 * `coral` come straight from the design spec. `inkMuted`, `line` and
 * `paperSunken` are derived neutrals in the same hue family, added so the shell
 * can draw secondary text, hairlines and the notebook margin without inventing
 * colours per screen.
 */
export const palette = {
  /** Primary text and headings. */
  ink: ['#14213D', '#E8EDF8'],
  /** Secondary text: captions, metadata, the neutral grey of a missed day. */
  inkMuted: ['#5A678A', '#A3B0CC'],
  /** Page background. */
  paper: ['#FFFFFF', '#0B1222'],
  /** Raised surfaces: cards, the header, the mobile tab bar. */
  paper2: ['#EEF2FA', '#141D33'],
  /** Recessed surfaces: input wells, inset notes. */
  paperSunken: ['#F7F9FD', '#101829'],
  /** Hairlines, the graph-paper grid and the notebook margin line. */
  line: ['#D8E0F0', '#263251'],
  /** Interactive blue: focus rings, borders, filled buttons. */
  graphBlue: ['#3A6FF7', '#7FA2FF'],
  /** Blue *text* on paper — darker than graphBlue so it clears WCAG AA. */
  blueOnWhite: ['#2F5BD8', '#7FA2FF'],
  /**
   * Highlighter swipe. Always pair with ink text, never with white.
   *
   * The swipe covers only the lower part of the line, so the same text sits
   * half on the swipe and half on the page — which means the dark value has to
   * work under ink, not under the light value's dark text. Hence a deep amber
   * rather than the bright yellow: pale ink reads on both.
   */
  highlighter: ['#F7E26B', '#7A6410'],
  /** One accent per screen. Never body text. */
  coral: ['#FF7A59', '#FF9478'],
} as const satisfies Record<string, readonly [string, string]>;

export type ColorName = keyof typeof palette;

/** Resolve a palette entry for one colour scheme. */
export function color(name: ColorName, scheme: 'light' | 'dark' = 'light'): string {
  return palette[name][scheme === 'light' ? 0 : 1];
}

export const fonts = {
  /**
   * One stack for everything. Inter is listed first on purpose: it only covers
   * Latin and numbers, so those render in Inter and 繁體中文 falls through to
   * Noto Sans TC — exactly the pairing the design spec asks for.
   */
  sans: "Inter, 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
} as const;

export const fontWeights = {
  body: 400,
  heading: 700,
} as const;

/** Body copy sits at 16–17px with a generous 1.75 line-height. */
export const typography = {
  body: { size: '1.0625rem', lineHeight: 1.75 },
  bodySmall: { size: '0.9375rem', lineHeight: 1.7 },
  caption: { size: '0.8125rem', lineHeight: 1.6 },
  h1: { size: '2rem', lineHeight: 1.3 },
  h2: { size: '1.5rem', lineHeight: 1.4 },
  h3: { size: '1.1875rem', lineHeight: 1.5 },
} as const;

export const space = {
  '1': '0.25rem',
  '2': '0.5rem',
  '3': '0.75rem',
  '4': '1rem',
  '6': '1.5rem',
  '8': '2rem',
  '12': '3rem',
  '16': '4rem',
} as const;

export const radii = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  pill: '999px',
} as const;

/** Minimum touch target, per the accessibility rules in CLAUDE.md. */
export const TOUCH_TARGET_PX = 44;

/** Spacing of the faint graph-paper grid motif. */
export const GRID_SIZE_PX = 24;
