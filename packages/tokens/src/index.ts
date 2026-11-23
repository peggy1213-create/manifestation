// Design tokens shared by apps/web and the future Expo app (apps/mobile).
// The CSS custom-property mirror of these values lives in ./tokens.css; keep
// the two in step. Web reads the CSS variables, Expo reads these objects.

export const TOKENS_PACKAGE_NAME = '@clearpath/tokens';

/** Lab notebook (實驗筆記) palette. */
export const color = {
  light: {
    ink: '#14213D',
    paper: '#FFFFFF',
    paper2: '#EEF2FA',
    graphBlue: '#3A6FF7',
    blueText: '#2F5BD8',
    highlighter: '#F7E26B',
    coral: '#FF7A59',
    inkMuted: '#4B5A7A',
    rule: '#D4DCEE',
    neutral: '#8B93A7',
  },
  dark: {
    ink: '#E8EDF8',
    paper: '#0B1222',
    paper2: '#141D33',
    graphBlue: '#7FA2FF',
    blueText: '#7FA2FF',
    highlighter: '#F7E26B',
    coral: '#FF7A59',
    inkMuted: '#9AA8C6',
    rule: '#27324D',
    neutral: '#78839C',
  },
} as const;

export type ColorScheme = keyof typeof color;
export type ColorName = keyof (typeof color)['light'];

export const font = {
  /** Headings 700, body 400. */
  sans: 'Noto Sans TC',
  /** Latin text and numbers. */
  latin: 'Inter',
  weight: { body: 400, heading: 700 },
} as const;

/** Body copy sits at 16–17px with generous leading, for long zh-TW passages. */
export const type = {
  bodySize: 17,
  bodyLineHeight: 1.75,
} as const;

export const space = {
  /** Side of one graph-paper square. */
  grid: 24,
  radius: 10,
  /** Minimum interactive size, in px. */
  touchTarget: 44,
} as const;
