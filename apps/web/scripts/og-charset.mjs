/**
 * The exact set of characters an Open Graph image can need to draw: every
 * article title, summary and topic, every string in the zh-TW message
 * catalogue, and printable ASCII.
 *
 * Shared by scripts/build-og-font.mjs (which subsets the font to this set) and
 * scripts/generate-resources.mjs (which checks the committed subset still
 * covers it), so the two can never drift apart.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(here, '..', 'content', 'resources');
const MESSAGES_FILE = resolve(here, '..', 'messages', 'zh-TW.json');

/** Fixed strings drawn onto OG images, independent of any one article. */
export const OG_FIXED_STRINGS = ['Clear Path 顯化', '顯化方法', '想像練習', '習慣', '研究解讀'];

function collectStrings(value, into) {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, into);
  else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, into);
  }
}

/** Every character the OG images may need, as one sorted string. */
export function ogCharset() {
  const strings = [...OG_FIXED_STRINGS];

  // Printable ASCII, so Latin words, digits and punctuation always render.
  for (let code = 0x20; code <= 0x7e; code += 1) strings.push(String.fromCharCode(code));

  // Punctuation common in zh-TW copy that is not derivable from the content.
  strings.push('—·…、。，：；！？（）「」『』《》〈〉／％～’“”');

  let files = [];
  try {
    files = readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.mdx'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const file of files) {
    const { data } = matter(readFileSync(join(CONTENT_DIR, file), 'utf8'));
    for (const key of ['title', 'summary', 'topic']) {
      if (typeof data[key] === 'string') strings.push(data[key]);
    }
  }

  collectStrings(JSON.parse(readFileSync(MESSAGES_FILE, 'utf8')), strings);

  const unique = new Set();
  for (const value of strings) for (const char of value) unique.add(char);
  unique.delete('\n');
  return [...unique].sort().join('');
}
