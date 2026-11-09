// Wording review sheet for Abby: every Chinese text on the site, English | Simplified | Traditional (as converted).
// Run after a build: `npm run build && node scripts/zh-hant-review.mjs` → docs/review/zh-hant-wording.csv
// Abby writes corrections in the last column; they go into src/i18n/zh-hant-fixes.json ("fixes").
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toHant } from './zh-hant.mjs';
import { services, priceWords } from '../src/data/services.ts';
import { common, homeFaq } from '../src/i18n/common.ts';
import { bookingStrings } from '../src/i18n/booking.ts';
import { serviceStrings } from '../src/i18n/service.ts';
import { serviceContent } from '../src/data/service-content.ts';
import * as photoData from '../src/data/photos.ts';
import { linkText } from '../functions/c/[code].ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const out = join(root, 'docs/review/zh-hant-wording.csv');

const han = (s) => /\p{Script=Han}/u.test(s);
const decode = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const text = (html) => decode(String(html).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const rows = []; // { area, en, zh }
const seen = new Set();
const add = (area, en, zh) => {
  const z = text(zh);
  if (!han(z) || seen.has(z)) return;
  seen.add(z);
  rows.push({ area, en: text(en ?? ''), zh: z, hant: text(toHant(String(zh))) });
};
/** Same-shaped en and zh values → one row per Chinese string. */
const pair = (area, en, zh) => {
  if (typeof zh === 'string') return add(area, typeof en === 'string' ? en : '', zh);
  if (Array.isArray(zh)) return zh.forEach((z, i) => pair(area, en?.[i], z));
  if (zh && typeof zh === 'object') for (const k of Object.keys(zh)) pair(area, en?.[k], zh[k]);
};
/** Every { en, zh } pair inside `data`. */
const pairsIn = (area, data, done = new Set()) => {
  if (!data || typeof data !== 'object' || done.has(data)) return;
  done.add(data);
  if ('en' in data && 'zh' in data) return pair(area, data.en, data.zh);
  for (const v of Object.values(data)) pairsIn(area, v, done);
};

// 1. Pages: title and description (from the built pages)
const page = (path) => {
  const f = join(dist, path, 'index.html');
  return existsSync(f) ? readFileSync(f, 'utf8') : '';
};
const meta = (html) => ({
  title: decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
  description: decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
});
const pagePaths = ['', 'book', 'privacy', ...services.map((s) => s.slug)];
const pageName = (p) => (p === '' ? '首页' : p === 'book' ? '预约页' : p === 'privacy' ? '隐私政策' : `服务页 ${services.find((s) => s.slug === p).name.zh}`);
for (const p of pagePaths) {
  const en = meta(page(p)), zh = meta(page(`zh/${p}`));
  add(`${pageName(p)} · 网页标题`, en.title, zh.title);
  add(`${pageName(p)} · 搜索结果描述`, en.description, zh.description);
}

// 2. Text tables
pairsIn('全站通用（菜单、首页各区块、页脚）', common);
pairsIn('首页 · 常见问题', homeFaq);
for (const s of services) pairsIn(`服务与价格 · ${s.name.zh}`, s);
pairsIn('价格写法', priceWords);
pairsIn('预约页与预约消息', bookingStrings);
pairsIn('服务页通用', serviceStrings);
for (const s of services) pair(`服务页 ${s.name.zh} · 正文`, serviceContent(s.id, 'en'), serviceContent(s.id, 'zh'));
pairsIn('照片与视频说明', Object.values(photoData).filter((v) => v && typeof v === 'object'));

pair('日历链接失效时的页面（只有 Abby 看到）', linkText.down.en, linkText.down.zh);
pair('日历链接失效时的页面（只有 Abby 看到）', linkText.expired(24).en, linkText.expired(24).zh);

// 3. Everything else shown on the Simplified pages (written inside page components): no English column.
const segments = (html) => {
  const body = html.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/g, '');
  const attrs = [...body.matchAll(/\b(?:alt|aria-label|title|placeholder)="([^"]*)"/g)].map((m) => m[1]);
  return [...body.split(/<[^>]+>/), ...attrs].map((s) => decode(s).replace(/\s+/g, ' ').trim()).filter((s) => han(s) && !/^(简|简体中文|繁|繁體中文)$/.test(s)); // the switcher's language names
};
const templates = rows.map((r) => new RegExp(`^${r.zh.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{\w+\\?\}|\{\w+\}/g, '.*?')}$`));
const covered = (s) => seen.has(s) || rows.some((r) => r.zh.includes(s)) || templates.some((re) => re.test(s));
for (const p of [...pagePaths, '404']) {
  const html = p === '404' ? readFileSync(join(dist, '404.html'), 'utf8').replace(/<div[^>]*data-hant[\s\S]*?<\/div>/, '') : page(`zh/${p}`);
  for (const s of segments(html)) if (!covered(s)) add(`页面上的其他文字 · ${p === '404' ? '找不到页面 (404)' : pageName(p)}`, '', s);
}

// 4. Write the sheet (UTF-8 with BOM so Excel and Numbers read the Chinese)
const csv = (v) => `"${String(v).replace(/"/g, '""')}"`;
const header = ['编号', '位置', 'English', '简体中文（现在的网站）', '繁體中文（自動轉換）', '和简体一样？', 'Abby 的修改（不需要改就留空）'];
const lines = rows.map((r, i) => [i + 1, r.area, r.en, r.zh, r.hant, r.zh === r.hant ? '一样' : '', ''].map(csv).join(','));
mkdirSync(join(root, 'docs/review'), { recursive: true });
writeFileSync(out, '﻿' + [header.map(csv).join(','), ...lines].join('\n') + '\n');
console.log(`zh-hant-review: ${rows.length} rows → ${out.replace(root, '')}`);

// 5. The same rows as Markdown, readable on GitHub (also on a phone). Throwaway: delete it after Abby's review.
const cell = (v) => String(v).replace(/\|/g, '\\|') || ' ';
const areas = [...new Set(rows.map((r) => r.area.split(' · ')[0]))];
const md = [
  '# 繁體中文用詞審核（臨時文件）',
  '',
  '> 給 Abby：請只看 **繁體** 一欄。用詞不對的，在最後一欄寫出正確的寫法（或把編號和正確寫法發給我們）；沒問題的不用寫。',
  '> 簡體和英文只是對照。`{phone}` 這類括號是網站自動填入的內容（電話、價格等），不用改。',
  '> 審核完成、修改寫進 `src/i18n/zh-hant-fixes.json` 後，這個文件會刪除，不會合併到網站。',
  '',
  `共 ${rows.length} 條，按頁面分組：`,
  '',
  ...areas.map((a) => `- [${a}](#${a.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').trim().replace(/ /g, '-')})（${rows.filter((r) => r.area.split(' · ')[0] === a).length} 條）`),
  '',
  ...areas.flatMap((a) => [
    `## ${a}`,
    '',
    '| 編號 | 繁體（自動轉換） | 简体（现在的网站） | English | 位置 | Abby 的修改 |',
    '|---:|---|---|---|---|---|',
    ...rows.map((r, i) => ({ ...r, n: i + 1 })).filter((r) => r.area.split(' · ')[0] === a)
      .map((r) => `| ${r.n} | ${cell(r.hant)} | ${cell(r.zh)} | ${cell(r.en)} | ${cell(r.area.split(' · ').slice(1).join(' · '))} | |`),
    '',
  ]),
].join('\n');
const mdOut = out.replace(/\.csv$/, '.md');
writeFileSync(mdOut, md);
console.log(`zh-hant-review: → ${mdOut.replace(root, '')} (throwaway, for Abby's review)`);
