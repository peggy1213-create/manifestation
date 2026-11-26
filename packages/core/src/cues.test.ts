import { describe, expect, it } from 'vitest';
import { MAX_DAILY_CUES, selectDailyCues, type ProcessStep } from './cues';

function step(position: number, isCue = true): ProcessStep {
  return {
    id: `step-${position}`,
    manifestationId: 'm1',
    body: `小行動 ${position}`,
    position,
    isCue,
  };
}

describe('今日行動 cues', () => {
  it('shows at most three', () => {
    expect(MAX_DAILY_CUES).toBe(3);
    const cues = selectDailyCues([step(1), step(2), step(3), step(4), step(5)], 1);
    expect(cues).toHaveLength(3);
  });

  it('keeps the same trio every day when there are three or fewer', () => {
    const steps = [step(2), step(1)];
    expect(selectDailyCues(steps, 1).map((s) => s.id)).toEqual(['step-1', 'step-2']);
    expect(selectDailyCues(steps, 40).map((s) => s.id)).toEqual(['step-1', 'step-2']);
  });

  it('rotates the window so every step comes round', () => {
    const steps = [step(1), step(2), step(3), step(4)];
    expect(selectDailyCues(steps, 1).map((s) => s.id)).toEqual(['step-1', 'step-2', 'step-3']);
    expect(selectDailyCues(steps, 2).map((s) => s.id)).toEqual(['step-4', 'step-1', 'step-2']);

    const seen = new Set<string>();
    for (let day = 1; day <= 4; day += 1) {
      for (const cue of selectDailyCues(steps, day)) seen.add(cue.id);
    }
    expect([...seen].sort()).toEqual(['step-1', 'step-2', 'step-3', 'step-4']);
  });

  it('leaves out steps that are not cues', () => {
    const cues = selectDailyCues([step(1), step(2, false), step(3)], 1);
    expect(cues.map((s) => s.id)).toEqual(['step-1', 'step-3']);
  });

  it('returns nothing when a 顯化 has no process steps yet', () => {
    expect(selectDailyCues([], 1)).toEqual([]);
    expect(selectDailyCues([step(1, false)], 1)).toEqual([]);
  });
});
