import { describe, expect, it } from 'vitest';
import { mentionsSelfHarm } from './index';

describe('mentionsSelfHarm', () => {
  it('notices 中文 wording about hurting oneself', () => {
    for (const text of [
      '我最近常常想死',
      '有時候覺得活不下去',
      '我怕自己會傷害自己',
      '想過自殘',
      '覺得一死了之比較輕鬆',
    ]) {
      expect(mentionsSelfHarm(text)).toBe(true);
    }
  });

  it('notices English wording too', () => {
    expect(mentionsSelfHarm('I think about suicide')).toBe(true);
    expect(mentionsSelfHarm('self harm')).toBe(true);
    expect(mentionsSelfHarm('I want to kill myself')).toBe(true);
  });

  it('reads every field together', () => {
    expect(mentionsSelfHarm('每週運動三次', '', '最近常常不想活')).toBe(true);
  });

  it('stays quiet for ordinary writing', () => {
    expect(mentionsSelfHarm('每週運動三次，讓身體有力氣')).toBe(false);
    expect(mentionsSelfHarm('下班後太累，會直接躺在沙發上')).toBe(false);
    expect(mentionsSelfHarm('')).toBe(false);
  });
});
