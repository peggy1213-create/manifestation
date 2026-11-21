import { describe, expect, it } from 'vitest';
import {
  GUEST_FIELD_MAX_LENGTH,
  GUEST_WISH_MAX_LENGTH,
  isSameWish,
  parseGuestDraft,
  planGuestMerge,
  type GuestDraft,
} from './guest';

const NOW = Date.UTC(2026, 2, 1);

const draft: GuestDraft = {
  wish: '每週跑三次',
  outcome: '週末爬山不會喘',
  obstacle: '下班就想躺著',
  plan: '如果下班想躺著，就先換上跑鞋走十分鐘',
  createdAt: Date.UTC(2026, 1, 20),
};

describe('parseGuestDraft', () => {
  it('reads a draft written in guest mode', () => {
    expect(parseGuestDraft(draft, { now: NOW })).toEqual(draft);
  });

  it('reads the JSON string localStorage actually holds', () => {
    expect(parseGuestDraft(JSON.stringify(draft), { now: NOW })).toEqual(draft);
  });

  it('needs a 願望, and nothing else', () => {
    expect(parseGuestDraft({ wish: '   ' }, { now: NOW })).toBeNull();
    expect(parseGuestDraft({ outcome: '只有結果' }, { now: NOW })).toBeNull();
    expect(parseGuestDraft({ wish: '每週跑三次' }, { now: NOW })).toEqual({
      wish: '每週跑三次',
      outcome: '',
      obstacle: '',
      plan: '',
      createdAt: NOW,
    });
  });

  it('returns null for junk, not an exception', () => {
    for (const raw of [null, undefined, '', 'not json', '[]', [], 42, { wish: 42 }]) {
      expect(parseGuestDraft(raw, { now: NOW })).toBeNull();
    }
  });

  it('trims and caps every field', () => {
    const parsed = parseGuestDraft(
      {
        wish: `  ${'願'.repeat(200)}  `,
        outcome: '果'.repeat(900),
        obstacle: ' 阻 ',
        plan: '畫'.repeat(900),
        createdAt: NOW,
      },
      { now: NOW },
    );
    expect(parsed?.wish).toHaveLength(GUEST_WISH_MAX_LENGTH);
    expect(parsed?.outcome).toHaveLength(GUEST_FIELD_MAX_LENGTH);
    expect(parsed?.plan).toHaveLength(GUEST_FIELD_MAX_LENGTH);
    expect(parsed?.obstacle).toBe('阻');
  });

  it('keeps a plausible draft date and replaces an implausible one', () => {
    expect(
      parseGuestDraft({ ...draft, createdAt: Date.UTC(2026, 1, 20) }, { now: NOW })?.createdAt,
    ).toBe(Date.UTC(2026, 1, 20));
    for (const createdAt of [0, -1, 'yesterday', Number.NaN, Date.UTC(2031, 0, 1)]) {
      expect(parseGuestDraft({ ...draft, createdAt }, { now: NOW })?.createdAt).toBe(NOW);
    }
  });
});

describe('isSameWish', () => {
  it('ignores whitespace and case', () => {
    expect(isSameWish('每週跑三次', ' 每週 跑三次 ')).toBe(true);
    expect(isSameWish('Run three times', 'run three times')).toBe(true);
  });

  it('keeps different 願望 apart, and treats blanks as different', () => {
    expect(isSameWish('每週跑三次', '每週跑兩次')).toBe(false);
    expect(isSameWish('', '')).toBe(false);
  });
});

describe('planGuestMerge', () => {
  it('moves the draft into an empty account', () => {
    expect(planGuestMerge(draft, [])).toEqual({ action: 'import', draft });
  });

  it('does nothing when there is no draft', () => {
    expect(planGuestMerge(null, [])).toEqual({ action: 'skip', reason: 'no-draft' });
  });

  it('is idempotent: moving the same 願望 twice adds nothing', () => {
    const existing = [{ id: 'm1', wish: ' 每週 跑三次', createdAt: NOW }];
    expect(planGuestMerge(draft, existing)).toEqual({
      action: 'skip',
      reason: 'already-in-account',
      existingId: 'm1',
    });
  });

  it('never overwrites a 顯化 the account already has', () => {
    const existing = [{ id: 'm1', wish: '每天寫三行筆記', createdAt: NOW }];
    expect(planGuestMerge(draft, existing)).toEqual({
      action: 'skip',
      reason: 'account-not-empty',
    });
  });

  it('defaults to an empty account when none is passed', () => {
    expect(planGuestMerge(draft)).toEqual({ action: 'import', draft });
  });
});
