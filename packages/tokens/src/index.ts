// Design tokens shared by apps/web and the future Expo app (apps/mobile).
// Warm notebook (暖調筆記). The CSS custom properties in ./tokens.css carry the same values.

export const TOKENS_PACKAGE_NAME = '@clearpath/tokens';

export interface ColorPair {
  /** Light mode. */
  light: string;
  /** Dark mode. */
  dark: string;
}

/**
 * The palette. Roles, not decoration:
 * - `ink` is text and the marks the user has made.
 * - `paper` / `paper2` are the page and the raised surfaces on it.
 * - `terracotta` is for path dots, tiles, marks and large headings only.
 * - `terracottaStrong` is the only terracotta that may sit under white text or carry a link.
 * - `honey` is a highlighter and always has ink text on it.
 * - `kraft` is the graph-paper grid, dividers, and the neutral tone a missed day is drawn in.
 */
export const colors = {
  ink: { light: '#2E2219', dark: '#F3E9DC' },
  paper: { light: '#FBF4EA', dark: '#17110C' },
  paper2: { light: '#F3E6D3', dark: '#221A13' },
  terracotta: { light: '#D9683C', dark: '#E8835A' },
  terracottaStrong: { light: '#B4502A', dark: '#F09A73' },
  honey: { light: '#F6C85F', dark: '#F6C85F' },
  kraft: { light: '#C9A27A', dark: '#6B5440' },
} as const satisfies Record<string, ColorPair>;

export type ColorName = keyof typeof colors;

export const fonts = {
  /** Headings 700, body 400. */
  sans: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
  /** Latin text and numbers. */
  latin: 'Inter, system-ui, sans-serif',
} as const;

export const typography = {
  bodySize: '17px',
  bodySizeSmall: '16px',
  bodyLineHeight: 1.75,
} as const;

/** Smallest comfortable tap target, in pixels. */
export const TOUCH_TARGET = 44;

/** The faint kraft graph-paper grid, in pixels. */
export const GRID_SIZE = 8;
