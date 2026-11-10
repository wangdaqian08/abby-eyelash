// Layout check: every built page plus each booking step, at phone and desktop width. Reports text drawn over other
// text, text cut off by its box, and sideways page scroll. Run against a served build: `npm run start`, then
// `node scripts/check-layout.mjs` (BASE=http://localhost:8788 by default).
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:8788';
const WIDTHS = [360, 390, 768, 1024, 1280];
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name === 'index.html' ? [join(d, e.name)] : []));
const pages = walk('dist').map((f) => '/' + relative('dist', f).replace(/index\.html$/, ''));

// Runs in the page with the window scrolled to `top`: returns problems as strings. A text run counts only where it is
// painted (the element hit-tested at that point is the run's own element), so screen-reader-only text, closed menus and
// content under a sticky header or cookie bar are skipped. Fixed/sticky boxes are only compared with each other.
function scan(top) {
  window.scrollTo(0, top);
  const out = [];
  const W = document.documentElement.clientWidth;
  const H = innerHeight;
  if (top === 0 && document.scrollingElement.scrollWidth > W + 1) out.push(`page scrolls sideways: ${document.scrollingElement.scrollWidth}px > ${W}px`);
  const name = (el) => `<${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? ` class="${el.className.slice(0, 50)}…"` : ''}> "${el.textContent.trim().slice(0, 30)}"`;
  const pinned = (el) => {
    for (let e = el; e; e = e.parentElement) if (['fixed', 'sticky'].includes(getComputedStyle(e).position)) return true;
    return false;
  };
  const paints = (el, x, y) => {
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  };
  const runs = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode()); ) {
    const el = n.parentElement;
    if (!n.textContent.trim() || el.closest('script, style, noscript, textarea, .sr-only')) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    for (const b of r.getClientRects()) {
      if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > H) continue;
      const y = Math.min(Math.max(b.top + b.height / 2, 1), H - 1);
      if (![b.left + 2, b.left + b.width / 2, b.right - 2].some((x) => paints(el, x, y))) continue;
      runs.push({ n, el, b, pin: pinned(el) });
    }
  }
  const seen = new Set();
  for (let i = 0; i < runs.length; i++)
    for (let j = i + 1; j < runs.length; j++) {
      const [a, c] = [runs[i], runs[j]];
      if (a.n === c.n || a.pin !== c.pin) continue; // a button's own text and a badge inside it still count
      const x = Math.min(a.b.right, c.b.right) - Math.max(a.b.left, c.b.left);
      const y = Math.min(a.b.bottom, c.b.bottom) - Math.max(a.b.top, c.b.top);
      if (x > 2 && y > Math.min(a.b.height, c.b.height) * 0.4) {
        const k = name(a.el) + ' × ' + name(c.el);
        if (!seen.has(k)) seen.add(k), out.push(`text overlaps: ${k}`);
      }
    }
  // Text cut off: a text run that reaches past the nearest box that clips overflow (scrollers excepted).
  for (const { el, b } of runs) {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX === 'visible' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
      const box = e.getBoundingClientRect();
      if (b.right > box.right + 1 || b.left < box.left - 1) {
        const k = `text cut off: ${name(el)} runs past ${name(e)}`;
        if (!seen.has(k)) seen.add(k), out.push(k);
      }
      break;
    }
  }
  return out;
}
// Scans the whole page one screen at a time.
async function scanPage(page) {
  const h = await page.evaluate(() => document.scrollingElement.scrollHeight);
  const vh = page.viewportSize().height;
  const out = [];
  for (let top = 0; top < h; top += vh - 100) out.push(...(await page.evaluate(scan, top)));
  await page.evaluate(() => window.scrollTo(0, 0));
  return [...new Set(out)];
}

const browser = await chromium.launch();
const problems = [];
const report = (where, list) => list.forEach((p) => problems.push(`${where}: ${p}`));

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const path of pages) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    report(`${width}px ${path}`, await scanPage(page));
  }
  // Booking steps, English and Chinese.
  for (const lang of ['', '/zh']) {
    await page.goto(`${BASE}${lang}/book/`);
    await page.waitForSelector('input[name="bk-service"]');
    for (const s of ['lash-extensions', 'gel-nails', 'handcrafted-nails']) await page.click(`label:has(input[name="bk-service"][value="${s}"])`);
    await page.click('label:has(input[name="bk-option-lash-extensions"][value="styled"])');
    await page.click('label:has(input[data-service="lash-extensions"][value="bottom-full"])');
    await page.click('label:has(input[data-service="lash-extensions"][value="removal"])');
    await page.click('label:has(input[name="bk-option-gel-nails"][value="french"])');
    await page.selectOption('select[data-service="gel-nails"]', '10');
    report(`${width}px ${lang}/book step 1`, await scanPage(page));
    await page.click('[data-action="to-date"]');
    await page.waitForSelector('[data-grid] button[data-date]:not([aria-disabled])');
    report(`${width}px ${lang}/book step 2`, await scanPage(page));
    await page.click('[data-grid] button[data-date]:not([aria-disabled])');
    await page.waitForSelector('[data-slots-heading]');
    report(`${width}px ${lang}/book step 3`, await scanPage(page));
    await page.click('button[data-time]');
    report(`${width}px ${lang}/book step 3 (time picked)`, await scanPage(page));
    await page.click('[data-action="to-details"]');
    await page.click('form[data-form] button[type="submit"]'); // empty: shows the error summary and field errors
    report(`${width}px ${lang}/book step 4 (errors)`, await scanPage(page));
    await page.fill('#bk-name', 'Alexandra Montgomery-Smithson');
    await page.fill('#bk-phone', '0412 345 678');
    await page.fill('#bk-notes', 'A long note '.repeat(20));
    await page.check('#bk-deposit');
    await page.click('form[data-form] button[type="submit"]');
    await page.waitForSelector('#bk-message');
    report(`${width}px ${lang}/book step 5`, await scanPage(page));
  }
  await page.close();
}
await browser.close();
const unique = [...new Set(problems)];
console.log(`${pages.length} pages + booking steps × ${WIDTHS.length} widths: ${unique.length} problems`);
for (const p of unique) console.log(p);
process.exit(unique.length ? 1 : 0);
