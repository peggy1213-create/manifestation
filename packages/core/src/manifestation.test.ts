import { describe, expect, it } from 'vitest';
import {
  CORE_PACKAGE_NAME,
  MAX_STEPS,
  canEdit,
  canRelease,
  characterCount,
  emptyManifestationInput,
  ifThenParts,
  isStepBlank,
  normaliseInput,
  normaliseInputForActivation,
  splitStepLines,
} from './index';

describe('@clearpath/core', () => {
  it('exposes its package name as a sanity check', () => {
    expect(CORE_PACKAGE_NAME).toBe('@clearpath/core');
  });
});

describe('characterCount', () => {
  it('counts 漢字 one by one', () => {
    expect(characterCount('我想每週運動三次')).toBe(8);
  });

  it('counts an emoji as one character', () => {
    expect(characterCount('跑步🏃')).toBe(3);
  });
});

describe('emptyManifestationInput', () => {
  it('starts with one blank 過程步驟 row', () => {
    const input = emptyManifestationInput();
    expect(input.steps).toHaveLength(1);
    expect(isStepBlank(input.steps[0]!)).toBe(true);
    expect(input.likelihood).toBeNull();
  });
});

describe('normaliseInput', () => {
  it('trims every field but keeps blank step rows', () => {
    const normalised = normaliseInput({
      ...emptyManifestationInput(),
      wish: '  每週運動三次  ',
      planIf: ' 如果我太累 ',
      steps: [
        { action: ' 換上跑鞋 ', when: ' 下班後 ', where: ' 家門口 ' },
        { action: '', when: '', where: '' },
      ],
    });

    expect(normalised.wish).toBe('每週運動三次');
    expect(normalised.planIf).toBe('如果我太累');
    expect(normalised.steps).toHaveLength(2);
    expect(normalised.steps[0]).toEqual({ action: '換上跑鞋', when: '下班後', where: '家門口' });
  });

  it('keeps at most MAX_STEPS rows', () => {
    const steps = Array.from({ length: MAX_STEPS + 3 }, (_, i) => ({
      action: `步驟 ${i}`,
      when: '早上',
      where: '家裡',
    }));

    expect(normaliseInput({ ...emptyManifestationInput(), steps }).steps).toHaveLength(MAX_STEPS);
  });
});

describe('normaliseInputForActivation', () => {
  it('drops step rows with no 小行動', () => {
    const normalised = normaliseInputForActivation({
      ...emptyManifestationInput(),
      steps: [
        { action: '', when: '', where: '' },
        { action: '寫下三行', when: '睡前', where: '書桌' },
        { action: '   ', when: '早上', where: '家裡' },
      ],
    });

    expect(normalised.steps).toEqual([{ action: '寫下三行', when: '睡前', where: '書桌' }]);
  });
});

describe('splitStepLines', () => {
  it('turns pasted text into one step per line', () => {
    const lines = splitStepLines('- 換上跑鞋\n2. 走到公園\n\n• 跑十分鐘\n   ');
    expect(lines).toEqual(['換上跑鞋', '走到公園', '跑十分鐘']);
  });

  it('returns nothing for blank text', () => {
    expect(splitStepLines('  \n \n')).toEqual([]);
  });
});

describe('ifThenParts', () => {
  it('is complete only when both halves are written', () => {
    expect(ifThenParts({ planIf: '我太累', planThen: '' }).complete).toBe(false);
    expect(ifThenParts({ planIf: '', planThen: '只走十分鐘' }).complete).toBe(false);
    expect(ifThenParts({ planIf: '我太累', planThen: '只走十分鐘' }).complete).toBe(true);
  });

  it('strips trailing punctuation so the preview sentence reads cleanly', () => {
    const parts = ifThenParts({ planIf: ' 我太累了。 ', planThen: '只走十分鐘，' });
    expect(parts).toEqual({ ifPart: '我太累了', thenPart: '只走十分鐘', complete: true });
  });
});

describe('status rules', () => {
  it('lets a draft or an active 顯化 be edited and released', () => {
    for (const status of ['draft', 'active'] as const) {
      expect(canEdit(status)).toBe(true);
      expect(canRelease(status)).toBe(true);
    }
  });

  it('leaves a released 顯化 alone', () => {
    expect(canEdit('released')).toBe(false);
    expect(canRelease('released')).toBe(false);
  });
});
