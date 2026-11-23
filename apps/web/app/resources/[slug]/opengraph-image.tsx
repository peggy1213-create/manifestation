import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { color } from '@clearpath/tokens';
import { allResources, findResource } from '@/lib/resources';
import { SITE_NAME } from '@/lib/site';

export const dynamic = 'error';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = SITE_NAME;

/**
 * An image file in a dynamic segment does not inherit the page's params, so the
 * same list is declared here to get one PNG prerendered per article.
 */
export function generateStaticParams() {
  return allResources().map((article) => ({ slug: article.slug }));
}

/**
 * Per-article Open Graph image, drawn in the Lab notebook style: paper ground,
 * faint graph-paper grid, a notebook margin line, the topic, the title, and a
 * highlighter swipe under the wordmark.
 *
 * Always light, never dark: the image is shown inside other people's apps,
 * where our dark mode has no meaning.
 *
 * The font is the committed subset built by scripts/build-og-font.mjs. Both are
 * read at build time only — every one of these images is prerendered.
 */
const FONT_DIR = join(process.cwd(), 'assets', 'fonts');

const loadFont = (weight: 400 | 700) => readFile(join(FONT_DIR, `noto-sans-tc-og-${weight}.ttf`));

const ink = color.light.ink;
const paper = color.light.paper;

/** Rough advance width per character: CJK is about one em, Latin about 0.58. */
function titleSize(title: string): number {
  const ems = [...title].reduce(
    (sum, char) => sum + (/[\u3000-\u9FFF\uF900-\uFAFF]/.test(char) ? 1 : 0.58),
    0,
  );
  const contentWidth = size.width - 12 - 72 * 2;
  // Prefer the largest size that keeps the title within two lines.
  for (const candidate of [72, 68, 62, 56, 50]) {
    if (ems * candidate <= contentWidth * 2) return candidate;
  }
  return 44;
}

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = findResource(slug);
  if (!article) notFound();

  const [regular, bold] = await Promise.all([loadFont(400), loadFont(700)]);

  /**
   * The graph-paper grid is drawn as explicit 1px rules rather than a
   * repeating-linear-gradient, because satori flattens repeating gradients into
   * a single averaged wash instead of discrete lines.
   */
  const GRID = 48;
  const gridLine = 'rgba(20,33,61,0.07)';
  const verticals = Array.from({ length: Math.floor(size.width / GRID) }, (_, i) => (i + 1) * GRID);
  const horizontals = Array.from(
    { length: Math.floor(size.height / GRID) },
    (_, i) => (i + 1) * GRID,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          backgroundColor: paper,
          color: ink,
          fontFamily: 'Noto Sans TC',
        }}
      >
        {verticals.map((x) => (
          <div
            key={`v${x}`}
            style={{
              position: 'absolute',
              left: x,
              top: 0,
              width: 1,
              height: size.height,
              backgroundColor: gridLine,
            }}
          />
        ))}
        {horizontals.map((y) => (
          <div
            key={`h${y}`}
            style={{
              position: 'absolute',
              left: 0,
              top: y,
              width: size.width,
              height: 1,
              backgroundColor: gridLine,
            }}
          />
        ))}

        {/* The notebook margin line. */}
        <div
          style={{
            width: 12,
            height: '100%',
            backgroundColor: color.light.graphBlue,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 72px',
            flex: 1,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                border: `2px solid ${color.light.graphBlue}`,
                borderRadius: 999,
                padding: '8px 22px',
                fontSize: 28,
                color: color.light.blueText,
              }}
            >
              {article.topic}
            </div>
            <div
              style={{
                marginTop: 36,
                // Stepped down by length so a short title stays on one line
                // and a long one wraps to two, inside the 1044px content box.
                fontSize: titleSize(article.title),
                fontWeight: 700,
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}
            >
              {article.title}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', fontSize: 30 }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: color.light.highlighter,
                color: ink,
                padding: '6px 14px',
                borderRadius: 3,
                fontWeight: 700,
              }}
            >
              {SITE_NAME}
            </div>
            <div style={{ display: 'flex', marginLeft: 20, color: color.light.inkMuted }}>
              {article.reviewed}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Noto Sans TC', data: regular, weight: 400, style: 'normal' },
        { name: 'Noto Sans TC', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );
}
