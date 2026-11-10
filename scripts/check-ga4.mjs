// GA4 check on the live site, as a phone (iPhone 13, touch). Every GA4 hit is answered locally with 204, so nothing
// reaches Abby's reports. Hits are read at the browser's network layer (CDP), which also sees requests sent while a
// page unloads. Prints one PASS/FAIL line per check and the raw hits; exits 1 if any check fails.
// Run: `npm run check:ga4` (BASE=https://www.abbyeyelashes.com by default; GA4 only reports on the production host).
// Before a merge: SERVE_FROM=http://localhost:8788 npm run check:ga4 keeps the production address in the browser but
// takes every page of it from the local build (`npm run start`), so the check runs on the new code.
// Record each run in docs/verification/.
import { chromium, devices } from 'playwright';
import { site } from '../src/data/site.ts';

const BASE = process.env.BASE ?? 'https://www.abbyeyelashes.com';
const SERVE_FROM = process.env.SERVE_FROM;
const ID = site.google.ga4Id;
const BATCH_MS = 12_000; // gtag batches hits for several seconds before sending
const GA = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/;

const results = [];
const check = (ok, name, evidence) => results.push({ ok: !!ok, name, evidence });

/** A phone context that answers GA4 hits locally and logs every hit's events from the network layer. */
async function phone(browser) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/\/g\/collect/, (r) => r.fulfill({ status: 204, body: '' }));
  if (SERVE_FROM) await ctx.route((u) => u.origin === new URL(BASE).origin, async (r) => r.fulfill({ response: await r.fetch({ url: r.request().url().replace(new URL(BASE).origin, SERVE_FROM), maxRedirects: 0 }) }));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const hits = [];
  const requests = [];
  cdp.on('Network.requestWillBeSent', ({ request }) => {
    if (GA.test(request.url)) requests.push(request.url.split('?')[0]);
    if (!/\/g\/collect/.test(request.url)) return;
    const u = new URL(request.url);
    const base = Object.fromEntries(u.searchParams);
    const lines = (request.postData || '').split(/\r?\n/).filter(Boolean);
    for (const l of lines.length ? lines : ['']) {
      const p = { ...base, ...Object.fromEntries(new URLSearchParams(l)) };
      const params = Object.fromEntries(Object.entries(p).filter(([k]) => /^(ep|epn|up)\.|^cu$/.test(k)));
      hits.push({ en: p.en, tid: p.tid, path: p.dl ? new URL(p.dl).pathname : '', params });
    }
  });
  return { ctx, page, hits, requests };
}
const show = (h) => `${h.en} tid=${h.tid} ${h.path} ${JSON.stringify(h.params)}`;
const find = (hits, en) => hits.filter((h) => h.en === en);

const browser = await chromium.launch();
const startedAt = new Date().toISOString();

// 1. No choice yet, then "Necessary only": GA never loads.
{
  const { ctx, page, requests } = await phone(browser);
  await page.goto(BASE + '/');
  await page.waitForTimeout(2000);
  check(requests.length === 0, 'no GA request before a cookie choice', `${requests.length} GA requests`);
  await page.tap('[data-consent="necessary"]');
  await page.goto(BASE + '/zh/');
  await page.waitForTimeout(3000);
  check(requests.length === 0, 'no GA request after "Necessary only" (and on the next page)', `${requests.length} GA requests`);
  await ctx.close();
}

// 2. "Accept all": the tag, page views, a tracked click without page change, a tracked click that changes page.
const all = await phone(browser);
{
  const { page, hits, requests } = all;
  await page.goto(BASE + '/');
  await page.tap('[data-consent="all"]');
  await page.waitForTimeout(3000);
  const tag = requests.find((u) => u.includes('/gtag/js'));
  check(tag, 'gtag.js loads after "Accept all"', tag ?? 'not loaded');
  const pv = find(hits, 'page_view')[0];
  check(pv && pv.tid === ID, `page_view on / goes to ${ID}`, pv ? show(pv) : 'no page_view');

  const msg = page.locator('main [data-track="message_click"]:visible').first();
  await msg.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault())); // don't open the SMS app
  await msg.tap();
  await page.waitForTimeout(BATCH_MS);
  const mc = find(hits, 'message_click')[0];
  check(mc, 'message_click (phone number tapped) is sent', mc ? show(mc) : 'not sent');

  await page.locator('main [data-track="book_click"]:visible').first().tap();
  await page.waitForURL(/\/book\//);
  await page.waitForTimeout(BATCH_MS);
  const pvBook = find(hits, 'page_view').find((h) => h.path === '/book/');
  check(pvBook, 'page_view on /book/', pvBook ? show(pvBook) : 'no page_view');
}

// 3. A booking up to the message: booking_start, booking_submitted (with value, currency, and the channel).
{
  const { page, hits } = all;
  await page.goto(BASE + '/book/?service=lash-lift');
  await page.tap('[data-action="to-date"]');
  await page.waitForSelector('[data-grid] button[data-date]:not([aria-disabled])', { timeout: 15000 });
  await page.tap('[data-grid] button[data-date]:not([aria-disabled])');
  await page.waitForSelector('button[data-time]', { timeout: 15000 });
  await page.tap('button[data-time]');
  await page.tap('[data-action="to-details"]');
  await page.fill('#bk-name', 'GA4 Check');
  await page.fill('#bk-phone', '0412 345 678');
  await page.tap('#bk-deposit');
  await page.tap('[data-form] [type=submit]');
  await page.waitForSelector('[data-send="sms"]');
  await page.evaluate(() => document.querySelector('[data-send="sms"]').addEventListener('click', (e) => e.preventDefault()));
  await page.tap('[data-send="sms"]');
  await page.waitForTimeout(BATCH_MS);
  const bs = find(hits, 'booking_start').find((h) => h.params['ep.service'] === 'lash-lift');
  check(bs && bs.params['ep.lang'] && bs.params['ep.style_variant'], 'booking_start with service, lang, style_variant', bs ? show(bs) : 'not sent');
  const sub = find(hits, 'booking_submitted')[0];
  check(sub && sub.params['epn.value'] && sub.params.cu === 'AUD', 'booking_submitted with value and currency AUD', sub ? show(sub) : 'not sent');
  check(sub?.params['ep.via'] === 'sms', 'booking_submitted says which channel (via=sms)', sub ? `ep.via=${sub.params['ep.via'] ?? '(missing)'}` : 'not sent');
}
await all.page.goto('about:blank'); // leaving the page sends whatever gtag still holds
await all.page.waitForTimeout(3000);
// Judged last: the click opened /book/, so its hit can go out in any later batch.
const bc = find(all.hits, 'book_click');
check(bc.length === 1 && /\/book\b/.test(bc[0].params['ep.link_url'] ?? ''), 'book_click (home "Book" button, opens /book/) is sent once',
  bc.length ? bc.map(show).join(' | ') : 'not sent: the page changed before the batched hit went out');
await all.ctx.close();
await browser.close();

console.log(`GA4 check · ${BASE}${SERVE_FROM ? ` (pages from ${SERVE_FROM})` : ''} · ${ID} · ${startedAt}`);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}\n      ${r.evidence}`);
console.log('\nAll hits (accept-all session):');
for (const h of all.hits) console.log('  ' + show(h));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
