#!/usr/bin/env node
// Go-live gate: checks the code against every "fix before production" reminder.
// Usage: npm run check:go-live   — exits 1 while any BLOCK item remains. Add new reminders here, not in notes.
import { readFileSync, existsSync } from 'node:fs';

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
const checks = [];
/** level: BLOCK = must be fixed before production; WARN = check with the owner before production. */
const check = (level, id, failing, problem, fix) => checks.push({ level, id, failing, problem, fix });

const about = read('src/components/home/About.astro');
check('BLOCK', 'about-photos', /placeholder-about-\d\.jpg/.test(about),
  'Home "About" section still shows 3 Unsplash stock photos.',
  'Replace src/assets/home/placeholder-about-1..3.jpg (imports in src/components/home/About.astro) with real photos of Abby / the studio; update alts in src/i18n/common.ts and docs/IMAGE-PLACEHOLDERS.md.');

const reviews = read('src/data/reviews.ts');
check('BLOCK', 'dummy-reviews', /dummy:\s*true/.test(reviews),
  'Home page reviews are dummy text (illegal to publish as real reviews under Australian Consumer Law).',
  'Paste real Google reviews into src/data/reviews.ts with dummy: false, or remove the Reviews section (the hero rating line in src/components/home/Hero.astro reads reviewSummary too). `LAUNCH=1 npm run build` fails until then.');

const layout = read('src/layouts/BaseLayout.astro');
check('BLOCK', 'theme-preview', /<ThemePreview\b/.test(layout),
  'The pre-launch "Theme preview" switcher is still on every page.',
  'Pick the theme, set it as the default in src/styles/global.css, and remove <ThemePreview /> and the ?theme script from src/layouts/BaseLayout.astro.');

const site = read('src/data/site.ts');
const empty = site.split('\n').filter((l) => /PLACEHOLDER/.test(l) && /:\s*''/.test(l)).map((l) => l.trim().split(':')[0]);
check('WARN', 'site-placeholders', empty.length > 0,
  `Empty PLACEHOLDER values in src/data/site.ts: ${empty.join(', ')}.`,
  'Fill them in (mapsEmbed from Google Maps "Share > Embed"; ga4Id once GA4 exists) or confirm with the owner they stay off.');
check('WARN', 'google-business-profile', /reviewsUrl:\s*''/.test(site),
  'No Google Business Profile: the studio cannot appear in the Google Maps pack for "eyelash extensions Burwood", and the review links stay hidden.',
  'Create the profile (service-area business, address hidden, booking link to /book), then set site.google.reviewsUrl and mapsEmbed in src/data/site.ts.');

check('WARN', 'abby-facts', /yearsExperience:\s*0/.test(site) && /certifications:\s*\[\]/.test(site),
  'About section shows no years of experience or training (first-time lash clients look for both).',
  'Ask Abby again for at least the years figure and one photo of herself; fill site.abby in src/data/site.ts.');

check('WARN', 'xiaohongshu', /xiaohongshu:\s*''/.test(site),
  'No Xiaohongshu (RED) link; Chinese clients in Burwood find studios there more than on Google.',
  'Set site.social.xiaohongshu in src/data/site.ts once Abby has an account, or confirm she stays off it.');


const config = read('astro.config.mjs');
check('WARN', 'domain', !process.env.SITE_URL && /pages\.dev/.test(config),
  'Site URL is still the default https://abby-eyelash.pages.dev (canonicals, sitemap, hreflang use it).',
  'Build production with SITE_URL=https://<real domain> once the domain exists (docs/DEPLOY-CHECKLIST.md part D).');

const photos = read('src/data/photos.ts');
check('WARN', 'powder-brows-photo', !/'powder-brows'\s*:/.test(photos),
  'Powder-brows service page has no photo (placeholder blocks).',
  'Add brow photos to src/data/photos.ts servicePhotos["powder-brows"] and run node scripts/photos.mjs ~/Desktop/abby-eyelash.');
check('WARN', 'ai-style-guide', /aiLash\(/.test(photos),
  'The lash-extensions page shows AI-generated style illustrations.',
  'Confirm Abby approves them as a fair picture of her natural / full sets, keep the "AI 示意图" labels, or replace with real photos.');

check('WARN', 'google-fonts', /fonts\.googleapis\.com/.test(layout),
  'Chinese pages load ~1.5 MB of Noto fonts from Google Fonts (render-blocking; /zh/ LCP ~2.4 s on mobile).',
  'Drop the Google Fonts <link> in src/layouts/BaseLayout.astro and rely on the system CJK font stack (measured: LCP 1.2–1.4 s).');

const show = (c) => `${c.failing ? (c.level === 'BLOCK' ? '✗ BLOCK' : '! WARN ') : '✓ ok   '}  ${c.id}${c.failing ? `\n           ${c.problem}\n           → ${c.fix}` : ''}`;
console.log('Go-live check (code vs reminders)\n');
console.log(checks.map(show).join('\n'));
const blocks = checks.filter((c) => c.failing && c.level === 'BLOCK').length;
const warns = checks.filter((c) => c.failing && c.level === 'WARN').length;
console.log(`\n${blocks} blocker(s), ${warns} warning(s). Then: npm test · LAUNCH=1 npm run build · npm run check:seo · docs/DEPLOY-CHECKLIST.md A–F.`);
process.exit(blocks ? 1 : 0);
