#!/usr/bin/env node
// Go-live gate: every "before production" reminder, one line each. Exits 1 while any BLOCK remains.
// Usage: npm run check:go-live. New reminder → add a check() (code-checkable) or a `manual` line (outside the code).
import { readFileSync, existsSync } from 'node:fs';

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
const site = read('src/data/site.ts');
const photos = read('src/data/photos.ts');
const checks = [];
// level: BLOCK = must be fixed in code before launch; WARN = needs Abby's answer or material (or her OK to leave it).
const check = (level, id, failing, todo) => checks.push({ level, id, failing, todo });

check('BLOCK', 'about-photos', /placeholder-about-\d\.jpg/.test(read('src/components/home/About.astro')),
  'Home "About" shows 3 stock photos → real photos of Abby / the studio (src/assets/home/placeholder-about-1..3.jpg).');
check('BLOCK', 'dummy-reviews', /dummy:\s*true/.test(read('src/data/reviews.ts')),
  'Reviews are made up (illegal to publish as real) → real Google reviews in src/data/reviews.ts, or remove the section.');
check('BLOCK', 'ab-test-split', /bPercent:\s*0\b/.test(read('src/data/ab-test.ts')),
  'Style A/B test is off → set bPercent: 50 in src/data/ab-test.ts (checklist J).');
check('BLOCK', 'domain', /pages\.dev/.test(process.env.SITE_URL ?? read('astro.config.mjs')),
  'SITE_URL is still pages.dev → build with SITE_URL=https://www.abbyeyelashes.com.');

check('WARN', 'privacy-notice', !existsSync('src/pages/privacy.astro') && !existsSync('src/pages/privacy'),
  'No privacy notice, yet GA4 cookies + booking form collect personal data → decide with Abby (checklist A, OAIC link).');
check('WARN', 'google-business-profile', /reviewsUrl:\s*''/.test(site) || /mapsEmbed:\s*''/.test(site),
  'No Google Business Profile → create it, then set reviewsUrl and mapsEmbed in src/data/site.ts.');
check('WARN', 'xiaohongshu', /xiaohongshu:\s*''/.test(site),
  'No 小红书 link → set site.social.xiaohongshu in src/data/site.ts (footer icon appears by itself).');
check('WARN', 'abby-facts', /yearsExperience:\s*0/.test(site) && /certifications:\s*\[\]/.test(site),
  'About shows no years of experience or training → fill site.abby in src/data/site.ts.');
check('WARN', 'classic-full-photo', /optionId:\s*'classic-full',\s*photo:\s*'classic-full-bottom'/.test(photos),
  'Japanese classic · full card uses a photo with bottom lashes (not the same style) → new photo from Abby.');
check('WARN', 'powder-brows-photo', !/'powder-brows'\s*:/.test(photos),
  'Powder-brows page has no photo → add to servicePhotos["powder-brows"] in src/data/photos.ts.');
check('WARN', 'ai-style-guide', /aiLash\(/.test(photos),
  'Lash page shows AI style illustrations → Abby approves them, or replace with real photos.');

// Outside the code: settings and accounts only a person can confirm. [checklist part, item]
const manual = [
  ['D', 'Domain: move DNS from GoDaddy to Cloudflare, bind www.abbyeyelashes.com, bare domain → www.'],
  ['C', 'Cloudflare production vars: SITE_URL, LAUNCH=1, Google Calendar keys set; BOOKING_DEMO deleted.'],
  ['C2', 'Rate-limit rule on /api/ (20 / min / IP).'],
  ['C3', 'Cloudflare Pages → Settings → Runtime: compatibility date 2026-08-04 or later on Production and Preview, or the nodejs_compat flag on. Older without the flag: the whole site fails to start.'],
  ['K', 'Abby: 💗 at the start of every client booking already in her calendar; calendar shared with the service account as "See all event details".'],
  ['E', 'Cloudflare does not block AI crawlers.'],
  ['J', 'A/B test: decision rule agreed (each look ≥ 50 booking_submitted and ≥ 4 weeks, 8 weeks max); content-only changes while it runs.'],
  ['G', 'GA4: style_variant custom dimension (event + user); book_click and booking_submitted as key events.'],
  ['G', 'Google Search Console + Google Business Profile (address, phone, hours identical to the site).'],
  ['H', 'Bing Webmaster Tools + IndexNow key.'],
  ['P', 'Privacy policy promises: two-step sign-in on Abby’s Google and Cloudflare accounts; GA4 data retention set to 14 months.'],
];

const failing = checks.filter((c) => c.failing);
const group = (level, title) => {
  const list = failing.filter((c) => c.level === level);
  if (list.length) console.log(`\n${title} (${list.length})\n${list.map((c) => `  ${level === 'BLOCK' ? '✗' : '!'} ${c.id.padEnd(24)}${c.todo}`).join('\n')}`);
};
console.log('Go-live check');
group('BLOCK', 'BLOCK — fix before launch');
group('WARN', 'WARN — needs Abby (or her OK to leave as is)');
const done = checks.filter((c) => !c.failing).map((c) => c.id);
if (done.length) console.log(`\nDONE (${done.length}): ${done.join(', ')}`);
console.log(`\nBY HAND — docs/DEPLOY-CHECKLIST.md\n${manual.map(([p, t]) => `  □ ${p.padEnd(3)} ${t}`).join('\n')}`);
console.log('\nThen: npm test · LAUNCH=1 npm run build · npm run check:seo · checklist F after deploy.');
process.exit(failing.some((c) => c.level === 'BLOCK') ? 1 : 0);
