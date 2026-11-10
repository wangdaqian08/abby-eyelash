// Traditional Chinese, after `astro build` (npm runs this as "postbuild").
// The /zh-hant/ pages are built from the Simplified text (src/lib/hant.ts); this converts them to Taiwan character
// forms (OpenCC cn → tw, characters only, no regional wording), then applies Abby's corrections from
// src/i18n/zh-hant-fixes.json ("as converted" → "as it should read"). Elements marked data-hant on other pages
// (the 404 page's Traditional column) are converted too.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';

const root = fileURLToPath(new URL('..', import.meta.url));
const convert = OpenCC.Converter({ from: 'cn', to: 'tw' });
const wording = JSON.parse(readFileSync(join(root, 'src/i18n/zh-hant-fixes.json'), 'utf8'));
export const fixes = Object.entries(wording.fixes).sort(([a], [b]) => b.length - a.length); // longest first: a phrase fix wins over a fix inside it
const keep = wording.keep;

/** Simplified → Traditional (Taiwan forms), then Abby's corrections. ASCII, HTML and character references pass through. */
export const toHant = (s) => fixes.reduce((t, [from, to]) => t.split(from).join(to), convert(s));

/** A whole /zh-hant/ page: convert, and point links written into the Chinese text (/zh/…) at /zh-hant/. The language
 *  switcher and hreflang links keep their targets (they carry hreflang). */
export const convertPage = (html) =>
  toHant(html)
    .replace(/<a\b(?![^>]*\bhreflang=)([^>]*?)\bhref="\/zh\//g, '<a$1href="/zh-hant/')
    .replace(/<a\b(?![^>]*\bhreflang=)([^>]*?)\bhref="\/zh\/?"/g, '<a$1href="/zh-hant/"');

// shortcut: a data-hant element must not contain an element of its own tag (the 404 column has no nested <div>).
/** Any other page: convert only elements marked data-hant. */
export const convertMarked = (html) =>
  html.replace(/(<(\w+)\b[^>]*\bdata-hant\b[^>]*>)([\s\S]*?)(<\/\2>)/g, (_, open, _tag, inner, close) => open + convertPage(inner) + close);

/** Characters in a converted page that are still Simplified forms (each checked on its own, so phrase-level
 *  differences such as 了解/瞭解 don't count). Character references (&#31616;, the switcher's 简) are not characters here. */
export const simplifiedLeft = (html) => {
  const text = keep.reduce((t, word) => t.split(word).join(''), html); // words in "keep" are correct as written
  return [...new Set([...text].filter((ch) => /\p{Script=Han}/u.test(ch) && convert(ch) !== ch))];
};

const isHant = (rel) => /^(look-b\/)?zh-hant(\/|$)/.test(rel);
const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? htmlFiles(p) : n.endsWith('.html') ? [p] : [];
  });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = join(root, process.argv[2] ?? 'dist');
  const files = htmlFiles(dist).map((p) => relative(dist, p));
  let pages = 0;
  const left = [];
  for (const rel of files) {
    const p = join(dist, rel);
    const html = readFileSync(p, 'utf8');
    const out = isHant(rel) ? convertPage(html) : html.includes('data-hant') ? convertMarked(html) : html;
    if (isHant(rel)) {
      pages++;
      const s = simplifiedLeft(out);
      if (s.length) left.push(`${rel}: ${s.join('')}`);
    }
    if (out !== html) writeFileSync(p, out);
  }
  if (left.length) {
    console.error(`zh-hant: Simplified characters left on Traditional pages (a fix in src/i18n/zh-hant-fixes.json writes them back?)\n  ${left.join('\n  ')}`);
    process.exit(1);
  }
  // Every Simplified page has a Traditional twin, in both looks.
  const missing = files.filter((rel) => /^(look-b\/)?zh\//.test(rel)).map((rel) => rel.replace(/(^|\/)zh\//, '$1zh-hant/')).filter((rel) => !files.includes(rel));
  if (missing.length) {
    console.error(`zh-hant: no Traditional page for ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`zh-hant: converted ${pages} pages (${fixes.length} fixes)`);
}
