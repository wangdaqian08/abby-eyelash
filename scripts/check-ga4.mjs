// GA4 on the live site, in a real browser (phone size): the cookie choice is respected, and after "Accept all"
// Google receives page_view and book_click for G-ND8T7ZBSLR with style_variant and lang.
// Usage: npm run check:ga4 → the live site. It sends a few real hits to Abby's GA4, tagged utm_source=site-check so they
// can be filtered out of reports. Only the live host reports (src/components/Analytics.astro), so before a deploy:
// `npm run start` (local build on :8788 with the demo booking API), then LOCAL=1 npm run check:ga4 → the live address
// in the browser, every page taken from :8788, every hit stopped in the browser.
// Booking hits are always stopped in the browser (a real booking_submitted would count as a conversion in Abby's
// reports). The SMS tap is cancelled: a headless browser can't switch to the Messages app, so that part is checked by
// hand on a phone (docs/verification/2026-11-10-ga4.md). Paste the output into docs/verification/<date>-ga4.md.
import { chromium } from 'playwright';
import { site } from '../src/data/site.ts';

const BASE = 'https://www.abbyeyelashes.com';
const ID = site.google.ga4Id;
const TAG = 'utm_source=site-check&utm_medium=test';
const LOCAL = process.env.LOCAL ? 'http://localhost:8788' : '';
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
console.log(`GA4 check · ${new Date().toISOString()} · ${BASE} · ${ID} · ${LOCAL ? `pages from ${LOCAL}, hits not sent` : 'live, hits sent (booking hits stopped)'} · Chromium ${browser.version()} · 375×812\n`);

async function visit(name, fn) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'en-AU' });
  const page = await ctx.newPage();
  if (LOCAL) {
    await page.route(`${BASE}/**`, async (r) => r.fulfill({ response: await r.fetch({ url: r.request().url().replace(BASE, LOCAL), maxRedirects: 0 }) }));
    await page.route('**/g/collect**', (r) => r.fulfill({ status: 204 })); // seen by the 'request' listener, never reaches Google
  } else {
    await page.route('**/g/collect**', (r) => (/en=booking_/.test(r.request().url() + (r.request().postData() ?? '')) ? r.fulfill({ status: 204 }) : r.continue()));
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

await visit('a booking up to "Send by SMS" on /book/', async ({ page, events, waitFor }) => {
  await page.goto(`${BASE}/book/?service=lash-lift&${TAG}`);
  await page.tap('[data-consent="all"]');
  await page.tap('[data-action="to-date"]');
  await page.tap('[data-grid] button[data-date]:not([aria-disabled])', { timeout: 15000 });
  await page.tap('button[data-time]', { timeout: 15000 });
  await page.tap('[data-action="to-details"]');
  await page.fill('#bk-name', 'GA4 Check');
  await page.fill('#bk-phone', '0412 345 678');
  await page.tap('#bk-deposit');
  await page.tap('[data-form] [type=submit]');
  await page.waitForSelector('[data-send="sms"]');
  await page.evaluate(() => document.querySelector('[data-send="sms"]').addEventListener('click', (e) => e.preventDefault()));
  await page.tap('[data-send="sms"]');
  const bs = await waitFor((h) => h.en === 'booking_start');
  check(bs?.['ep.service'] === 'lash-lift' && bs?.['ep.lang'] && /^[AB]$/.test(bs?.['ep.style_variant'] ?? ''), 'booking_start with service, lang, style_variant', bs ? show(bs) : 'no booking_start hit');
  const sub = await waitFor((h) => h.en === 'booking_submitted');
  check(sub?.['epn.value'] && sub?.cu === 'AUD' && sub?.['ep.via'] === 'sms', 'booking_submitted with value, currency AUD and via=sms', sub ? `${show(sub)} epn.value=${sub['epn.value']} cu=${sub.cu} ep.via=${sub['ep.via'] ?? '(missing)'}` : 'no booking_submitted hit');
});

await browser.close();
console.log(`${pass} passed, ${fails.length} failed${fails.length ? `:\n  ${fails.join('\n  ')}` : ''}`);
process.exit(fails.length ? 1 : 0);
