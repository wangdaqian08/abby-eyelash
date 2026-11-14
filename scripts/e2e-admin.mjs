// Browser test of the photo admin (/admin/) on a phone-sized screen, in demo mode (no sign-in, nothing is published).
// Run against a served build: `npm run start`, then `node scripts/e2e-admin.mjs`. BASE=http://localhost:8788 by default.
// `npm run test:e2e` runs it once, next to the booking and layout shards.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { cropRect } from '../src/lib/photo-admin.ts';
import { fixture as fixedData } from '../src/data/photo-admin.fixture.ts';

const BASE = process.env.BASE ?? 'http://localhost:8788';
const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const browser = await chromium.launch();
// The admin starts from /admin/state.json, which is the live photo data: Abby's publishes change it, and this test runs on
// each of them. So the test puts fixed data into it (and keeps the thumbnails, names and base of the build under test).
const phone = async () => {
  const c = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true }); // iPhone X
  await c.route('**/admin/state.json', async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, json: { ...(await res.json()), data: fixedData() } });
  });
  return c;
};
const context = await phone();
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
// the screen redrawn under a lifted tile (a build-status update arrives): the tile must not jump
{
  const [x, y] = await centre(`[data-tile="${moved[4]}"]`);
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(450);
  await page.evaluate(() => dispatchEvent(new HashChangeEvent('hashchange')));
  await page.waitForTimeout(120); // several frames pass with the finger still down
  await page.mouse.up(); await page.waitForTimeout(150);
  check((await tiles()).join() === moved.join(), `4: a redraw during a drag moves nothing (got ${(await tiles()).slice(0, 3)})`);
}
await page.reload(); await view('group');
check((await tiles()).join() === moved.join(), '4: order and upload are still there after a reload');
check(await page.$eval(`[data-tile="${upload}"] img`, (img) => img.complete && img.naturalWidth > 0), '4: the upload still shows its picture after a reload');

// 5 — odd files (Review Focus 3)
await page.click('[data-action="add"]'); await pick('admin-small.png');
check((await tiles()).length === 14, '5: a small transparent PNG is accepted');
await page.click('[data-action="add"]'); await pick('admin-broken.jpg');
check((await tiles()).length === 14, '5: a file that is not a picture adds nothing');
check((await text('[data-notice]')).includes('無法讀取這張圖片'), '5: and says 無法讀取這張圖片');
// a photo over the 6 MB limit (made here: the size is checked before the picture is read, so its content does not matter)
await page.click('[data-action="add"]');
await page.setInputFiles('[data-file]', { name: 'big.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(6 * 1024 * 1024 + 1) }); await page.waitForTimeout(250);
check((await tiles()).length === 14 && (await text('[data-notice]')).includes('圖片超過 6 MB'), `5: a photo over 6 MB is refused and says so (got "${await text('[data-notice]')}")`);

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
check((await text('[data-readout]')) === '', '7: a photo that already has the ratio shows no position read-out at 1x');
await dragStage(0, 80); await page.click('[data-action="done"]'); await view('group');
check((await position(upload)) === '50% 50%', `7: and dragging it changes nothing (got ${await position(upload)})`);

// 7b — zoom: slider, sharpness warning, two-finger pinch (sent as real touch events)
const zoomOf = (id) => page.$eval(`[data-tile="${id}"] img`, (i) => i.style.transform);
const cdp = await context.newCDPSession(page);
const pinch = async (from, to) => {
  const [x, y] = await centre('[data-stage]');
  const pts = (d) => [{ x: x - d / 2, y, id: 1 }, { x: x + d / 2, y, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(from) });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(from + ((to - from) * i) / 8) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(100);
};
await page.click(`[data-tile="${upload}"] [data-action="edit"]`); await view('edit'); // 2000 × 1500 into 4:3 (1600 wide): sharp up to 1.25x
check((await page.$eval('input[data-zoom]', (i) => i.value)) === '1' && (await text('[data-zoom-readout]')).includes('放大 1.0 倍'), '7b: the editor starts at 1x');
check(!(await page.$('[data-sharp-warning]')), '7b: no warning at 1x');
await page.fill('input[data-zoom]', '1.2');
check((await text('[data-zoom-readout]')).includes('放大 1.2 倍') && !(await page.$('[data-sharp-warning]')), '7b: 1.2x is still sharp: no warning');
check((await text('[data-readout]')).includes('垂直位置 50%'), `7b: once zoomed in, the photo can be moved (got "${await text('[data-readout]')}")`);
await page.fill('input[data-zoom]', '2');
check((await text('[data-sharp-warning]')).includes('放大過多，畫質可能變差') && (await text('[data-sharp-warning]')).includes('1.2 倍'), `7b: past 1.25x it warns, naming the sharp limit (got "${await text('[data-sharp-warning]')}")`);
check(!(await page.$eval('[data-action="done"]', (b) => b.disabled)), '7b: the warning does not block 完成');
await pinch(60, 180);
check((await text('[data-zoom-readout]')).includes('放大 3.0 倍'), `7b: spreading two fingers zooms in, at most 3x (got "${await text('[data-zoom-readout]')}")`);
await pinch(180, 90);
check((await text('[data-zoom-readout]')).includes('放大 1.5 倍'), `7b: pinching two fingers zooms out (got "${await text('[data-zoom-readout]')}")`);
check((await page.$eval('input[data-zoom]', (i) => i.value)) === '1.5', '7b: the slider follows the pinch');
await page.click('[data-action="done"]'); await view('group');
check((await zoomOf(upload)) === 'scale(1.5)', `7b: 完成 keeps the zoom, and the tile shows it (got "${await zoomOf(upload)}")`);
await page.click(`[data-tile="${upload}"] [data-action="edit"]`); await view('edit');
check((await page.$eval('input[data-zoom]', (i) => i.value)) === '1.5', '7b: the editor reopens at the saved zoom');
await page.click('[data-action="recentre"]');
check((await text('[data-zoom-readout]')).includes('放大 1.0 倍'), '7b: 重設 goes back to 1x');
await page.click('[data-action="cancel"]'); await view('group');
check((await zoomOf(upload)) === 'scale(1.5)', '7b: 取消 keeps the saved zoom');
await page.click(`[data-tile="${upload}"] [data-action="edit"]`); await view('edit');
await page.fill('input[data-zoom]', '2'); await page.click('[data-action="done"]'); await view('group'); // checked in the published crop (8)
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
check(!(await page.$('[data-readout]')) && !(await page.$('input[data-zoom]')), '9: and has no position read-out and no zoom');
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

// 10 — preview: the draft in the site's layout
await go('#/g/styled'); await view('group');
const order = await tiles();
const doomed = order.find((id) => !id.startsWith('u-') && id !== live && id !== 'styled-fairy');
await page.click(`[data-tile="${doomed}"] [data-action="remove"]`);
await page.click('[data-action="preview"]'); await view('preview');
const home = await page.$$eval('[data-preview-group="styled"] [data-photo-id]', (els) => els.map((e) => e.dataset.photoId));
check(home.length === 4 && home[0] === tall, `10: the home preview shows the first row, the newest upload first (got ${home})`);
check(!home.includes('styled-fairy'), '10: the home preview leaves out the lash card photo');
const lashPage = await page.$$eval('[data-preview-page="styled"] [data-photo-id]', (els) => els.map((e) => e.dataset.photoId));
check(lashPage.join() === order.filter((id) => id !== doomed).join(), '10: the lash-page preview has every photo in order, without the deleted one');
check((await text('[data-preview-page="styled"]')).includes('人魚'), '10: with its style names');
check(!!(await page.$('[data-preview-slot="home-hero"] img')), '10: a replaced place is previewed too');
check((await text('[data-view]')).includes('尚未發佈'), '10: the preview says it is not published');

// 8 + 11 — publish: the cropped photos and one publish request; then the site state
const posts = [];
page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/api/admin/')) posts.push({ path: new URL(r.url()).pathname, body: r.postData() }); });
await page.click('[data-action="publish"]'); await view('publish');
check((await page.$$('[data-change]')).length === 7, `11: the publish screen lists the seven changes (got ${(await page.$$('[data-change]')).length})`);
await page.click('[data-action="confirm"]'); await view('list');
await page.waitForFunction(() => document.querySelector('[data-banner]')?.textContent.includes('已上線'), null, { timeout: 15000 }).catch(() => {});
check((await text('[data-banner]')).includes('已上線'), `11: after publishing the banner says 已上線 (got "${await text('[data-banner]')}")`);
check(!(await text('[data-banner]')).includes('草稿'), '11: and the draft is gone');
const blobs = posts.filter((p) => p.path === '/api/admin/blob').map((p) => Buffer.from(p.body, 'base64'));
const sent = JSON.parse(posts.find((p) => p.path === '/api/admin/publish')?.body ?? '{}');
const sizes = (await Promise.all(blobs.map((b) => sharp(b).metadata()))).map((m) => `${m.format} ${m.width}x${m.height}`).sort();
check(sizes.join() === 'jpeg 1200x1600,jpeg 1600x1200,jpeg 1600x1200,jpeg 1600x1200', `8: four masters at the output sizes (got ${sizes})`);
const corner = await Promise.all(blobs.map((b) => sharp(b).extract({ left: 4, top: 4, width: 1, height: 1 }).raw().toBuffer()));
check(corner.some((px) => px[0] > 245 && px[1] > 245 && px[2] > 245), '8: the transparent PNG was put on white');
// the tall photo was cropped where the editor left it, not at the centre
const tiny = (input) => (Buffer.isBuffer(input) ? sharp(input) : input).resize(160, 120, { fit: 'fill' }).greyscale().raw().toBuffer(); // a JPEG buffer or a sharp pipeline
const expected = (fy) => { const c = cropRect(1500, 2000, '4:3', 0.5, fy); return tiny(sharp(fixture('admin-portrait.jpg')).extract({ left: c.sx, top: c.sy, width: c.sw, height: c.sh })); };
const distance = (a, b) => a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length;
const [atFocus, atCentre, tinies] = [await expected(pct / 100), await expected(0.5), await Promise.all(blobs.map(tiny))];
const best = Math.min(...tinies.map((b) => distance(b, atFocus)));
check(best < 4 && best < Math.min(...tinies.map((b) => distance(b, atCentre))) / 2, `8: the crop follows the editor's position (distance ${best.toFixed(1)})`);
{ // the landscape upload was zoomed 2x at the centre: the middle half of the photo, enlarged to 1600 × 1200
  const z = cropRect(2000, 1500, '4:3', 0.5, 0.5, 2);
  const zoomed = await tiny(sharp(fixture('admin-landscape.jpg')).extract({ left: z.sx, top: z.sy, width: z.sw, height: z.sh }));
  const whole = await tiny(sharp(fixture('admin-landscape.jpg')));
  const near = Math.min(...tinies.map((b) => distance(b, zoomed)));
  check(near < 4 && near < Math.min(...tinies.map((b) => distance(b, whole))) / 2, `8: the crop follows the editor's zoom (distance ${near.toFixed(1)})`);
}
const ups = Object.keys(sent.data?.uploads ?? {});
check(ups.length === 4 && ups.sort().join() === Object.keys(sent.blobs ?? {}).sort().join(), `11: the publish names its four new photos and their blobs (got ${ups.length})`);
check(sent.data?.groups.styled[0] === tall && !sent.data.groups.styled.includes(doomed) && sent.data.labels[tall] === 'look:mermaid' && sent.data.labels[live] === 'look:fairy', '11: with the new order, the deletion and the style names');
check(ups.includes(sent.data?.slots['home-hero']), '11: and the replaced place');
const snapshot = await (await page.request.get(`${BASE}/admin/state.json`)).json();
check(sent.base === snapshot.base, '11: on the base the draft was started from');
check(Object.values(sent.blobs ?? {}).every((sha) => /^[0-9a-f]{40}$/.test(sha)), '11: every blob id is a git id');

// Review Focus 1 — a second publish while the first is still waiting for review (it goes into the same PR)
await page.route('**/api/admin/status*', (r) => r.fulfill({ json: { state: 'review' } }));
await go('#/g/styled'); await view('group');
check((await tiles())[0] === tall && await page.$eval(`[data-tile="${tall}"] img`, (i) => i.complete && i.naturalWidth > 0), '11: after publishing, this phone still shows the published state (the site is not rebuilt yet)');
check(!(await text(`[data-tile="${tall}"]`)).includes('新增'), '11: and the upload is no longer marked new');
await page.click(`[data-tile="${tall}"] [data-action="edit"]`); await view('edit');
check((await text('[data-view]')).includes('已上線的圖片不能重新裁切'), '11: a published upload cannot be re-cropped');
await page.click('[data-action="cancel"]'); await view('group');
const victim = (await tiles()).at(-1);
await page.click(`[data-tile="${victim}"] [data-action="remove"]`);
posts.length = 0;
await page.click('[data-action="publish"]'); await view('publish'); await page.click('[data-action="confirm"]'); await view('list');
const second = JSON.parse(posts.find((p) => p.path === '/api/admin/publish')?.body ?? '{}');
check(second.base && second.base !== snapshot.base && Object.keys(second.blobs).length === 0, '11: the second publish is based on the first, not on the old site');
check((await text('[data-banner]')).includes('等待管理員審核'), `11: while the PR waits the banner says 等待管理員審核 (got "${await text('[data-banner]')}")`);
await go('#/g/styled'); await view('group');
await page.click(`[data-tile="${(await tiles()).at(-1)}"] [data-action="remove"]`);
check(await page.$eval('[data-action="publish"]', (a) => a.getAttribute('aria-disabled') !== 'true'), '11: while the PR waits, more changes can be published into it');
await page.reload(); await view('group');
check((await tiles())[0] === tall && !(await tiles()).includes(victim), '11: a reload during the review keeps what was published');
// the administrator closes the PR without merging: the phone goes back to the site as it is
page.once('dialog', (d) => d.accept());
await go('#/x'); await page.click('[data-action="discard"]'); await view('list');
await page.unroute('**/api/admin/status*');
await page.route('**/api/admin/status*', (r) => r.fulfill({ json: { state: 'rejected' } }));
await page.reload(); await view('list');
await page.waitForFunction(() => document.querySelector('[data-banner]')?.textContent.includes('管理員沒有採用'), null, { timeout: 5000 }).catch(() => {});
check((await text('[data-banner]')).includes('管理員沒有採用'), `11: a turned-down PR says so (got "${await text('[data-banner]')}")`);
await go('#/g/styled'); await view('group');
check((await tiles()).join() === fixedData().groups.styled.join(), '11: and the phone shows the site as it is again');
await page.unroute('**/api/admin/status*');

// 12 — refused publishes (Review Focus 5), and 13 — discard, on a second phone
const phone2 = await phone();
const p2 = await phone2.newPage();
p2.on('pageerror', (e) => errors.push(e.message));
const open2 = async (hash) => { await p2.goto(`${BASE}/admin/${hash}`); await p2.waitForSelector('[data-view]'); };
const tiles2 = () => p2.$$eval('[data-tile]', (els) => els.map((e) => e.dataset.tile));
const text2 = (sel) => p2.$eval(sel, (e) => e.innerText).catch(() => '');
const tryPublish = async () => { await open2('#/x'); await p2.click('[data-action="confirm"]'); await p2.waitForSelector('[data-notice], [data-banner] [data-action="drop-reload"]'); };
await open2('#/g/styled');
const untouched = await tiles2();
await p2.click(`[data-tile="${untouched[3]}"] [data-action="remove"]`);
await p2.route('**/api/admin/publish', (r) => r.fulfill({ status: 401, json: { error: 'signin' } }));
await tryPublish();
check((await text2('[data-notice]')).includes('登入已過期，請重新整理頁面'), `12: a publish without sign-in says so (got "${await text2('[data-notice]')}")`);
await p2.reload(); await p2.waitForSelector('[data-view]');
await open2('#/');
check((await text2('[data-banner]')).includes('草稿：1 項更改尚未發佈'), '12: and the draft is kept');
await p2.unroute('**/api/admin/publish');
await p2.route('**/api/admin/publish', (r) => r.fulfill({ status: 409, json: { error: 'conflict' } }));
await tryPublish();
check((await text2('[data-banner]')).includes('網站已被更新，請重新整理後再修改'), `12: a publish over someone else's says so (got "${await text2('[data-banner]')}")`);
await Promise.all([p2.waitForEvent('load'), p2.click('[data-action="drop-reload"]')]); await p2.waitForSelector('[data-view]'); // the page reloads itself
check(!(await text2('[data-banner]')).includes('草稿') && !(await text2('[data-banner]')).includes('網站已被更新'), '12: its button drops the draft and starts again');
await p2.unroute('**/api/admin/publish');
await p2.route('**/api/admin/publish', (r) => r.fulfill({ status: 502, json: { error: 'github' } }));
await open2('#/g/styled'); await p2.click(`[data-tile="${untouched[3]}"] [data-action="remove"]`);
await tryPublish();
check((await text2('[data-notice]')).includes('發佈沒有成功，草稿仍然保留'), '12: any other failure keeps the draft and says so');
p2.on('dialog', (d) => d.accept());
await p2.click('[data-action="discard"]'); await p2.waitForSelector('[data-view="list"]');
check(!(await text2('[data-banner]')).includes('草稿'), '13: 放棄全部更改 clears the draft');
await open2('#/g/styled');
check((await tiles2()).join() === untouched.join() && !(await p2.$('[data-action="restore"]')), '13: and the group is the live one again');
// Cloudflare Access answers an expired session with a redirect to its sign-in page, not with a 401
await p2.unroute('**/api/admin/publish');
await p2.route('**/api/admin/publish', (r) => r.fulfill({ status: 302, headers: { location: 'https://abby.cloudflareaccess.com/cdn-cgi/access/login' } }));
await p2.click(`[data-tile="${untouched[3]}"] [data-action="remove"]`);
await tryPublish();
check((await text2('[data-notice]')).includes('登入已過期，請重新整理頁面'), `12: a sign-in redirect is read as signed out (got "${await text2('[data-notice]')}")`);
await p2.unroute('**/api/admin/publish');
// while photos are being sent, the screen stays on the publish view: an edit made now would be lost
await open2('#/g/styled'); await p2.click('[data-action="add"]');
await p2.setInputFiles('[data-file]', fixture('admin-landscape.jpg')); await p2.waitForTimeout(250);
await p2.route('**/api/admin/blob', async (r) => { await new Promise((done) => setTimeout(done, 900)); await r.continue(); });
await open2('#/x'); await p2.click('[data-action="confirm"]');
await p2.evaluate(() => { location.hash = '#/g/styled'; });
await p2.waitForTimeout(250);
check(!!(await p2.$('[data-view="publish"]')) && !(await p2.$('[data-tile]')), '11: no editing while a publish is being sent');
check((await text2('[data-action="confirm"]')).includes('上傳中 1 / 1'), `11: the button shows the progress (got "${await text2('[data-action="confirm"]')}")`);
await p2.waitForSelector('[data-view="list"]');
check((await text2('[data-banner]')).includes('已上線') || (await text2('[data-banner]')).includes('發佈中'), '11: and the publish completes');
// several photos in one pick: at most 10, in the order picked; each checked on its own (a fresh group, nothing is published)
await p2.unroute('**/api/admin/blob');
await open2('#/g/nude-french');
const before2 = await tiles2();
const widths2 = () => p2.$$eval('[data-tile] img', (imgs) => imgs.map((i) => i.naturalWidth));
check(await p2.$eval('[data-file]', (i) => i.multiple), '5b: 新增圖片 lets several photos be picked');
await p2.click('[data-action="add"]');
await p2.setInputFiles('[data-file]', [fixture('admin-landscape.jpg'), fixture('admin-portrait.jpg'), fixture('admin-small.png')]); await p2.waitForTimeout(400);
check((await tiles2()).length === before2.length + 3, `5b: three photos picked, three tiles added (got ${(await tiles2()).length - before2.length})`);
check((await widths2()).slice(0, 3).join() === '2000,1500,300', `5b: first in the group, in the order picked (got ${(await widths2()).slice(0, 3)})`);
await p2.click('[data-action="add"]');
await p2.setInputFiles('[data-file]', Array.from({ length: 12 }, () => fixture('admin-small.png'))); await p2.waitForTimeout(600);
check((await tiles2()).length === before2.length + 13, `5b: twelve picked, ten added (got ${(await tiles2()).length - before2.length - 3})`);
check((await text2('[data-notice]')).includes('一次最多 10 張'), `5b: and it says only ten are taken at once (got "${await text2('[data-notice]')}")`);
await p2.click('[data-action="add"]');
const inMemory = (name, mimeType) => ({ name, mimeType, buffer: readFileSync(fixture(name)) }); // Playwright cannot mix paths with in-memory files
await p2.setInputFiles('[data-file]', [inMemory('admin-landscape.jpg', 'image/jpeg'), inMemory('admin-broken.jpg', 'image/jpeg'), { name: 'big.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(6 * 1024 * 1024 + 1) }]); await p2.waitForTimeout(400);
check((await tiles2()).length === before2.length + 14, '5b: the good photo of a mixed pick is added');
check((await text2('[data-notice]')).includes('1 張超過 6 MB') && (await text2('[data-notice]')).includes('1 張無法讀取'), `5b: the others are named with the reason (got "${await text2('[data-notice]')}")`);
await open2('#/s'); await p2.click('[data-slot="home-hero"] [data-action="replace"]');
check(!(await p2.$eval('[data-file]', (i) => i.multiple)), '5b: replacing a fixed place takes one photo');
await phone2.close();

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
