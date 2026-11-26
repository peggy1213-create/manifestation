import { describe, expect, it } from 'vitest';
import { NOTE_MAX_LENGTH, hasActed, normaliseNote, statusFromCues } from './checkin';

describe('the cue rule', () => {
  it('reads every cue ticked as 做到了', () => {
    expect(statusFromCues({ totalCues: 3, tickedCues: 3 })).toBe('done');
    expect(statusFromCues({ totalCues: 1, tickedCues: 1 })).toBe('done');
  });

  it('reads some cues ticked as 部分', () => {
    expect(statusFromCues({ totalCues: 3, tickedCues: 1 })).toBe('partial');
    expect(statusFromCues({ totalCues: 3, tickedCues: 2 })).toBe('partial');
  });

  it('reads no cue ticked as 今天沒做到', () => {
    expect(statusFromCues({ totalCues: 3, tickedCues: 0 })).toBe('missed');
  });

  it('infers nothing when there are no cues to tick', () => {
    expect(statusFromCues({ totalCues: 0, tickedCues: 0 })).toBeNull();
  });

  it('rejects a tick count outside the cue count', () => {
    expect(() => statusFromCues({ totalCues: 2, tickedCues: 3 })).toThrow(RangeError);
    expect(() => statusFromCues({ totalCues: 2, tickedCues: -1 })).toThrow(RangeError);
  });
});

describe('acting', () => {
  it('counts 做到了 and 部分, never 今天沒做到', () => {
    expect(hasActed('done')).toBe(true);
    expect(hasActed('partial')).toBe(true);
    expect(hasActed('missed')).toBe(false);
  });
});

describe('notes', () => {
  it('keeps one line and drops empty text', () => {
    expect(normaliseNote('  走了十分鐘  ')).toBe('走了十分鐘');
    expect(normaliseNote('第一行\n第二行')).toBe('第一行 第二行');
    expect(normaliseNote('   ')).toBeNull();
    expect(normaliseNote(null)).toBeNull();
    expect(normaliseNote(undefined)).toBeNull();
  });

  it('caps the length', () => {
    expect(normaliseNote('字'.repeat(400))).toHaveLength(NOTE_MAX_LENGTH);
  });
});
