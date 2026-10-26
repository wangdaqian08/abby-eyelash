#!/usr/bin/env node
// Post-build SEO/GEO checks over a built dist dir (docs/GEO-STRATEGY.md #1, #3, #5, #11–#15).
// Usage: node scripts/check-seo.mjs [distDir=dist]   — exits 1 with a report if anything fails.
// shortcut: regex HTML parsing — fine for Astro's predictable output; switch to a real parser if checks get flaky.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] ?? 'dist';
// Required by GEO-STRATEGY #3 + D2 (kept independent of src/pages/robots.txt.ts on purpose).
const BOTS = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Applebot', 'Applebot-Extended', 'Google-Extended', 'CCBot'];
const BANNED_TYPES = ['FAQPage', 'AggregateRating', 'Review'];
const BANNED_ROBOTS = /nosnippet|noarchive|nocache|max-snippet/i;

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const read = (f) => readFileSync(f, 'utf8');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1];
const tags = (html, re) => [...html.matchAll(re)].map((m) => m[0]);
const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
/** URL pathname → built file, or undefined. */
const fileFor = (pathname) =>
  [join(dist, pathname, 'index.html'), join(dist, pathname.replace(/\/$/, '') + '.html')].find((f) => existsSync(f));

if (!existsSync(dist)) { console.error(`dist dir not found: ${dist}`); process.exit(2); }

// ---- collect pages
const pages = walk(dist).filter((f) => f.endsWith('.html')).map((file) => {
  const html = read(file);
  const rel = '/' + relative(dist, file).replace(/index\.html$/, '').replace(/\.html$/, '');
  const robots = tags(html, /<meta\s[^>]*name="(robots|googlebot|bingbot)"[^>]*>/gi).map((t) => attr(t, 'content') ?? '');
  return {
    file, rel, html, robots,
    noindex: robots.some((r) => /noindex/i.test(r)),
    canonicals: tags(html, /<link\s[^>]*rel="canonical"[^>]*>/gi).map((t) => attr(t, 'href')),
    alternates: Object.fromEntries(tags(html, /<link\s[^>]*rel="alternate"[^>]*hreflang[^>]*>/gi).map((t) => [attr(t, 'hreflang'), attr(t, 'href')])),
    lang: html.match(/<html[^>]*\blang="([^"]*)"/i)?.[1],
    title: decode(html.match(/<title>([^<]*)<\/title>/i)?.[1]),
    description: decode(attr(tags(html, /<meta\s[^>]*name="description"[^>]*>/gi)[0] ?? '', 'content')),
    ogImage: attr(tags(html, /<meta\s[^>]*property="og:image"[^>]*>/gi)[0] ?? '', 'content'),
    jsonld: [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]),
  };
});
const indexable = pages.filter((p) => !p.noindex);
const byCanonical = new Map(indexable.map((p) => [p.canonicals[0], p]));

// ---- per-page checks
for (const p of pages) {
  const at = p.rel;
  const wantLang = /^\/zh(\/|$)/.test(at) ? 'zh-Hans' : 'en-AU';
  if (p.lang !== wantLang) fail(at, `html lang="${p.lang}", expected "${wantLang}"`);
  if (!p.title) fail(at, 'missing <title>');
  else if ([...p.title].length > 60) fail(at, `title is ${[...p.title].length} chars (>60): "${p.title}"`);
  if (!p.description) fail(at, 'missing meta description');
  else if ([...p.description].length > 160) fail(at, `description is ${[...p.description].length} chars (>160)`);
  for (const r of p.robots) if (BANNED_ROBOTS.test(r)) fail(at, `snippet-limiting robots directive "${r}"`);
  if (p.ogImage) {
    const u = new URL(p.ogImage, 'http://x');
    if (!/^https?:\/\//.test(p.ogImage)) fail(at, `og:image not absolute: ${p.ogImage}`);
    else if (!existsSync(join(dist, decodeURIComponent(u.pathname)))) fail(at, `og:image file missing in dist: ${u.pathname}`);
  } else if (!p.noindex) fail(at, 'missing og:image');

  for (const raw of p.jsonld) {
    let data;
    try { data = JSON.parse(raw); } catch (e) { fail(at, `JSON-LD does not parse: ${e.message}`); continue; }
    const s = JSON.stringify(data);
    for (const t of BANNED_TYPES) if (s.includes(`"${t}"`)) fail(at, `JSON-LD contains banned type ${t}`);
    if (/"(aggregateRating|review)":/.test(s)) fail(at, 'JSON-LD contains aggregateRating/review property');
    if (data['@context'] !== 'https://schema.org') fail(at, 'JSON-LD @context is not https://schema.org');
  }

  if (p.noindex) continue;
  if (p.canonicals.length !== 1) { fail(at, `${p.canonicals.length} canonical links (expected 1)`); continue; }
  const canon = new URL(p.canonicals[0]);
  if (fileFor(canon.pathname) !== p.file) fail(at, `canonical ${canon.href} does not point to this page`);
  if (!p.jsonld.length) fail(at, 'no JSON-LD');
  for (const hl of ['en-AU', 'zh-Hans', 'x-default']) {
    const href = p.alternates[hl];
    if (!href) { fail(at, `missing hreflang ${hl}`); continue; }
    const target = byCanonical.get(href);
    if (!target) { fail(at, `hreflang ${hl} → ${href} is not a built indexable page`); continue; }
    if (hl !== 'x-default' && target.alternates[p.lang] !== p.canonicals[0])
      fail(at, `hreflang ${hl} → ${href} does not link back (not reciprocal)`);
  }
  if (p.alternates['x-default'] !== p.alternates['en-AU']) fail(at, 'x-default should point to the EN page');
}

// ---- uniqueness
for (const key of ['title', 'description']) {
  const seen = new Map();
  for (const p of indexable) if (p[key]) seen.set(p[key], [...(seen.get(p[key]) ?? []), p.rel]);
  for (const [v, where] of seen) if (where.length > 1) fail(where.join(', '), `duplicate ${key} "${v}"`);
}

// ---- robots.txt
const robotsFile = join(dist, 'robots.txt');
let sitemapUrl;
if (!existsSync(robotsFile)) fail('robots.txt', 'missing');
else {
  const txt = read(robotsFile);
  const groups = txt.split(/\n\s*\n/);
  for (const bot of ['*', ...BOTS]) {
    const g = groups.find((g) => g.split('\n').some((l) => l.trim().toLowerCase() === `user-agent: ${bot.toLowerCase()}`));
    if (!g) fail('robots.txt', `no group for ${bot}`);
    else if (!/^Allow:\s*\/\s*$/m.test(g) || /^Disallow:\s*\/\s*$/m.test(g)) fail('robots.txt', `${bot} is not allowed /`);
  }
  sitemapUrl = txt.match(/^Sitemap:\s*(\S+)/m)?.[1];
  if (!sitemapUrl) fail('robots.txt', 'no Sitemap: line');
}

// ---- sitemap
const sitemapLocs = new Map(); // loc → lastmod
const indexFile = join(dist, 'sitemap-index.xml');
if (!existsSync(indexFile)) fail('sitemap', 'sitemap-index.xml missing');
else {
  if (sitemapUrl && new URL(sitemapUrl).pathname !== '/sitemap-index.xml') fail('robots.txt', `Sitemap line ${sitemapUrl} is not /sitemap-index.xml`);
  for (const [, loc] of read(indexFile).matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const f = join(dist, new URL(loc).pathname);
    if (!existsSync(f)) { fail('sitemap', `child sitemap missing: ${loc}`); continue; }
    for (const [, body] of read(f).matchAll(/<url>([\s\S]*?)<\/url>/g))
      sitemapLocs.set(body.match(/<loc>([^<]+)<\/loc>/)[1], body.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]);
  }
  for (const p of indexable) {
    const c = p.canonicals[0];
    if (c && !sitemapLocs.has(c)) fail('sitemap', `indexable page missing: ${c}`);
    // lastmod must be the page's real dateModified (or absent) — never build time.
    const modified = p.jsonld.join('').match(/"dateModified":"([^"]+)"/)?.[1];
    const lastmod = sitemapLocs.get(c);
    if (lastmod && (!modified || !lastmod.startsWith(modified))) fail('sitemap', `${c} lastmod ${lastmod} ≠ dateModified ${modified ?? '(none)'}`);
  }
  for (const loc of sitemapLocs.keys()) {
    const page = pages.find((p) => p.file === fileFor(new URL(loc).pathname));
    if (!page) fail('sitemap', `URL has no built page: ${loc}`);
    else if (page.noindex) fail('sitemap', `noindex page listed: ${loc}`);
  }
}

// ---- report
console.log(`check-seo: ${dist}`);
console.log(`  pages: ${pages.length} (${indexable.length} indexable, ${pages.length - indexable.length} noindex)`);
for (const p of pages) console.log(`   ${p.noindex ? '·' : '✓'} ${p.rel}  [${p.lang}]  "${p.title}"`);
console.log(`  robots.txt bots required: ${BOTS.length}; sitemap URLs: ${sitemapLocs.size}`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('\n✓ all SEO checks passed');
