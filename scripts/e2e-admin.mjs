// Browser test of the photo admin (/admin/) on a phone-sized screen, in demo mode (no sign-in, nothing is published).
// Run against a served build: `npm run start`, then `node scripts/e2e-admin.mjs`. BASE=http://localhost:8788 by default.
// `npm run test:e2e` runs it once, next to the booking and layout shards.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE ?? 'http://localhost:8788';
const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true }); // iPhone X
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let pass = 0;
const fails = [];
const check = (ok, msg) => (ok ? pass++ : fails.push(msg));

const go = async (hash = '') => { await page.goto(`${BASE}/admin/${hash}`); await page.waitForSelector('[data-view]'); };
const view = (name) => page.waitForSelector(`[data-view="${name}"]`);
const tiles = () => page.$$eval('[data-tile]', (els) => els.map((e) => e.dataset.tile));
const text = (sel) => page.$eval(sel, (e) => e.innerText).catch(() => '');
const pick = async (name) => { await page.setInputFiles('[data-file]', fixture(name)); await page.waitForTimeout(250); };
const centre = async (sel) => { const b = await (await page.$(sel)).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
/** Press and hold, then drag: the way a tile is moved. */
const holdAndDrag = async (from, to, hold = 450) => {
  const [x1, y1] = await centre(from), [x2, y2] = await centre(to);
  await page.mouse.move(x1, y1); await page.mouse.down(); await page.waitForTimeout(hold);
  await page.mouse.move(x2, y2 - 6, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(150);
};

// 1 — the two lists
await go();
check((await page.$$('[data-group]')).length === 10, '1: the portfolio tab lists ten groups');
check((await text('[data-view]')).includes('圖片管理'), '1: the title is 圖片管理');
await page.click('[data-tab="slots"]'); await view('slots');
check((await page.$$('[data-slot]')).length === 18, '1: the fixed-places tab lists eighteen places');

// 2 — add a photo to a group
await go('#/g/styled'); await view('group');
const before = await tiles();
check(before.length === 12, `2: the styled group shows its 12 photos (got ${before.length})`);
await page.click('[data-action="add"]'); await pick('admin-landscape.jpg');
let now = await tiles();
const added = now[0];
check(now.length === 13 && /^u-[a-z0-9]{10}$/.test(added) && now.slice(1).join() === before.join(), '2: the new photo is the first tile');
check((await text(`[data-tile="${added}"]`)).includes('新增 · 未發佈'), '2: the new tile is marked 新增 · 未發佈');
await go();
check((await text('[data-banner]')).includes('草稿：1 項更改尚未發佈'), `2: the banner counts one change (got "${await text('[data-banner]')}")`);

// 3 — delete and restore
await go('#/g/styled');
await page.click(`[data-tile="${before[1]}"] [data-action="remove"]`);
check(!!(await page.$(`[data-tile="${before[1]}"] [data-action="restore"]`)), '3: a deleted tile offers 還原');
check((await tiles()).length === 13, '3: a deleted tile stays in place until publish');
await page.click(`[data-tile="${before[1]}"] [data-action="restore"]`);
check(!(await page.$('[data-action="restore"]')), '3: restoring brings the tile back');
await page.click(`[data-tile="${added}"] [data-action="remove"]`);
check((await tiles()).join() === before.join(), '3: deleting an unpublished upload removes it at once');
await page.click('[data-action="add"]'); await pick('admin-landscape.jpg');
const upload = (await tiles())[0];

// 4 — press, hold and drag to reorder; the draft survives a reload
now = await tiles();
await holdAndDrag(`[data-tile="${now[2]}"]`, `[data-tile="${now[0]}"]`);
let moved = await tiles();
check(moved[0] === now[2] && moved[1] === now[0] && moved[2] === now[1] && moved.length === 13, `4: the third tile is now first (got ${moved.slice(0, 3)})`);
await holdAndDrag(`[data-tile="${moved[5]}"]`, `[data-tile="${moved[4]}"]`, 60); // a short press is not a drag
check((await tiles()).join() === moved.join(), '4: a short press moves nothing');
await page.reload(); await view('group');
check((await tiles()).join() === moved.join(), '4: order and upload are still there after a reload');
check(await page.$eval(`[data-tile="${upload}"] img`, (img) => img.complete && img.naturalWidth > 0), '4: the upload still shows its picture after a reload');

// 5 — odd files (Review Focus 3)
await page.click('[data-action="add"]'); await pick('admin-small.png');
check((await tiles()).length === 14, '5: a small transparent PNG is accepted');
await page.click('[data-action="add"]'); await pick('admin-broken.jpg');
check((await tiles()).length === 14, '5: a file that is not a picture adds nothing');
check((await text('[data-notice]')).includes('無法讀取這張圖片'), '5: and says 無法讀取這張圖片');

// 6 — replace a fixed place, and take it back
await go('#/s'); await view('slots');
const hero = '[data-slot="home-hero"]';
const liveThumb = await page.$eval(`${hero} img`, (i) => i.src);
await page.click(`${hero} [data-action="replace"]`); await pick('admin-portrait.jpg');
check((await text(hero)).includes('已更換 · 未發佈'), '6: a replaced place is marked 已更換 · 未發佈');
check((await page.$eval(`${hero} img`, (i) => i.src)) !== liveThumb, '6: and shows the new photo');
await page.click(`${hero} [data-action="reset"]`);
check((await page.$eval(`${hero} img`, (i) => i.src)) === liveThumb && !(await text(hero)).includes('已更換'), '6: 還原 brings the live photo back');

// 7 — the editor: position by dragging, optional style name
const position = (id) => page.$eval(`[data-tile="${id}"] img`, (i) => i.style.objectPosition);
const dragStage = async (dx, dy) => {
  const [x, y] = await centre('[data-stage]');
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 6 }); await page.mouse.up();
};
await go('#/g/styled'); await view('group');
await page.click(`[data-tile="${upload}"] [data-action="edit"]`); await view('edit'); // 2000 × 1500 into 4:3: nothing to move
check(!(await page.$('[data-readout]')), '7: a photo that already has the ratio shows no position read-out');
await dragStage(0, 80); await page.click('[data-action="done"]'); await view('group');
check((await position(upload)) === '50% 50%', `7: and dragging it changes nothing (got ${await position(upload)})`);
await page.click('[data-action="add"]'); await pick('admin-portrait.jpg');
const tall = (await tiles())[0];
await page.click(`[data-tile="${tall}"] [data-action="edit"]`); await view('edit');
check((await text('[data-readout]')).includes('垂直位置 50%'), `7: a tall photo starts centred (got "${await text('[data-readout]')}")`);
await dragStage(0, 60);
const pct = Number((await text('[data-readout]')).match(/(\d+)%/)?.[1]);
check(pct < 50 && pct >= 0, `7: dragging the photo down shows more of its top (got ${pct}%)`);
const options = await page.$$eval('select[data-label] option', (o) => o.map((x) => x.textContent));
check(options.join('|') === '不選擇|仙子|單根層次|人魚|漫畫|眼線加濃|太陽花|小絨花|造型款', `7: the styled group offers its eight names (got ${options.join('|')})`);
await page.selectOption('select[data-label]', { label: '人魚' });
await page.click('[data-action="done"]'); await view('group');
check((await text(`[data-tile="${tall}"]`)).includes('人魚'), '7: 完成 keeps the style name');
check((await position(tall)) === `50% ${pct}%`, `7: 完成 keeps the position (got ${await position(tall)})`);
await page.click(`[data-tile="${tall}"] [data-action="edit"]`); await view('edit');
check((await text('[data-readout]')).includes(`${pct}%`) && (await page.$eval('select[data-label]', (s) => s.selectedOptions[0].textContent)) === '人魚', '7: the editor reopens where it was left');
await dragStage(0, -200); await page.selectOption('select[data-label]', { label: '不選擇' });
await page.click('[data-action="cancel"]'); await view('group');
check((await position(tall)) === `50% ${pct}%` && (await text(`[data-tile="${tall}"]`)).includes('人魚'), '7: 取消 changes nothing');
await page.reload(); await view('group');
check((await position(tall)) === `50% ${pct}%`, '7: the position survives a reload');

// 9 — a published photo: no re-crop, the style name can change
const live = moved.find((id) => !id.startsWith('u-') && id !== 'styled-fairy');
await page.click(`[data-tile="${live}"] [data-action="edit"]`); await view('edit');
check((await text('[data-view]')).includes('已上線的圖片不能重新裁切'), '9: a published photo says it cannot be re-cropped');
check(!(await page.$('[data-readout]')), '9: and has no position read-out');
await page.selectOption('select[data-label]', { label: '仙子' });
await page.click('[data-action="done"]'); await view('group');
check((await text(`[data-tile="${live}"]`)).includes('仙子'), '9: its style name can still be changed');
await go('#/g/nude-french'); await view('group');
await page.click('[data-tile] [data-action="edit"]'); await view('edit');
check((await page.$$eval('select[data-label] option', (o) => o.map((x) => x.textContent))).join('|') === '不選擇|單色|貓眼|極光|法式|定製款', '9: a nail group offers the nail names');
await page.click('[data-action="cancel"]'); await view('group');
// a wide photo into a 3:4 place moves sideways
await go('#/s'); await view('slots');
await page.click(`${hero} [data-action="replace"]`); await pick('admin-landscape.jpg');
await page.click(`${hero} [data-action="edit"]`); await view('edit');
check((await text('[data-readout]')).includes('水平位置 50%'), `9: a wide photo in a tall place moves sideways (got "${await text('[data-readout]')}")`);
await dragStage(-40, 0);
check(Number((await text('[data-readout]')).match(/(\d+)%/)?.[1]) > 50, '9: dragging left shows more of its right side');
await page.click('[data-action="done"]'); await view('slots');
check((await text(hero)).includes('已更換 · 未發佈'), '9: 完成 returns to the fixed places');

// nothing on the page may read as a bug, and every control must be large enough for a thumb
check(!/undefined|NaN|null|\[object/.test(await text('[data-admin]')), 'the page shows undefined / NaN / null');
await go('#/g/styled');
const small = await page.$$eval('[data-admin] button, [data-admin] a', (els) => els.filter((e) => e.offsetParent && (e.getBoundingClientRect().width < 44 || e.getBoundingClientRect().height < 44)).map((e) => e.outerHTML.slice(0, 80)));
check(small.length === 0, `controls smaller than 44 px: ${small.join(' | ')}`);
check((await page.evaluate(() => document.documentElement.scrollWidth)) <= 375, 'the page scrolls sideways at 375 px');
// short labels stay on one line (a squeezed label that wraps one character per line reads as broken)
const wrapped = await page.$$eval('[data-admin] [data-action], [data-admin] [data-tile] span', (els) => els.filter((e) => {
  if (!e.offsetParent || e.children.length || !e.innerText.trim() || e.innerText.trim().length > 8) return false;
  const range = document.createRange(); range.selectNodeContents(e);
  return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1; // more than one line of text
}).map((e) => e.innerText));
check(wrapped.length === 0, `labels wrapped one character per line: ${wrapped.join(' | ')}`);

check(errors.length === 0, `page errors: ${errors.join(' | ')}`);
await browser.close();
console.log(`admin: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
