// Design tokens shared by apps/web and the future Expo app (apps/mobile).
// Warm notebook (暖調筆記). The same values are exported as CSS variables in tokens.css —
// change both together.

export const TOKENS_PACKAGE_NAME = '@clearpath/tokens';

export const colors = {
  light: {
    ink: '#2E2219',
    paper: '#FBF4EA',
    paper2: '#F3E6D3',
    terracotta: '#D9683C',
    terracottaStrong: '#B4502A',
    honey: '#F6C85F',
    kraft: '#C9A27A',
    /** Text on a terracotta-strong fill. */
    onTerracotta: '#FFFFFF',
    /** Text on a honey highlighter swipe — always dark ink, in both schemes. */
    onHoney: '#2E2219',
  },
  dark: {
    ink: '#F3E9DC',
    paper: '#17110C',
    paper2: '#221A13',
    terracotta: '#E8835A',
    terracottaStrong: '#F09A73',
    honey: '#F6C85F',
    kraft: '#6B5440',
    onTerracotta: '#17110C',
    onHoney: '#2E2219',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorName = keyof (typeof colors)['light'];

export const fonts = {
  /** Headings and body copy; Noto Sans TC carries the 繁體中文. */
  sans: "'Noto Sans TC', 'Inter', system-ui, sans-serif",
  /** Latin text and numbers inside otherwise Chinese copy. */
  latin: "'Inter', system-ui, sans-serif",
} as const;

export const fontWeights = { body: 400, heading: 700 } as const;

/** Body copy sits at 16–17px with generous leading, like writing in a notebook. */
export const typeScale = {
  body: { size: '1.0625rem', lineHeight: 1.75 },
  small: { size: '0.9375rem', lineHeight: 1.7 },
  label: { size: '0.875rem', lineHeight: 1.5 },
  heading: { size: '1.375rem', lineHeight: 1.45 },
  display: { size: '1.75rem', lineHeight: 1.35 },
} as const;

export const space = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
} as const;

export const radii = { sm: '0.375rem', md: '0.625rem', lg: '1rem' } as const;

/** Minimum touch target, in px. */
export const MIN_TOUCH_TARGET = 44;
