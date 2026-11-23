import { describe, expect, it } from 'vitest';
import {
  countByTopic,
  draftsVisible,
  filterByTopic,
  isResourceTopic,
  READING_CHARS_PER_MINUTE,
  readingTimeMinutes,
  resourcePath,
  RESOURCE_TOPICS,
  sortByPublishedDesc,
} from './resources';

describe('isResourceTopic', () => {
  it('accepts the four published topics', () => {
    for (const topic of RESOURCE_TOPICS) expect(isResourceTopic(topic)).toBe(true);
  });

  it('rejects anything else, including goal-flavoured words we never use', () => {
    for (const value of ['目標', 'habits', '', null, undefined, 7, {}]) {
      expect(isResourceTopic(value)).toBe(false);
    }
  });
});

describe('readingTimeMinutes', () => {
  it('rounds up to whole minutes', () => {
    expect(readingTimeMinutes(READING_CHARS_PER_MINUTE)).toBe(1);
    expect(readingTimeMinutes(READING_CHARS_PER_MINUTE + 1)).toBe(2);
    expect(readingTimeMinutes(READING_CHARS_PER_MINUTE * 3)).toBe(3);
  });

  it('never reports less than one minute, whatever it is handed', () => {
    for (const value of [0, 1, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(readingTimeMinutes(value)).toBeGreaterThanOrEqual(1);
    }
  });

  it('puts an 800–1,200 字 article in the 3–4 minute range', () => {
    expect(readingTimeMinutes(800)).toBe(3);
    expect(readingTimeMinutes(1200)).toBe(4);
  });
});

describe('draftsVisible', () => {
  it('hides drafts in a production build with no flag', () => {
    expect(draftsVisible({ nodeEnv: 'production' })).toBe(false);
    expect(draftsVisible({ nodeEnv: 'production', showDrafts: undefined })).toBe(false);
    expect(draftsVisible({ nodeEnv: 'production', showDrafts: '0' })).toBe(false);
    expect(draftsVisible({ nodeEnv: 'production', showDrafts: '' })).toBe(false);
  });

  it('shows drafts while developing and while testing', () => {
    expect(draftsVisible({ nodeEnv: 'development' })).toBe(true);
    expect(draftsVisible({ nodeEnv: 'test' })).toBe(true);
    expect(draftsVisible({})).toBe(true);
  });

  it('shows drafts in production only when a build opts in explicitly', () => {
    expect(draftsVisible({ nodeEnv: 'production', showDrafts: '1' })).toBe(true);
    expect(draftsVisible({ nodeEnv: 'production', showDrafts: 'true' })).toBe(true);
  });
});

const article = (slug: string, topic: (typeof RESOURCE_TOPICS)[number], published: string) => ({
  slug,
  topic,
  published,
});

describe('sortByPublishedDesc', () => {
  const items = [
    article('woop', '顯化方法', '2026-01-10'),
    article('if-then', '顯化方法', '2026-03-01'),
    article('habit', '習慣', '2026-01-10'),
  ];

  it('puts the newest first and breaks ties by slug', () => {
    expect(sortByPublishedDesc(items).map((i) => i.slug)).toEqual(['if-then', 'habit', 'woop']);
  });

  it('does not mutate its input', () => {
    const before = items.map((i) => i.slug);
    sortByPublishedDesc(items);
    expect(items.map((i) => i.slug)).toEqual(before);
  });
});

describe('filterByTopic', () => {
  const items = [
    article('woop', '顯化方法', '2026-01-10'),
    article('imagery', '想像練習', '2026-02-10'),
    article('habit', '習慣', '2026-03-10'),
  ];

  it('returns everything when no topic is chosen', () => {
    expect(filterByTopic(items, null)).toHaveLength(3);
  });

  it('keeps only the chosen topic', () => {
    expect(filterByTopic(items, '習慣').map((i) => i.slug)).toEqual(['habit']);
  });

  it('returns nothing for a topic with no articles', () => {
    expect(filterByTopic(items, '研究解讀')).toEqual([]);
  });
});

describe('countByTopic', () => {
  it('counts every topic, including the empty ones', () => {
    const counts = countByTopic([
      article('woop', '顯化方法', '2026-01-10'),
      article('if-then', '顯化方法', '2026-02-10'),
      article('habit', '習慣', '2026-03-10'),
    ]);
    expect(counts).toEqual({ 顯化方法: 2, 想像練習: 0, 習慣: 1, 研究解讀: 0 });
  });
});

describe('resourcePath', () => {
  it('builds the canonical article path', () => {
    expect(resourcePath('woop')).toBe('/resources/woop');
  });
});
