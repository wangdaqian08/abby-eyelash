import test from 'node:test';
import assert from 'node:assert/strict';
import { bookableWith, mainOptions, services } from './services.ts';
import { homeHero, lashCards, nailGroups, nailVideo, NAIL_VISIBLE, photo, photos, servicePhotos, styledLooks } from './photos.ts';

test('every lash card points at a bookable main option', () => {
  assert.equal(lashCards.length, 6);
  for (const c of lashCards) {
    const s = services.find((x) => x.id === c.serviceId)!;
    assert.ok(s && bookableWith(s).id === s.id, c.serviceId);
    assert.ok(mainOptions(s).some((o) => o.id === c.optionId), c.optionId);
  }
});
test('nail groups use each of the 22 nail photos exactly once, plus the video', () => {
  const items = nailGroups.flatMap((g) => g.items);
  assert.equal(new Set(items).size, items.length);
  assert.equal(items.filter((i) => i === 'video').length, 1);
  assert.equal(items.filter((i) => i !== 'video').length, 22);
  assert.equal(nailGroups.flatMap((g) => g.items.slice(0, NAIL_VISIBLE)).length, 15);
});
test('every referenced id exists, with the right ratio', () => {
  for (const c of lashCards) assert.equal(photo(c.photo).ratio, '4:3');
  for (const l of styledLooks) assert.equal(photo(l.photo).ratio, '4:3');
  for (const i of nailGroups.flatMap((g) => g.items)) if (i !== 'video') assert.equal(photo(i).ratio, '3:4');
  for (const [a, b] of Object.values(servicePhotos).flatMap((s) => (s.beforeAfter ? [s.beforeAfter] : [])))
    assert.deepEqual([photo(a).ratio, photo(b).ratio], ['original', 'original']);
  photo(nailVideo.poster); photo(homeHero);
  assert.equal(styledLooks.length, 12);
});
test('ids are unique ASCII and every alt is filled in both languages', () => {
  assert.equal(new Set(photos.map((p) => p.id)).size, photos.length);
  for (const p of photos) {
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.ok(p.alt.en.trim() && p.alt.zh.trim(), p.id);
  }
});
test('the $180 photo is pre-cropped; only the lash-lift pair keeps its ratio', () => {
  assert.ok(photo('nail-2473').box);
  assert.deepEqual(photos.filter((p) => p.ratio === 'original').map((p) => p.id).sort(), ['lift-1', 'lift-3']);
});
