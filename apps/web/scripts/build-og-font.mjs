/**
 * Builds the small Noto Sans TC subsets used to draw Open Graph images.
 *
 * Open Graph images are rasterised with satori (via `next/og`), which needs a
 * real TTF/OTF — it cannot use the woff2 slices `next/font` serves to browsers,
 * and the full Noto Sans TC TTF is ~7 MB per weight, far too large to commit or
 * to load while rendering. So the two weights are subset down to exactly the
 * characters our own titles and labels use, and the results are committed:
 *
 *   assets/fonts/noto-sans-tc-og-400.ttf
 *   assets/fonts/noto-sans-tc-og-700.ttf
 *   assets/fonts/og-charset.txt      <- what the subsets cover
 *
 * `scripts/generate-resources.mjs` checks every character an OG image needs
 * against og-charset.txt on every build, so a new title that falls outside the
 * subset fails loudly instead of rendering blank boxes. When that happens, run:
 *
 *   pnpm --filter web build:og-font
 *
 * Requirements: Python 3 with fonttools (`pip install fonttools brotli`) and
 * network access to fonts.googleapis.com / fonts.gstatic.com. This is a
 * maintenance script — it is not part of `pnpm build`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ogCharset } from './og-charset.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = resolve(here, '..', 'assets', 'fonts');
const CACHE_DIR = resolve(here, '..', 'node_modules', '.cache', 'clearpath-og-font');
const WEIGHTS = [400, 700];

function cssForWeights() {
  const family = `Noto+Sans+TC:wght@${WEIGHTS.join(';')}`;
  // Requested without a browser User-Agent on purpose: Google Fonts then serves
  // plain TTF sources instead of woff2, which is what satori can parse.
  return fetch(`https://fonts.googleapis.com/css2?family=${family}`, {
    headers: { 'user-agent': 'clearpath-og-font-builder' },
  }).then((response) => {
    if (!response.ok) throw new Error(`Google Fonts CSS: HTTP ${response.status}`);
    return response.text();
  });
}

function parseSources(css) {
  const blocks = css.split('@font-face').slice(1);
  const sources = new Map();
  for (const block of blocks) {
    const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
    const url = /src:\s*url\((https:\/\/[^)]+\.ttf)\)/.exec(block)?.[1];
    if (weight && url) sources.set(weight, url);
  }
  for (const weight of WEIGHTS) {
    if (!sources.has(weight)) throw new Error(`Google Fonts CSS had no TTF for weight ${weight}`);
  }
  return sources;
}

async function download(url, target) {
  if (existsSync(target) && statSync(target).size > 1_000_000) return target;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  return target;
}

const charset = ogCharset();
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(FONT_DIR, { recursive: true });

const charsetFile = join(CACHE_DIR, 'charset.txt');
writeFileSync(charsetFile, charset, 'utf8');

const sources = parseSources(await cssForWeights());

for (const weight of WEIGHTS) {
  const source = await download(sources.get(weight), join(CACHE_DIR, `noto-sans-tc-${weight}.ttf`));
  const output = join(FONT_DIR, `noto-sans-tc-og-${weight}.ttf`);
  execFileSync(
    'pyftsubset',
    [
      source,
      `--output-file=${output}`,
      `--text-file=${charsetFile}`,
      '--layout-features=',
      '--no-hinting',
      '--desubroutinize',
      '--name-IDs=1,2',
      '--drop-tables+=DSIG',
    ],
    { stdio: 'inherit' },
  );
  const kb = Math.round(statSync(output).size / 1024);
  console.log(
    `build-og-font: weight ${weight} -> assets/fonts/noto-sans-tc-og-${weight}.ttf (${kb} kB)`,
  );
}

writeFileSync(join(FONT_DIR, 'og-charset.txt'), `${charset}\n`, 'utf8');
console.log(
  `build-og-font: ${[...charset].length} characters covered -> assets/fonts/og-charset.txt`,
);
