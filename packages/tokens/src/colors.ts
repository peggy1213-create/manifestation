// Lab notebook (實驗筆記) colour tokens — see CLAUDE.md "Design: Lab notebook".

export type ColorTheme = 'light' | 'dark';

export interface ThemeColors {
  /** Primary foreground / text colour. */
  ink: string;
  /** Primary page background. */
  paper: string;
  /** Secondary surface background (cards, tracks, subtle fills). */
  paper2: string;
  /** Brand accent: lines, links, selection, focus rings. */
  graphBlue: string;
  /** Link / inline-accent text colour. */
  blueText: string;
}

export const themeColors: Record<ColorTheme, ThemeColors> = {
  light: {
    ink: '#14213D',
    paper: '#FFFFFF',
    paper2: '#EEF2FA',
    graphBlue: '#3A6FF7',
    blueText: '#2F5BD8',
  },
  dark: {
    ink: '#E8EDF8',
    paper: '#0B1222',
    paper2: '#141D33',
    graphBlue: '#7FA2FF',
    // CLAUDE.md only fixes a light-mode blue-text hex. #2F5BD8 is too dark to read on
    // dark paper, so dark mode reuses dark-mode graph-blue, which already clears AA
    // (~7:1) against both dark surfaces — no colour outside the token set is introduced.
    blueText: '#7FA2FF',
  },
};

/**
 * Colours that keep one fixed hex in both themes (CLAUDE.md: highlighter is "always
 * with ink text"). Because they don't invert for dark mode, anything drawn on top of
 * them — text or an icon — must also stay fixed rather than switching to the themed
 * `ink` colour, or contrast breaks in dark mode. `inkOnAccent` is that fixed colour:
 * it is exactly light-mode `ink` (#14213D), reused on purpose, not a new hue.
 */
export const invariantColors = {
  highlighter: '#F7E26B',
  coral: '#FF7A59',
  inkOnAccent: '#14213D',
} as const;

export type InvariantColors = typeof invariantColors;
