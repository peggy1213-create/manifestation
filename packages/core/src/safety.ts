/**
 * Clear Path is self-help, not therapy. When a note mentions self-harm we show
 * 安心專線 1925 gently alongside it — we never block the note, hide it, flag the
 * person, or send the text anywhere.
 */

export const SUPPORT_LINE = {
  name: '安心專線',
  number: '1925',
  tel: 'tel:1925',
} as const;

const SELF_HARM_PATTERNS: readonly RegExp[] = [
  /自殺/u,
  /自殘/u,
  /自傷/u,
  /想死/u,
  /不想活/u,
  /活不下去/u,
  /結束生命/u,
  /輕生/u,
  /傷害自己/u,
  /了結自己/u,
  /\bkill myself\b/iu,
  /\bsuicide\b/iu,
  /\bself[-\s]?harm\b/iu,
  /\bend my life\b/iu,
  /\bwant to die\b/iu,
];

/** True when a note reads as mentioning self-harm, so the support line is shown. */
export function mentionsSelfHarm(text: string | null | undefined): boolean {
  if (typeof text !== 'string' || text.trim().length === 0) return false;
  return SELF_HARM_PATTERNS.some((pattern) => pattern.test(text));
}
