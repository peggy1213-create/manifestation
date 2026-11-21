/**
 * Design tokens shared by apps/web and the future Expo app (apps/mobile).
 * The Lab notebook (實驗筆記) palette: ink on paper, graph-paper blue, one
 * highlighter and one coral accent per screen.
 */
export const TOKENS_PACKAGE_NAME = '@clearpath/tokens';

export const lightColors = {
  ink: '#14213D',
  paper: '#FFFFFF',
  paper2: '#EEF2FA',
  graphBlue: '#3A6FF7',
  /** Blue text on white; darker than graphBlue so it stays WCAG AA. */
  blueText: '#2F5BD8',
  highlighter: '#F7E26B',
  coral: '#FF7A59',
  muted: '#4C5A77',
} as const;

export const darkColors = {
  ink: '#E8EDF8',
  paper: '#0B1222',
  paper2: '#141D33',
  graphBlue: '#7FA2FF',
  blueText: '#7FA2FF',
  highlighter: '#F7E26B',
  coral: '#FF7A59',
  muted: '#A8B4CC',
} as const;

export const typography = {
  /** Noto Sans TC for 繁體中文, Inter for Latin and numbers. */
  sans: 'Noto Sans TC',
  latin: 'Inter',
  headingWeight: 700,
  bodyWeight: 400,
  bodySize: 17,
  bodyLineHeight: 1.75,
} as const;

export const layout = {
  /** Minimum touch target, in px. */
  tapTarget: 44,
  radius: 12,
  gridSize: 24,
} as const;

export type ColorToken = keyof typeof lightColors;
