// GA4 on the live site, in a real browser (phone size): the cookie choice is respected, and after "Accept all"
// Google receives page_view and book_click for G-ND8T7ZBSLR with style_variant and lang.
// Usage: npm run check:ga4 → the live site. It sends a few real hits to Abby's GA4, tagged utm_source=site-check so they
// can be filtered out of reports. Only the live host reports (src/components/Analytics.astro), so before a deploy:
// npm run build && DIST=1 npm run check:ga4 → the live address answered from ./dist, hits stopped in the browser (no
// middleware there, so no A/B cookie: look A).
// Paste the output into docs/verification/<date>-ga4.md.
import { readFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { site } from '../src/data/site.ts';

const BASE = 'https://www.abbyeyelashes.com';
const ID = site.google.ga4Id;
const TAG = 'utm_source=site-check&utm_medium=test';
const DIST = !!process.env.DIST;
const isGoogle = (u) => /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(u);

let pass = 0;
const fails = [];
const check = (ok, msg, raw = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}${raw ? `\n      ${raw}` : ''}`);
  ok ? pass++ : fails.push(msg);
};

/** Every GA4 hit in a /g/collect request: shared URL params merged with each body line (one line = one event). */
const hits = (req) => {
  const url = new URL(req.url());
  if (!url.pathname.endsWith('/g/collect')) return [];
  const shared = Object.fromEntries(url.searchParams);
  const lines = (req.postData() ?? '').split('\n').filter(Boolean);
  return (lines.length ? lines : ['']).map((l) => ({ ...shared, ...Object.fromEntries(new URLSearchParams(l)) }));
};
const show = (h) => ['tid', 'en', 'up.style_variant', 'ep.style_variant', 'ep.lang', 'dl'].filter((k) => h[k]).map((k) => `${k}=${h[k]}`).join(' ');

const browser = await chromium.launch();
console.log(`GA4 check · ${new Date().toISOString()} · ${BASE} · ${ID} · ${DIST ? 'pages from ./dist, hits not sent' : 'live, hits sent'} · Chromium ${browser.version()} · 375×812\n`);

async function visit(name, fn) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'en-AU' });
  const page = await ctx.newPage();
  if (DIST) {
    await page.route(`${BASE}/**`, (r) => {
      const path = new URL(r.request().url()).pathname;
      const file = `dist${path}${path.endsWith('/') ? 'index.html' : ''}`;
      if (!existsSync(file)) return r.fulfill({ status: 404 });
      r.fulfill({ body: readFileSync(file), contentType: /\.html$/.test(file) ? 'text/html' : undefined });
    });
    await page.route('**/g/collect**', (r) => r.fulfill({ status: 204 })); // seen by the 'request' listener, never reaches Google
  }
  const requests = [];
  const events = [];
  page.on('request', (r) => {
    if (!isGoogle(r.url())) return;
    requests.push(r.url());
    events.push(...hits(r));
  });
  // A book link would leave the page before its hit is seen: stop the navigation (GA's listener on document still runs).
  await page.addInitScript(() => addEventListener('click', (e) => e.target.closest?.('[data-track]') && e.preventDefault()));
  const waitFor = async (pred, ms = 10000) => {
    for (const end = Date.now() + ms; Date.now() < end; await page.waitForTimeout(250)) {
      const h = events.find(pred);
      if (h) return h;
    }
    return null;
  };
  console.log(`— ${name}`);
  await fn({ page, requests, events, waitFor });
  console.log('');
  await ctx.close();
}

await visit('"Necessary only": nothing goes to Google', async ({ page, requests }) => {
  await page.goto(`${BASE}/?${TAG}`);
  await page.waitForSelector('[data-consent="necessary"]', { state: 'visible' });
  await page.waitForTimeout(2000);
  check(requests.length === 0, 'before a choice: no request to Google', `requests: ${requests.length}`);
  await page.tap('[data-consent="necessary"]');
  await page.waitForTimeout(4000);
  check(requests.length === 0, 'after "Necessary only": no request to Google', `requests: ${requests.length}`);
  await page.reload();
  await page.waitForTimeout(4000);
  const bar = await page.isVisible('[data-consent="necessary"]');
  check(!bar && requests.length === 0, 'next page load: choice remembered, bar hidden, still no request', `bar visible: ${bar}, requests: ${requests.length}`);
});

for (const [path, lang] of [['/', 'en-AU'], ['/zh/', 'zh-Hans']]) {
  await visit(`"Accept all" on ${path}`, async ({ page, requests, events, waitFor }) => {
    await page.goto(`${BASE}${path}?${TAG}`);
    await page.waitForSelector('[data-consent="all"]', { state: 'visible' });
    check(requests.length === 0, 'before a choice: no request to Google', `requests: ${requests.length}`);
    await page.tap('[data-consent="all"]');
    const pv = await waitFor((h) => h.en === 'page_view');
    const tag = requests.find((u) => u.includes('gtag/js'));
    check(tag?.includes(`id=${ID}`), `gtag.js loads for ${ID}`, tag ?? 'not requested');
    check(pv?.tid === ID && /^[AB]$/.test(pv?.['up.style_variant'] ?? ''), 'page_view reaches Google with user property style_variant', pv ? show(pv) : 'no page_view hit');
    await page.locator('main [data-track="book_click"]').first().tap().catch((e) => console.log(`      tap failed: ${e.message.split('\n')[0]}`));
    const bc = await waitFor((h) => h.en === 'book_click');
    check(bc?.tid === ID && /^[AB]$/.test(bc?.['ep.style_variant'] ?? '') && bc?.['ep.lang'] === lang, `book_click reaches Google with style_variant and lang=${lang}`, bc ? show(bc) : 'no book_click hit');
    const seen = events.length;
    await page.reload();
    const again = await waitFor((h) => h.en === 'page_view' && events.indexOf(h) >= seen);
    check(!!again && !(await page.isVisible('[data-consent="all"]')), 'next page load: tracking starts without asking again', again ? show(again) : 'no page_view after reload');
  });
}

await browser.close();
console.log(`${pass} passed, ${fails.length} failed${fails.length ? `:\n  ${fails.join('\n  ')}` : ''}`);
process.exit(fails.length ? 1 : 0);
