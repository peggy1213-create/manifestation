import { describe, expect, it } from 'vitest';
import {
  LIKELIHOOD_MAX,
  LIKELIHOOD_MIN,
  MAX_STEPS,
  REQUIRED_WOOP_FIELDS,
  RELEASE_NOTE_MAX_LENGTH,
  WISH_MAX_LENGTH,
  emptyManifestationInput,
  isLikelihoodInRange,
  issueFields,
  validateDraft,
  validateManifestation,
  validateReleaseNote,
  type ManifestationInput,
} from './index';

function completeInput(overrides: Partial<ManifestationInput> = {}): ManifestationInput {
  return {
    ...emptyManifestationInput(),
    wish: '每週運動三次',
    outcome: '我在公園跑完十分鐘，呼吸順暢',
    outcomeSee: '看到公園的樹',
    outcomeHear: '聽到自己的腳步聲',
    outcomeFeel: '感覺身體是輕的',
    obstacle: '下班後太累，會直接躺在沙發上',
    planIf: '我一回家就想躺下',
    planThen: '先換上跑鞋，走到家門口',
    steps: [{ action: '換上跑鞋', when: '下班進門後', where: '玄關' }],
    likelihood: 7,
    ...overrides,
  };
}

describe('validateManifestation', () => {
  it('accepts a complete 顯化', () => {
    expect(validateManifestation(completeInput())).toEqual({ ok: true, issues: [] });
  });

  it('requires all four WOOP parts', () => {
    const result = validateManifestation(emptyManifestationInput());

    expect(result.ok).toBe(false);
    for (const field of REQUIRED_WOOP_FIELDS) {
      expect(result.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ field, code: 'required' })]),
      );
    }
  });

  it('requires at least one 小行動', () => {
    const result = validateManifestation(
      completeInput({ steps: [{ action: ' ', when: '', where: '' }] }),
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([expect.objectContaining({ field: 'steps', code: 'required' })]);
  });

  it('treats a step with only when and where as blank', () => {
    const result = validateManifestation(
      completeInput({ steps: [{ action: '', when: '早上', where: '家裡' }] }),
    );

    expect(result.ok).toBe(false);
    expect(issueFields(result.issues)).toEqual(['steps']);
  });

  it('accepts a step without when or where', () => {
    expect(
      validateManifestation(completeInput({ steps: [{ action: '走到公園', when: '', where: '' }] }))
        .ok,
    ).toBe(true);
  });

  it('requires an answer to 可能性', () => {
    const result = validateManifestation(completeInput({ likelihood: null }));

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ field: 'likelihood', code: 'required' }),
    ]);
  });

  it(`rejects a 願望 longer than ${WISH_MAX_LENGTH} characters`, () => {
    const result = validateManifestation(completeInput({ wish: '運'.repeat(WISH_MAX_LENGTH + 1) }));

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ field: 'wish', code: 'tooLong', limit: WISH_MAX_LENGTH }),
    ]);
  });

  it(`accepts a 願望 of exactly ${WISH_MAX_LENGTH} characters`, () => {
    expect(validateManifestation(completeInput({ wish: '運'.repeat(WISH_MAX_LENGTH) })).ok).toBe(
      true,
    );
  });

  it('measures the 願望 in characters, not UTF-16 units', () => {
    expect(validateManifestation(completeInput({ wish: '🏃'.repeat(WISH_MAX_LENGTH) })).ok).toBe(
      true,
    );
  });

  it('ignores whitespace around a 願望 that is otherwise within the limit', () => {
    const wish = `  ${'運'.repeat(WISH_MAX_LENGTH)}  `;
    expect(validateManifestation(completeInput({ wish })).ok).toBe(true);
  });

  it('rejects a likelihood outside 1–10', () => {
    for (const likelihood of [0, 11, 4.5]) {
      const result = validateManifestation(completeInput({ likelihood }));
      expect(result.ok).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'likelihood', code: 'outOfRange' }),
        ]),
      );
    }
  });
});

describe('validateDraft', () => {
  it('never asks a half-written draft for missing fields', () => {
    expect(validateDraft(emptyManifestationInput())).toEqual({ ok: true, issues: [] });
  });

  it('still catches a 願望 over the limit', () => {
    const result = validateDraft({
      ...emptyManifestationInput(),
      wish: '運'.repeat(WISH_MAX_LENGTH + 1),
    });

    expect(result.ok).toBe(false);
    expect(issueFields(result.issues)).toEqual(['wish']);
  });

  it('reports which step row is too long', () => {
    const result = validateDraft({
      ...emptyManifestationInput(),
      steps: [
        { action: '走十分鐘', when: '', where: '' },
        { action: '跑'.repeat(200), when: '', where: '' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ field: 'steps', code: 'tooLong', stepIndex: 1 }),
    ]);
  });

  it(`rejects more than ${MAX_STEPS} steps`, () => {
    const steps = Array.from({ length: MAX_STEPS + 1 }, () => ({
      action: '走十分鐘',
      when: '',
      where: '',
    }));

    expect(validateDraft({ ...emptyManifestationInput(), steps }).issues).toEqual([
      expect.objectContaining({ field: 'steps', code: 'tooMany', limit: MAX_STEPS }),
    ]);
  });
});

describe('isLikelihoodInRange', () => {
  it('accepts whole numbers from 1 to 10', () => {
    for (let value = LIKELIHOOD_MIN; value <= LIKELIHOOD_MAX; value += 1) {
      expect(isLikelihoodInRange(value)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    for (const value of [0, 11, -3, 2.5, Number.NaN]) {
      expect(isLikelihoodInRange(value)).toBe(false);
    }
  });
});

describe('validateReleaseNote', () => {
  it('accepts no note at all — 放下 needs no explanation', () => {
    expect(validateReleaseNote('')).toEqual({ ok: true, issues: [] });
  });

  it(`rejects a note longer than ${RELEASE_NOTE_MAX_LENGTH} characters`, () => {
    const result = validateReleaseNote('字'.repeat(RELEASE_NOTE_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ field: 'releaseNote', code: 'tooLong' }),
    ]);
  });
});
