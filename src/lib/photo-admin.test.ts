import test from 'node:test';
import assert from 'node:assert/strict';
import { adminData, type AdminData } from '../data/photos.ts';
import { fixture } from '../data/photo-admin.fixture.ts';
import { cropRect, gitBlobSha, removedMasters, sharpLimit, validateAdmin, withNumbers } from './photo-admin.ts';

test('cropRect covers the ratio and the focus chooses the kept part', () => {
  assert.deepEqual(cropRect(4000, 3000, '4:3', 0.5, 0.5), { sx: 0, sy: 0, sw: 4000, sh: 3000 });
  assert.deepEqual(cropRect(3000, 4000, '4:3', 0.5, 0), { sx: 0, sy: 0, sw: 3000, sh: 2250 });
  assert.deepEqual(cropRect(3000, 4000, '4:3', 0.5, 0.5), { sx: 0, sy: 875, sw: 3000, sh: 2250 });
  assert.deepEqual(cropRect(3000, 4000, '4:3', 0.5, 1), { sx: 0, sy: 1750, sw: 3000, sh: 2250 });
  assert.deepEqual(cropRect(4000, 3000, '3:4', 1, 0.5), { sx: 1750, sy: 0, sw: 2250, sh: 3000 });
  assert.deepEqual(cropRect(300, 200, '4:3', 9, -3), { sx: 33, sy: 0, sw: 267, sh: 200 }); // focus clamped to 0..1; small sources allowed
});
test('cropRect with zoom takes a smaller part of the photo, still placed by the focus', () => {
  assert.deepEqual(cropRect(4000, 3000, '4:3', 0.5, 0.5, 2), { sx: 1000, sy: 750, sw: 2000, sh: 1500 }); // the middle half
  assert.deepEqual(cropRect(4000, 3000, '4:3', 0, 0, 2), { sx: 0, sy: 0, sw: 2000, sh: 1500 }); // top-left quarter
  assert.deepEqual(cropRect(4000, 3000, '4:3', 1, 1, 2), { sx: 2000, sy: 1500, sw: 2000, sh: 1500 });
  assert.deepEqual(cropRect(3000, 4000, '4:3', 0.5, 0, 1.5), { sx: 500, sy: 0, sw: 2000, sh: 1500 }); // a tall photo can now move sideways too
  assert.deepEqual(cropRect(4000, 3000, '4:3', 0.5, 0.5, 1), cropRect(4000, 3000, '4:3', 0.5, 0.5));
  assert.deepEqual(cropRect(4000, 3000, '4:3', 0.5, 0.5, 0.5), cropRect(4000, 3000, '4:3', 0.5, 0.5)); // never zooms out: no white edges
  assert.deepEqual(cropRect(4000, 3000, '4:3', 0.5, 0.5, 9), cropRect(4000, 3000, '4:3', 0.5, 0.5, 3)); // at most 3x
});
test('sharpLimit: the zoom up to which the part used is still as wide as the output', () => {
  assert.equal(sharpLimit(4032, 3024, '4:3'), 2.52); // iPhone X landscape into a 4:3 group (1600 wide)
  assert.equal(sharpLimit(3024, 4032, '4:3'), 1.89); // portrait into 4:3
  assert.equal(sharpLimit(3024, 4032, '3:4'), 2.52); // portrait into 3:4 (1200 wide)
  assert.equal(sharpLimit(1280, 960, '4:3'), 0.8); // a small picture is stretched even at 1x
  assert.equal(sharpLimit(3024, 4032, '1.91:1'), 2.52); // portrait into a link preview (1200 wide): only a band of it is kept
  assert.deepEqual(cropRect(3000, 4000, '1.91:1', 0.5, 0.5), { sx: 0, sy: 1213, sw: 3000, sh: 1575 });
});
test('gitBlobSha matches git hash-object', async () => {
  assert.equal(await gitBlobSha('hello\n'), 'ce013625030ba8dba906f756967f9e9ca394464a');
});
test('the live photo-admin.json is publishable as it is', () => {
  assert.equal(validateAdmin(adminData, adminData, new Set()), null);
});
const S = 'lash-extensions/styled';
/** A draft change as the admin sends it: edited, then numbered (admin-store.ts finalData). */
const edited = (live: AdminData, edit: (d: AdminData) => void) => { const d = structuredClone(live); edit(d); return withNumbers(d); };
test('validateAdmin accepts every single admin action', () => {
  const live = fixture();
  assert.equal(validateAdmin(live, live, new Set()), null);
  const ok = (edit: (d: AdminData) => void, blobs: string[] = []) => assert.equal(validateAdmin(edited(live, edit), live, new Set(blobs)), null);
  ok((d) => { d.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: S }; d.groups[S].unshift('u-abcdefghij'); d.labels['u-abcdefghij'] = 'look:mermaid'; }, ['u-abcdefghij']);
  ok((d) => { d.groups['powder-brows/powder'] = []; });
  ok((d) => { d.uploads['u-0000000000'] = { dir: 'lash', ratio: '3:4', where: 'home-hero' }; d.slots['home-hero'] = 'u-0000000000'; }, ['u-0000000000']);
  ok((d) => { d.groups['gel-nails/french'].reverse(); }); // the video moves with the photos
  ok((d) => { d.uploads['u-1111111111'] = { dir: 'nails', ratio: '1.91:1', where: 'page:gel-nails:og' }; d.slots['page:gel-nails:og'] = 'u-1111111111'; }, ['u-1111111111']); // a link preview
  // a photo moves to another style of its part, even of another service (gel → hand-painted, lash extensions → lash lift), either orientation
  ok((d) => { d.groups['gel-nails/other'].splice(0, 1); d.groups['handcrafted-nails/nail-art'].push('nail-2223'); });
  ok((d) => { d.groups.face.splice(d.groups.face.indexOf('face-smile'), 1); d.groups['lash-lift/keratin-lift'].push('face-smile'); }); // portrait into a landscape group
  ok((d) => { d.groups['gel-nails/other'].splice(0, 1); d.groups['nail-extensions/other'].push('nail-2223'); });
  ok((d) => { d.labels['face-smile'] = 'option:lash-extensions/hybrid-natural'; }); // a 整脸效果 photo gets a style
  ok((d) => { d.names['gel-nails/cat-eye'] = { en: 'Cat eye', zh: '猫眼光' }; d.names['powder-brows'] = { en: 'Brows', zh: '眉' }; });
  ok((d) => { d.alts['nail-6920'] = { en: 'Nude almond nails', zh: '裸色杏仁甲' }; d.alts['hero-mirror'] = { en: 'Mirror', zh: '镜子' }; });
});
test('validateAdmin names what is wrong', () => {
  const live = fixture();
  const bad = (edit: (d: AdminData) => void, blobs: string[] = []) => validateAdmin(edited(live, edit), live, new Set(blobs));
  assert.equal(bad((d) => { delete d.groups[S]; }), 'groups');
  assert.equal(bad((d) => { d.groups.wrong = []; }), 'groups');
  assert.equal(bad((d) => { d.groups[S].push('nail-6920'); }), 'item'); // a nail photo in a lash group: never across parts
  assert.equal(bad((d) => { d.groups['gel-nails/solid'].push('brow-3166'); }), 'item');
  assert.equal(bad((d) => { d.groups[S].push('../../x'); }), 'item');
  assert.equal(bad((d) => { d.groups[S].push('ai-classic-natural'); }), 'item'); // an AI illustration is never work
  assert.equal(bad((d) => { d.groups[S].push(d.groups[S][0]); }), 'duplicate');
  assert.equal(bad((d) => { d.groups['lash-extensions/classic-natural'].push('styled-fairy'); }), 'duplicate'); // one style per photo
  assert.equal(bad((d) => { d.slots['home-hero'] = 'styled-fairy'; }), 'slot'); // 4:3 into a 3:4 place
  assert.equal(bad((d) => { d.slots['nope'] = 'hero-mirror'; }), 'slot');
  assert.equal(bad((d) => { d.slots['page:gel-nails:og'] = 'nail-3406'; }), 'slot'); // a link preview takes only a photo cropped to its own shape
  assert.equal(bad((d) => { d.uploads['u-1111111111'] = { dir: 'lash', ratio: '1.91:1', where: 'home-hero' }; d.slots['home-hero'] = 'u-1111111111'; }, ['u-1111111111']), 'slot'); // and that shape fits nowhere else
  assert.equal(bad((d) => { d.uploads['u-1111111111'] = { dir: 'lash', ratio: '1.91:1', where: S }; d.groups[S].push('u-1111111111'); }, ['u-1111111111']), 'item');
  assert.equal(bad((d) => { d.uploads['u-1111111111'] = { dir: 'nails', ratio: '16:9' as never, where: 'page:gel-nails:og' }; d.slots['page:gel-nails:og'] = 'u-1111111111'; }, ['u-1111111111']), 'upload'); // an unknown shape
  assert.equal(bad((d) => { d.uploads['u-1111111111'] = { dir: 'nails', ratio: 'constructor' as never, where: 'page:gel-nails:og' }; d.slots['page:gel-nails:og'] = 'u-1111111111'; }, ['u-1111111111']), 'upload');
  assert.equal(bad((d) => { d.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: S }; d.groups[S].push('u-abcdefghij'); }), 'upload'); // no blob
  assert.equal(bad((d) => { d.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: S }; }, ['u-abcdefghij']), 'upload'); // unreferenced
  assert.equal(bad((d) => { d.uploads['U-../../etc'] = { dir: 'lash', ratio: '4:3', where: S }; d.groups[S].push('U-../../etc'); }, ['U-../../etc']), 'upload'); // id shape
  assert.equal(bad((d) => { d.labels['classic-natural-2'] = 'look:mermaid'; }), 'label'); // a look name only in the styled set
  assert.equal(bad((d) => { d.labels['styled-fairy'] = 'option:lash-extensions/classic-full'; }), 'label'); // a style label only in 整脸效果
  assert.equal(bad((d) => { d.labels['face-smile'] = 'option:gel-nails/solid'; }), 'label');
  assert.equal(bad((d) => { d.names['gel-nails/nope'] = { en: 'x', zh: 'x' }; }), 'name');
  assert.equal(bad((d) => { d.names['lash-extensions/removal'] = { en: 'x', zh: 'x' }; }), 'name'); // an add-on is not a style
  assert.equal(bad((d) => { d.names['gel-nails'] = { en: ' ', zh: '凝胶' }; }), 'name'); // both languages, never blank
  assert.equal(bad((d) => { d.names['gel-nails'] = { en: 'x'.repeat(81), zh: '凝胶' }; }), 'name');
  assert.equal(bad((d) => { d.names['gel-nails'] = { en: 'Gel', zh: '凝胶', x: '' } as never; }), 'name');
  assert.equal(bad((d) => { d.alts['ai-classic-natural'] = { en: 'x', zh: 'x' }; }), 'alt'); // only a photo the site shows
  assert.equal(bad((d) => { d.alts['nail-6920'] = { en: '', zh: 'x' }; }), 'alt');
  assert.equal(bad((d) => { // no limit on how many photos one publish adds: each is uploaded on its own
    for (let i = 0; i < 40; i++) { const id = `u-${String(i).padStart(10, '0')}`; d.uploads[id] = { dir: 'lash', ratio: '4:3', where: S }; d.groups[S].push(id); }
  }, Array.from({ length: 40 }, (_, i) => `u-${String(i).padStart(10, '0')}`)), null);
  assert.equal(validateAdmin({ groups: live.groups } as AdminData, live, new Set()), 'groups'); // a body with missing parts
});
test('withNumbers: a number stays with its photo and style; a new style gives the next number; none is given twice', () => {
  const live = fixture();
  assert.equal(live.numbers['nail-fc1a'], 'gel-nails-cat-eye-1');
  assert.equal(live.numbers['face-natural'], 'lash-extensions-1'); // no style: the service alone
  assert.equal(live.numbers['hero-mirror'], 'lash-extensions-4'); // a fixed place's photo is numbered too
  assert.equal(live.numbers['lift-3'], 'lash-lift-1');
  assert.equal(live.numbers['classic-full-bottom'], 'lash-extensions-classic-full-2'); // a lash card: its style
  const moved = edited(live, (d) => { d.groups['gel-nails/cat-eye'] = []; d.groups['gel-nails/solid'].push('nail-fc1a'); });
  assert.equal(moved.numbers['nail-fc1a'], `gel-nails-solid-${live.counters['gel-nails-solid'] + 1}`);
  assert.equal(validateAdmin(moved, live, new Set()), null);
  const back = edited(moved, (d) => { d.groups['gel-nails/solid'].pop(); d.groups['gel-nails/cat-eye'] = ['nail-fc1a']; });
  assert.equal(back.numbers['nail-fc1a'], 'gel-nails-cat-eye-2'); // never its old number again: GA4 keeps -1 for the time it was there
  const nums = Object.values(live.numbers);
  assert.equal(new Set(nums).size, nums.length);
  // what validation refuses: a number another photo had, a reused number, a counter going down, a missing or wrong-style number
  const bad = (edit: (d: AdminData) => void) => { const d = structuredClone(live); edit(d); return validateAdmin(d, live, new Set()); };
  assert.equal(bad((d) => { d.groups['gel-nails/solid'].splice(0, 1); d.numbers = withNumbers(d).numbers; d.numbers['nail-4067'] = live.numbers['nail-6920']; }), 'number');
  assert.equal(bad((d) => { d.counters['gel-nails-solid'] = 1; }), 'number');
  assert.equal(bad((d) => { delete d.numbers['nail-6920']; }), 'number');
  assert.equal(bad((d) => { d.numbers['nail-6920'] = 'gel-nails-french-1'; }), 'number');
  assert.equal(bad((d) => { d.numbers['nail-6920'] = 'gel-nails-solid-99'; }), 'number'); // above the counter
});
test('removedMasters: only uploads that nothing refers to any more', () => {
  const prev = fixture(); prev.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: S }; prev.groups[S].unshift('u-abcdefghij');
  const next = fixture();
  assert.deepEqual(removedMasters(prev, next), ['src/assets/photos/lash/u-abcdefghij.jpg']);
  next.groups[S] = next.groups[S].filter((id) => id !== 'styled-fairy'); // a legacy photo: its master stays
  assert.deepEqual(removedMasters(prev, next), ['src/assets/photos/lash/u-abcdefghij.jpg']);
  assert.deepEqual(removedMasters(prev, prev), []);
});
