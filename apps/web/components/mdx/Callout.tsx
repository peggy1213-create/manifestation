import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

export type CalloutTone = 'note' | 'evidence' | 'caution';

const TONE_CLASS: Record<CalloutTone, string> = {
  // Graph-blue rule for a plain aside.
  note: 'border-graph-blue/50',
  // Evidence asides carry the heavier rule; this is the default voice of the app.
  evidence: 'border-graph-blue',
  // Coral is the one accent per screen, used here as a 2px rule, never as text.
  caution: 'border-coral',
};

const TONE_LABEL_KEY: Record<CalloutTone, 'calloutNote' | 'calloutEvidence' | 'calloutCaution'> = {
  note: 'calloutNote',
  evidence: 'calloutEvidence',
  caution: 'calloutCaution',
};

/**
 * A notebook aside: paper-2 card with a coloured rule down its left edge.
 * `title` overrides the default label for the tone.
 */
export async function Callout({
  tone = 'note',
  title,
  children,
}: {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
}) {
  const t = await getTranslations('mdx');
  const label = title ?? t(TONE_LABEL_KEY[tone]);

  return (
    <aside className={`my-7 rounded-r-cp border-l-[3px] bg-paper-2 px-5 py-4 ${TONE_CLASS[tone]}`}>
      <p className="m-0 mb-1.5 text-sm font-bold tracking-wide text-ink-muted">{label}</p>
      <div className="cp-callout-body text-[0.9375rem] leading-[1.7]">{children}</div>
    </aside>
  );
}

export default Callout;
