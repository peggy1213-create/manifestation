// Design tokens shared by apps/web and the future Expo app (apps/mobile).
// Lab notebook (實驗筆記) palette. The CSS custom properties in ./tokens.css are the
// source of truth for the web; these objects mirror them for React Native.

export const TOKENS_PACKAGE_NAME = '@clearpath/tokens';

/** Colour values per scheme. Keys match the `--cp-*` custom properties in tokens.css. */
export const colors = {
  light: {
    ink: '#14213d',
    inkMuted: '#3d4f78',
    paper: '#ffffff',
    paper2: '#eef2fa',
    graphBlue: '#3a6ff7',
    blueText: '#2f5bd8',
    highlighter: '#f7e26b',
    coral: '#ff7a59',
    inkOnAccent: '#14213d',
    rule: '#d7e0f2',
    neutral: '#c7cedb',
  },
  dark: {
    ink: '#e8edf8',
    inkMuted: '#aebcdb',
    paper: '#0b1222',
    paper2: '#141d33',
    graphBlue: '#7fa2ff',
    blueText: '#7fa2ff',
    highlighter: '#f7e26b',
    coral: '#ff7a59',
    inkOnAccent: '#14213d',
    rule: '#243457',
    neutral: '#35425f',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorName = keyof (typeof colors)['light'];

/** Body type: 16–17px at a 1.75 line height (CLAUDE.md design rules). */
export const typography = {
  bodySize: 17,
  bodyLineHeight: 1.75,
  headingWeight: 700,
  bodyWeight: 400,
  hanFamily: 'Noto Sans TC',
  latinFamily: 'Inter',
} as const;

/** Minimum touch target, in px. */
export const TAP_TARGET = 44;

export function color(name: ColorName, scheme: ColorScheme = 'light'): string {
  return colors[scheme][name];
}
