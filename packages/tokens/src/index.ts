/**
 * Design tokens shared by apps/web and the future Expo app (apps/mobile).
 * The CSS custom properties in ./tokens.css carry the same values; this module
 * is how React Native, and any test that needs the raw hex, reads them.
 *
 * Warm notebook (暖調筆記): ink on paper, terracotta for the path, honey as a
 * highlighter, kraft for grid lines and dividers.
 */

export const TOKENS_PACKAGE_NAME = '@clearpath/tokens';

export interface Palette {
  ink: string;
  paper: string;
  paper2: string;
  terracotta: string;
  /** Buttons with white text, and links. Passes WCAG AA on paper. */
  terracottaStrong: string;
  /** Highlighter: always carries ink text, never white. */
  honey: string;
  kraft: string;
  onTerracotta: string;
}

export const lightPalette: Palette = {
  ink: '#2E2219',
  paper: '#FBF4EA',
  paper2: '#F3E6D3',
  terracotta: '#D9683C',
  terracottaStrong: '#B4502A',
  honey: '#F6C85F',
  kraft: '#C9A27A',
  onTerracotta: '#FFFFFF',
};

export const darkPalette: Palette = {
  ink: '#F3E9DC',
  paper: '#17110C',
  paper2: '#221A13',
  terracotta: '#E8835A',
  terracottaStrong: '#F09A73',
  honey: '#F6C85F',
  kraft: '#6B5440',
  onTerracotta: '#17110C',
};

export const palettes = { light: lightPalette, dark: darkPalette } as const;

export type ThemeName = keyof typeof palettes;

export const typography = {
  fontSans: "'Noto Sans TC', 'Inter', system-ui, sans-serif",
  fontLatin: "'Inter', system-ui, sans-serif",
  headingWeight: 700,
  bodyWeight: 400,
  bodySize: 17,
  smallSize: 15,
  captionSize: 13,
  bodyLineHeight: 1.75,
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;

/** Minimum touch target, in px. */
export const MIN_TAP_TARGET = 44;
