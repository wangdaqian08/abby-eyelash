#!/usr/bin/env node
// Side-by-side screenshots of look A and look B (style A/B test, src/data/ab-test.ts), for checking a change in both looks.
// Usage: npm run check:looks  (builds first). Opens looks/index.html: one row per page and width, A left, B right.
// Serves dist/ straight from disk (no server, no port); look B pages come from dist/look-b/. /api is not served.
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const dist = 'dist';
const out = 'looks';
const pages = ['/', '/zh/', '/lash-lift-burwood/', '/book/?service=lash-lift', '/privacy/'];
const widths = [375, 1280];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };

if (!existsSync(join(dist, 'look-b'))) throw new Error('dist/look-b/ missing: run npm run build first');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);

const file = (path, look) => {
  const page = !/\.[a-z0-9]+$/i.test(path);
  const p = join(dist, page && look === 'B' ? `look-b${path}` : path);
  for (const f of [p, join(p, 'index.html')]) if (existsSync(f) && statSync(f).isFile()) return f;
  return null;
};

const browser = await chromium.launch();
const rows = [];
for (const width of widths) {
  for (const look of ['A', 'B']) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 740 : 900 }, isMobile: width < 800, hasTouch: width < 800, reducedMotion: 'reduce' });
    await ctx.route('**/*', (route) => {
      const url = new URL(route.request().url());
      const f = url.host === 'looks.test' && file(decodeURIComponent(url.pathname), look);
      if (!f) return route.fulfill({ status: url.host === 'looks.test' ? 404 : 204, body: '' });
      route.fulfill({ status: 200, body: readFileSync(f), headers: { 'content-type': types[extname(f)] ?? 'application/octet-stream' } });
    });
    await ctx.addInitScript(() => { localStorage.setItem('cookie-consent', 'necessary'); localStorage.setItem('cookie-consent-at', String(Date.now())); });
    const page = await ctx.newPage();
    for (const path of pages) {
      await page.goto(`http://looks.test${path}`);
      // Scroll once so reveal-on-scroll sections show, then wait for fonts and decoded images.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
        scrollTo(0, 0);
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
      });
      const name = `${width}-${look}-${path.replace(/[^a-z0-9]+/gi, '_')}.png`;
      await page.screenshot({ path: join(out, name), fullPage: true });
      if (look === 'B') rows.push({ path, width, a: name.replace(`-B-`, '-A-'), b: name });
    }
    await ctx.close();
  }
}
await browser.close();

const html = `<!doctype html><meta charset="utf-8"><title>Look A vs look B</title>
<style>body{font:14px system-ui;margin:16px}h2{margin:32px 0 8px}div{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}img{width:100%;border:1px solid #ddd}</style>
<h1>Look A (left) · look B (right)</h1>
${rows.map((r) => `<h2>${r.path} · ${r.width}px</h2><div><img src="${r.a}" alt="A"><img src="${r.b}" alt="B"></div>`).join('\n')}`;
writeFileSync(join(out, 'index.html'), html);
console.log(`${rows.length * 2} screenshots → ${out}/index.html`);
