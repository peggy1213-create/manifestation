// 可能性 1–10. A low answer is a signal to shrink the 願望, never a verdict on the person.

export const LIKELIHOOD_MIN = 1;
export const LIKELIHOOD_MAX = 10;

/** Below 4, the builder suggests a smaller 願望 instead of a bigger push. */
export const SMALLER_WISH_THRESHOLD = 4;

/** 7 and up is where a 顯化 is worth committing to as written. */
export const STRONG_LIKELIHOOD_THRESHOLD = 7;

export type LikelihoodBand = 'smaller' | 'steady' | 'strong';

export interface LikelihoodAdvice {
  value: number;
  band: LikelihoodBand;
  /** True below {@link SMALLER_WISH_THRESHOLD}: offer to cut the 願望 down to a smaller one. */
  suggestSmallerWish: boolean;
  /** Key under `likelihood` in messages/zh-TW.json. */
  messageKey: string;
}

export function clampLikelihood(value: number): number {
  if (!Number.isFinite(value)) return LIKELIHOOD_MIN;
  return Math.min(LIKELIHOOD_MAX, Math.max(LIKELIHOOD_MIN, Math.round(value)));
}

export function shouldSuggestSmallerWish(value: number): boolean {
  return clampLikelihood(value) < SMALLER_WISH_THRESHOLD;
}

/** Out-of-range answers are clamped into 1–10; validation reports them separately. */
export function likelihoodAdvice(value: number): LikelihoodAdvice {
  const clamped = clampLikelihood(value);
  const band: LikelihoodBand =
    clamped < SMALLER_WISH_THRESHOLD
      ? 'smaller'
      : clamped < STRONG_LIKELIHOOD_THRESHOLD
        ? 'steady'
        : 'strong';

  return {
    value: clamped,
    band,
    suggestSmallerWish: band === 'smaller',
    messageKey: `likelihood.${band}`,
  };
}
