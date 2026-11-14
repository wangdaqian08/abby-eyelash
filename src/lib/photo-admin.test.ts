import test from 'node:test';
import assert from 'node:assert/strict';
import { adminData, type AdminData } from '../data/photos.ts';
import { fixture } from '../data/photo-admin.fixture.ts';
import { cropRect, gitBlobSha, removedMasters, sharpLimit, validateAdmin } from './photo-admin.ts';

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
});
test('gitBlobSha matches git hash-object', async () => {
  assert.equal(await gitBlobSha('hello\n'), 'ce013625030ba8dba906f756967f9e9ca394464a');
});
test('the live photo-admin.json is publishable as it is', () => {
  assert.equal(validateAdmin(adminData, adminData, new Set()), null);
});
test('validateAdmin accepts every single admin action', () => {
  const live = fixture();
  assert.equal(validateAdmin(live, live, new Set()), null);
  const add = structuredClone(live); add.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; add.groups.styled.unshift('u-abcdefghij'); add.labels['u-abcdefghij'] = 'look:mermaid';
  assert.equal(validateAdmin(add, live, new Set(['u-abcdefghij'])), null);
  const empty = structuredClone(live); empty.groups['close-ups'] = [];
  assert.equal(validateAdmin(empty, live, new Set()), null);
  const swap = structuredClone(live); swap.uploads['u-0000000000'] = { dir: 'lash', ratio: '3:4', where: 'home-hero' }; swap.slots['home-hero'] = 'u-0000000000';
  assert.equal(validateAdmin(swap, live, new Set(['u-0000000000'])), null);
  const reorder = structuredClone(live); reorder.groups['warm-floral'].reverse(); // the video moves with the photos
  assert.equal(validateAdmin(reorder, live, new Set()), null);
});
test('validateAdmin names what is wrong', () => {
  const live = fixture();
  const bad = (edit: (d: AdminData) => void, blobs: string[] = []) => { const d = structuredClone(live); edit(d); return validateAdmin(d, live, new Set(blobs)); };
  assert.equal(bad((d) => { delete d.groups.styled; }), 'groups');
  assert.equal(bad((d) => { d.groups.styled.push('nail-6920'); }), 'item'); // wrong dir and ratio
  assert.equal(bad((d) => { d.groups.styled.push('../../x'); }), 'item');
  assert.equal(bad((d) => { d.groups.styled.push('ai-classic-natural'); }), 'item'); // an AI illustration is never work
  assert.equal(bad((d) => { d.groups.styled.push(d.groups.styled[0]); }), 'duplicate');
  assert.equal(bad((d) => { d.slots['home-hero'] = 'styled-fairy'; }), 'slot'); // 4:3 into a 3:4 place
  assert.equal(bad((d) => { d.slots['nope'] = 'hero-mirror'; }), 'slot');
  assert.equal(bad((d) => { d.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; d.groups.styled.push('u-abcdefghij'); }), 'upload'); // no blob
  assert.equal(bad((d) => { d.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; }, ['u-abcdefghij']), 'upload'); // unreferenced
  assert.equal(bad((d) => { d.uploads['U-../../etc'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; d.groups.styled.push('U-../../etc'); }, ['U-../../etc']), 'upload'); // id shape
  assert.equal(bad((d) => { d.labels['classic-natural-2'] = 'look:mermaid'; }), 'label'); // a styled-only name outside the styled group
  assert.equal(bad((d) => { d.labels['nail-6920'] = 'option:powder-brows/powder'; }), 'label'); // a brows name on a nail photo
  assert.equal(bad((d) => { // no limit on how many photos one publish adds: each is uploaded on its own
    for (let i = 0; i < 40; i++) { const id = `u-${String(i).padStart(10, '0')}`; d.uploads[id] = { dir: 'lash', ratio: '4:3', where: 'styled' }; d.groups.styled.push(id); }
  }, Array.from({ length: 40 }, (_, i) => `u-${String(i).padStart(10, '0')}`)), null);
  assert.equal(validateAdmin({ groups: live.groups } as AdminData, live, new Set()), 'groups'); // a body with missing parts
});
test('removedMasters: only uploads that nothing refers to any more', () => {
  const prev = fixture(); prev.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; prev.groups.styled.unshift('u-abcdefghij');
  const next = fixture();
  assert.deepEqual(removedMasters(prev, next), ['src/assets/photos/lash/u-abcdefghij.jpg']);
  next.groups.styled = next.groups.styled.filter((id) => id !== 'styled-fairy'); // a legacy photo: its master stays
  assert.deepEqual(removedMasters(prev, next), ['src/assets/photos/lash/u-abcdefghij.jpg']);
  assert.deepEqual(removedMasters(prev, prev), []);
});
