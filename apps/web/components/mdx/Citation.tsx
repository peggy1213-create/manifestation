import { getTranslations } from 'next-intl/server';

/**
 * An inline citation — (作者, 年) — linking down to the 參考文獻 block, where the
 * full entry and its DOI live. The URL is deliberately not repeated here: the
 * article's frontmatter is the single source for references.
 *
 * Half-width brackets, because what they enclose is Latin; and the citation is
 * allowed to wrap, because a long author list does not fit on one line at
 * 375px and would otherwise push the whole page sideways.
 */
export async function Citation({ author, year }: { author: string; year: number }) {
  const t = await getTranslations('mdx');

  return (
    <a
      href="#references"
      className="font-latin text-[0.9em] text-blue-text underline decoration-graph-blue/40 decoration-1 underline-offset-2 hover:decoration-graph-blue"
      aria-label={t('citationAriaLabel', { author, year })}
    >
      ({author}, {year})
    </a>
  );
}

export default Citation;
