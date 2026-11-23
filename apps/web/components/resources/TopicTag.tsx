import type { ResourceTopic } from '@clearpath/core';

/** A static, non-interactive topic label — the chip look without the behaviour. */
export function TopicTag({ topic }: { topic: ResourceTopic }) {
  return (
    <span className="inline-flex items-center rounded-full border border-graph-blue/35 bg-paper-2 px-3 py-1 text-[0.8125rem] leading-none text-ink-muted">
      {topic}
    </span>
  );
}

export default TopicTag;
