#!/usr/bin/env node
/**
 * Copy lint for Clear Path (顯化).
 *
 * Two checks, both from the language rules in CLAUDE.md:
 *
 *  1. Banned words in the message catalogues. The product never says 目標,
 *     達成, KPI, 任務 or 打卡 — it says 願望, 實現, 小行動 and 記下今天.
 *  2. No hard-coded user-facing copy. Any CJK text outside the catalogues
 *     (comments and MDX content aside) is a string that slipped past
 *     next-intl, so it cannot be translated or reviewed in one place.
 *
 * Zero dependencies on purpose: it runs in CI straight after checkout, before
 * anything is built.
 *
 * Usage: node scripts/copy-lint.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

/** Words the product never uses, with the wording to use instead. */
const BANNED = [
  { word: '目標', instead: '願望 / 顯化' },
  { word: '達成', instead: '實現' },
  { word: 'KPI', instead: '足跡' },
  { word: '任務', instead: '小行動' },
  { word: '打卡', instead: '記下今天' },
];

/** Where translated copy is allowed to live. */
const MESSAGE_DIRS = ['apps/web/messages'];

/** Source trees that must not contain hard-coded user-facing copy. */
const SOURCE_DIRS = ['apps/web/app', 'apps/web/components', 'apps/web/lib', 'apps/web/i18n'];

const SKIP_DIRS = new Set(['node_modules', '.next', '.open-next', '.wrangler', '.turbo', 'dist']);

/** Content authored as content, not as UI strings. */
const SOURCE_EXCLUDED = ['apps/web/content'];

const CJK = /[㐀-䶿一-鿿豈-﫿　-〿]/;

const problems = [];

function walk(dir, onFile) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // Directory does not exist yet (e.g. apps/mobile before phase 4).
  }
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, onFile);
    } else if (entry.isFile()) {
      onFile(full);
    }
  }
}

function report(file, line, message) {
  problems.push(`${relative(repoRoot, file)}:${line}  ${message}`);
}

// ---------------------------------------------------------------------------
// 1. Banned words in the message catalogues.
// ---------------------------------------------------------------------------
let catalogues = 0;

for (const dir of MESSAGE_DIRS) {
  walk(resolve(repoRoot, dir), (file) => {
    if (!file.endsWith('.json')) return;
    catalogues += 1;

    const source = readFileSync(file, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      report(file, 1, `不是有效的 JSON: ${error.message}`);
      return;
    }

    const lines = source.split('\n');
    for (const [path, value] of flatten(parsed)) {
      for (const { word, instead } of BANNED) {
        if (!value.includes(word)) continue;
        const line = lines.findIndex((text) => text.includes(value)) + 1;
        report(file, line || 1, `${path} 用了「${word}」，請改用「${instead}」`);
      }
    }
  });
}

if (catalogues === 0) {
  problems.push(`找不到任何訊息檔（預期在 ${MESSAGE_DIRS.join(', ')}）`);
}

/** All string leaves of a message catalogue, as [dotted.path, value] pairs. */
function* flatten(node, prefix = '') {
  if (typeof node === 'string') {
    yield [prefix, node];
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    yield* flatten(value, prefix ? `${prefix}.${key}` : key);
  }
}

// ---------------------------------------------------------------------------
// 2. No hard-coded user-facing copy in the source tree.
// ---------------------------------------------------------------------------
for (const dir of SOURCE_DIRS) {
  walk(resolve(repoRoot, dir), (file) => {
    if (!/\.(tsx?|jsx?|mjs)$/.test(file)) return;
    const rel = relative(repoRoot, file).split(sep).join('/');
    if (SOURCE_EXCLUDED.some((excluded) => rel.startsWith(excluded))) return;

    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (!CJK.test(line)) return;
      report(file, index + 1, '程式碼裡有中文字串，請移到 messages/zh-TW.json');
    });
  });
}

/**
 * Blank out comments and keep line numbering, so Chinese in an explanatory
 * comment is fine while Chinese in a string or in JSX text is not.
 */
function stripComments(source) {
  let out = '';
  let state = 'code'; // code | line | block | single | double | template
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (state === 'code') {
      if (char === '/' && next === '/') {
        state = 'line';
        out += '  ';
        i += 1;
        continue;
      }
      if (char === '/' && next === '*') {
        state = 'block';
        out += '  ';
        i += 1;
        continue;
      }
      if (char === "'") state = 'single';
      else if (char === '"') state = 'double';
      else if (char === '`') state = 'template';
      out += char;
      continue;
    }

    if (state === 'line') {
      if (char === '\n') {
        state = 'code';
        out += '\n';
      } else {
        out += ' ';
      }
      continue;
    }

    if (state === 'block') {
      if (char === '*' && next === '/') {
        state = 'code';
        out += '  ';
        i += 1;
      } else {
        out += char === '\n' ? '\n' : ' ';
      }
      continue;
    }

    // Inside a string: copy through, and leave on the matching quote.
    out += char;
    if (char === '\\') {
      out += source[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (
      (state === 'single' && char === "'") ||
      (state === 'double' && char === '"') ||
      (state === 'template' && char === '`')
    ) {
      state = 'code';
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
if (problems.length > 0) {
  console.error('文案檢查沒通過：\n');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    `\n${problems.length} 個問題。用語規則見 CLAUDE.md；所有使用者看到的文字都放在 messages/zh-TW.json。`,
  );
  process.exit(1);
}

console.log(`文案檢查通過（${catalogues} 個訊息檔）。`);
