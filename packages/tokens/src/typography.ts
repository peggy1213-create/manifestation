// Noto Sans TC covers CJK glyphs (headings 700, body 400); Inter sits in front of it so
// Latin letters and numerals render in Inter while Chinese falls back to Noto Sans TC.
export const fontFamily = {
  sans: "'Inter', 'Noto Sans TC', sans-serif",
} as const;

export interface TypeStyle {
  fontSize: string;
  lineHeight: string;
  fontWeight: 400 | 700;
}

export type TypeScaleKey = 'caption' | 'body' | 'heading' | 'display';

/** Exactly four sizes, per the Lab notebook spec. Body sits at 16px / 1.75 line-height. */
export const typeScale: Record<TypeScaleKey, TypeStyle> = {
  caption: { fontSize: '0.8125rem', lineHeight: '1.5', fontWeight: 400 },
  body: { fontSize: '1rem', lineHeight: '1.75', fontWeight: 400 },
  heading: { fontSize: '1.25rem', lineHeight: '1.4', fontWeight: 700 },
  display: { fontSize: '1.75rem', lineHeight: '1.3', fontWeight: 700 },
};
