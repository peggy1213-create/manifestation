/**
 * 今日行動: which 小行動 appear as today's cues. At most three, so a day stays
 * doable. When a 顯化 has more than three cue steps the window rotates by day, so
 * every step comes round instead of the first three carrying the whole path.
 */

export const MAX_DAILY_CUES = 3;

export interface ProcessStep {
  id: string;
  manifestationId: string;
  body: string;
  position: number;
  isCue: boolean;
}

export function selectDailyCues(steps: readonly ProcessStep[], dayNumber: number): ProcessStep[] {
  const cueSteps = steps.filter((step) => step.isCue).sort((a, b) => a.position - b.position);
  if (cueSteps.length === 0) return [];
  if (cueSteps.length <= MAX_DAILY_CUES) return cueSteps;

  const day = Math.max(1, Math.trunc(dayNumber));
  const offset = ((day - 1) * MAX_DAILY_CUES) % cueSteps.length;
  return Array.from({ length: MAX_DAILY_CUES }, (_, index) => {
    const step = cueSteps[(offset + index) % cueSteps.length];
    // The modulo keeps the index inside the array; this satisfies noUncheckedIndexedAccess.
    if (!step) throw new Error('unreachable: cue index out of range');
    return step;
  });
}
