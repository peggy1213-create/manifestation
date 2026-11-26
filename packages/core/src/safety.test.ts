import { describe, expect, it } from 'vitest';
import { SUPPORT_LINE, mentionsSelfHarm } from './safety';

describe('self-harm mentions', () => {
  it('knows the support line', () => {
    expect(SUPPORT_LINE.number).toBe('1925');
    expect(SUPPORT_LINE.name).toBe('安心專線');
  });

  it('spots zh-TW and English phrasings', () => {
    expect(mentionsSelfHarm('今天很累，有點想死')).toBe(true);
    expect(mentionsSelfHarm('覺得活不下去')).toBe(true);
    expect(mentionsSelfHarm('自殘的念頭又來了')).toBe(true);
    expect(mentionsSelfHarm('I want to die')).toBe(true);
    expect(mentionsSelfHarm('thinking about self harm')).toBe(true);
  });

  it('stays quiet for ordinary notes', () => {
    expect(mentionsSelfHarm('今天走了十分鐘，心情好一些')).toBe(false);
    expect(mentionsSelfHarm('快死了，好累喔，但還是做完了')).toBe(false);
    expect(mentionsSelfHarm('')).toBe(false);
    expect(mentionsSelfHarm(null)).toBe(false);
  });
});
