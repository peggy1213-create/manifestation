import { describe, expect, it } from 'vitest';
import {
  LIKELIHOOD_MAX,
  LIKELIHOOD_MIN,
  SMALLER_WISH_THRESHOLD,
  clampLikelihood,
  likelihoodAdvice,
  shouldSuggestSmallerWish,
} from './index';

describe('shouldSuggestSmallerWish', () => {
  it('suggests a smaller 願望 below 4', () => {
    for (const value of [1, 2, 3]) {
      expect(shouldSuggestSmallerWish(value)).toBe(true);
    }
  });

  it('leaves 4 and above as written', () => {
    for (let value = SMALLER_WISH_THRESHOLD; value <= LIKELIHOOD_MAX; value += 1) {
      expect(shouldSuggestSmallerWish(value)).toBe(false);
    }
  });
});

describe('likelihoodAdvice', () => {
  it('bands 1–3 as smaller', () => {
    expect(likelihoodAdvice(3)).toEqual({
      value: 3,
      band: 'smaller',
      suggestSmallerWish: true,
      messageKey: 'likelihood.smaller',
    });
  });

  it('bands 4–6 as steady', () => {
    for (const value of [4, 5, 6]) {
      expect(likelihoodAdvice(value).band).toBe('steady');
      expect(likelihoodAdvice(value).suggestSmallerWish).toBe(false);
    }
  });

  it('bands 7–10 as strong', () => {
    for (const value of [7, 8, 9, 10]) {
      expect(likelihoodAdvice(value).band).toBe('strong');
    }
  });

  it('points at a message key instead of carrying copy', () => {
    expect(likelihoodAdvice(9).messageKey).toBe('likelihood.strong');
  });
});

describe('clampLikelihood', () => {
  it('keeps answers inside 1–10', () => {
    expect(clampLikelihood(0)).toBe(LIKELIHOOD_MIN);
    expect(clampLikelihood(99)).toBe(LIKELIHOOD_MAX);
    expect(clampLikelihood(Number.NaN)).toBe(LIKELIHOOD_MIN);
  });

  it('rounds to a whole step', () => {
    expect(clampLikelihood(6.4)).toBe(6);
    expect(clampLikelihood(6.6)).toBe(7);
  });
});
