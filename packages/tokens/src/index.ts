// Design tokens shared by apps/web and the future Expo app (apps/mobile).
// See CLAUDE.md "Design: Lab notebook (實驗筆記)" for the source values.

export const TOKENS_PACKAGE_NAME = '@clearpath/tokens';

export { themeColors, invariantColors } from './colors';
export type { ColorTheme, ThemeColors, InvariantColors } from './colors';

export { fontFamily, typeScale } from './typography';
export type { TypeStyle, TypeScaleKey } from './typography';

export { spacing } from './spacing';
export type { SpacingKey } from './spacing';

export { radius } from './radius';
export type { RadiusKey } from './radius';

export { contrastRatio } from './contrast';
