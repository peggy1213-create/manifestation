// Self-help, not therapy. When someone's own words mention hurting themselves, the app
// gently offers 安心專線 1925 — it never blocks what they wrote and never diagnoses.

const SELF_HARM_PATTERNS: readonly RegExp[] = [
  /自殺/,
  /自殘/,
  /自我傷害/,
  /傷害自己/,
  /弄傷自己/,
  /想死/,
  /不想活/,
  /活不下去/,
  /不想活下去/,
  /結束生命/,
  /結束自己的生命/,
  /了結自己/,
  /輕生/,
  /一死了之/,
  /suicide/i,
  /self[\s-]?harm/i,
  /kill myself/i,
  /end my life/i,
];

/** Does this text mention self-harm? Used to offer the 安心專線 1925 card, nothing else. */
export function mentionsSelfHarm(...texts: readonly string[]): boolean {
  const joined = texts.join('\n');
  return SELF_HARM_PATTERNS.some((pattern) => pattern.test(joined));
}
