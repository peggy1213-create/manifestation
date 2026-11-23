/**
 * Builds `lib/resources/generated.ts` from the MDX files in `content/resources`.
 *
 * Why generate instead of reading the directory at request time: the app runs on
 * Cloudflare Workers, where there is no filesystem to read `content/` from. This
 * script runs in Node before `next dev`, `next build`, `tsc` and `eslint`, so the
 * article index is an ordinary TypeScript module that the bundler can see, and
 * nothing touches `fs` at runtime.
 *
 * It validates the shape of every frontmatter block and counts reading units, but
 * it deliberately holds no product rules: which topics exist is enforced by the
 * `ResourceTopic` union at compile time, and whether drafts are shown is decided
 * by `draftsVisible()` in @clearpath/core.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { ogCharset } from './og-charset.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(here, '..', 'content', 'resources');
const OUT_FILE = resolve(here, '..', 'lib', 'resources', 'generated.ts');

/** `content/resources/woop.mdx` -> the import specifier used from lib/resources. */
const importSpecifier = (slug) => `../../content/resources/${slug}.mdx`;

const fail = (file, message) => {
  throw new Error(`${join('content', 'resources', file)}: ${message}`);
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requireString(data, key, file) {
  const value = data[key];
  if (typeof value !== 'string' || value.trim() === '') {
    fail(file, `frontmatter "${key}" must be a non-empty string`);
  }
  return value.trim();
}

function requireIsoDate(data, key, file) {
  const value = data[key];
  // A bare YAML date is parsed into a Date by js-yaml; accept both spellings.
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (typeof text !== 'string' || !ISO_DATE.test(text)) {
    fail(file, `frontmatter "${key}" must be a YYYY-MM-DD date, got ${JSON.stringify(value)}`);
  }
  if (Number.isNaN(Date.parse(text))) fail(file, `frontmatter "${key}" is not a real date`);
  return text;
}

function requireReferences(data, file) {
  const value = data.references;
  if (!Array.isArray(value) || value.length === 0) {
    fail(file, 'frontmatter "references" must be a non-empty list');
  }
  return value.map((entry, index) => {
    const where = `references[${index}]`;
    if (entry === null || typeof entry !== 'object') fail(file, `${where} must be a mapping`);
    const year = typeof entry.year === 'number' ? entry.year : Number(entry.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      fail(file, `${where}.year must be a four-digit year, got ${JSON.stringify(entry.year)}`);
    }
    for (const key of ['author', 'title', 'url']) {
      if (typeof entry[key] !== 'string' || entry[key].trim() === '') {
        fail(file, `${where}.${key} must be a non-empty string`);
      }
    }
    if (!/^https?:\/\//.test(entry.url)) fail(file, `${where}.url must be an http(s) URL`);
    return {
      author: entry.author.trim(),
      year,
      title: entry.title.trim(),
      url: entry.url.trim(),
    };
  });
}

/**
 * Reading units in the body: one per CJK character, one per run of Latin letters
 * or digits. Markdown and JSX syntax, code blocks, URLs and import/export lines
 * are stripped first so they do not inflate the count.
 */
function countReadingUnits(body) {
  const prose = body
    .replace(/^\s*(?:import|export)\s[^\n]*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_~|=-]/g, ' ');
  const cjk = prose.match(/[㐀-䶿一-鿿豈-﫿぀-ヿ]/g) ?? [];
  const latin = prose.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [];
  return cjk.length + latin.length;
}

function readArticles() {
  let files;
  try {
    files = readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.mdx'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return files.sort().map((file) => {
    const slug = file.replace(/\.mdx$/, '');
    if (!SLUG.test(slug)) {
      fail(file, 'filename must be a lowercase, hyphen-separated slug');
    }

    const { data, content } = matter(readFileSync(join(CONTENT_DIR, file), 'utf8'));

    if (data.slug !== undefined && data.slug !== slug) {
      fail(file, `frontmatter "slug" (${data.slug}) must match the filename`);
    }
    if (data.draft !== undefined && typeof data.draft !== 'boolean') {
      fail(file, 'frontmatter "draft" must be true or false');
    }
    if (
      data.exercise !== undefined &&
      data.exercise !== null &&
      !(typeof data.exercise === 'string' && data.exercise.startsWith('/'))
    ) {
      fail(file, 'frontmatter "exercise" must be an absolute app route, e.g. /workspace/woop');
    }

    const published = requireIsoDate(data, 'published', file);
    const reviewed = requireIsoDate(data, 'reviewed', file);
    if (reviewed < published) {
      fail(file, `"reviewed" (${reviewed}) is earlier than "published" (${published})`);
    }

    return {
      slug,
      title: requireString(data, 'title', file),
      summary: requireString(data, 'summary', file),
      topic: requireString(data, 'topic', file),
      published,
      reviewed,
      references: requireReferences(data, file),
      exercise: typeof data.exercise === 'string' ? data.exercise : null,
      draft: data.draft === true,
      charCount: countReadingUnits(content),
    };
  });
}

function render(articles) {
  const metas = articles
    .map(
      (a) => `  {
    slug: ${JSON.stringify(a.slug)},
    title: ${JSON.stringify(a.title)},
    summary: ${JSON.stringify(a.summary)},
    topic: ${JSON.stringify(a.topic)},
    published: ${JSON.stringify(a.published)},
    reviewed: ${JSON.stringify(a.reviewed)},
    exercise: ${a.exercise === null ? 'null' : JSON.stringify(a.exercise)},
    draft: ${a.draft},
    charCount: ${a.charCount},
    references: [
${a.references
  .map(
    (r) =>
      `      { author: ${JSON.stringify(r.author)}, year: ${r.year}, title: ${JSON.stringify(
        r.title,
      )}, url: ${JSON.stringify(r.url)} },`,
  )
  .join('\n')}
    ],
  },`,
    )
    .join('\n');

  const bodies = articles
    .map(
      (a) =>
        `  ${JSON.stringify(a.slug)}: () => import(${JSON.stringify(importSpecifier(a.slug))}),`,
    )
    .join('\n');

  return `// AUTO-GENERATED by scripts/generate-resources.mjs — do not edit by hand.
// Run \`pnpm --filter web generate:resources\` (or any of dev/build/lint/typecheck).
import type { ResourceMeta } from '@clearpath/core';
import type { ComponentType } from 'react';
import type { MDXComponents } from 'mdx/types';

/**
 * Frontmatter for every article in content/resources, including drafts.
 * Call \`allResources()\` in lib/resources instead of reading this directly — it
 * applies the draft-visibility rule from @clearpath/core.
 *
 * An invalid \`topic\` fails \`tsc\` here, because ResourceMeta['topic'] is a union
 * of the four published topics.
 */
export const GENERATED_RESOURCES: readonly ResourceMeta[] = [
${metas}
];

/** Lazily-loaded MDX body for each slug, keyed exactly as above. */
export const RESOURCE_BODIES: Readonly<
  Record<string, () => Promise<{ default: ComponentType<{ components?: MDXComponents }> }>>
> = {
${bodies}
};
`;
}

/**
 * The Open Graph images are drawn with a committed font subset (see
 * scripts/build-og-font.mjs). If an article title introduces a character the
 * subset does not cover, satori would silently draw a blank box — so fail here
 * instead, with the command that fixes it.
 */
function checkOgFontCoverage() {
  const charsetFile = resolve(here, '..', 'assets', 'fonts', 'og-charset.txt');
  let covered;
  try {
    covered = new Set(readFileSync(charsetFile, 'utf8').replace(/\n/g, ''));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new Error('assets/fonts/og-charset.txt is missing. Run: pnpm --filter web build:og-font');
  }

  const missing = [...ogCharset()].filter((char) => !covered.has(char));
  if (missing.length > 0) {
    throw new Error(
      `The Open Graph font subset is missing ${missing.length} character(s): ${missing.join('')}\n` +
        'Run: pnpm --filter web build:og-font',
    );
  }
}

const articles = readArticles();
checkOgFontCoverage();
mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, render(articles), 'utf8');

const drafts = articles.filter((a) => a.draft).length;
console.log(
  `generate-resources: ${articles.length} article(s)` +
    (drafts > 0 ? `, ${drafts} marked draft` : '') +
    ` -> lib/resources/generated.ts`,
);
