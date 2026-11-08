import test from 'node:test';
import assert from 'node:assert/strict';
import { bookableWith, findOption, mainOptions, priceText, services } from './services.ts';
import { browGroups, homeHero, lashCards, lashGroups, lashLooks, nailGroups, nailVideo, NAIL_VISIBLE, photo, photos, servicePhotos, styleGuide, styledLooks } from './photos.ts';

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
  assert.deepEqual(photos.filter((p) => p.ratio === 'original').map((p) => p.id).sort(), ['ai-classic-full', 'ai-classic-natural']);
});

test('lashLooks: deep links, live prices and minutes, both languages', () => {
  const en = lashLooks('en'), zh = lashLooks('zh');
  assert.equal(en[0].href, '/book?service=lash-extensions&option=classic-natural');
  assert.equal(zh[0].href, '/zh/book?service=lash-extensions&option=classic-natural');
  assert.equal(en.at(-1)!.href, '/book?service=lash-lift&option=keratin-lift');
  lashCards.forEach((c, i) => {
    const o = findOption(c.serviceId, c.optionId)!;
    assert.equal(en[i].price, priceText(o, 'en'));
    assert.equal(zh[i].price, priceText(o, 'zh'));
    assert.equal(en[i].minutes, o.minutes);
    assert.equal(zh[i].name, o.name.zh);
  });
});

test('AI style-guide images are labelled as AI in both languages and never used as work photos', () => {
  const ai = photos.filter((p) => p.id.startsWith('ai-')).map((p) => p.id);
  assert.deepEqual(styleGuide.map((g) => g.photo).sort(), ai.sort());
  for (const id of ai) {
    assert.match(photo(id).alt.en, /^AI-generated illustration, not a real client/);
    assert.match(photo(id).alt.zh, /^AI 生成示意图，非真实客人/);
  }
  const used = [...lashCards.map((c) => c.photo), ...styledLooks.map((l) => l.photo), homeHero,
    ...nailGroups.flatMap((g) => g.items), ...lashGroups.flatMap((g) => g.items), ...Object.values(servicePhotos).flatMap((s) => [s.hero, s.detail])];
  for (const id of ai) assert.ok(!used.includes(id), id);
  for (const g of styleGuide) assert.ok(findOption('lash-extensions', g.optionId), g.optionId);
});

test('lash portfolio: uniform ratio per group, real work only, no repeats of the cards above it', () => {
  const ids = lashGroups.flatMap((g) => g.items);
  assert.equal(new Set(ids).size, ids.length);
  for (const g of lashGroups) for (const id of g.items) assert.equal(photo(id).ratio, g.ratio, id);
  for (const id of ids) {
    assert.equal(photo(id).dir, 'lash', id);
    assert.ok(!/^AI-generated/.test(photo(id).alt.en), id);
    assert.ok(!lashCards.some((c) => c.photo === id) && id !== homeHero, id);
  }
  // every real lash photo is shown somewhere on the home page or a service page
  const shown = new Set([...ids, ...lashCards.map((c) => c.photo), homeHero, ...styledLooks.map((l) => l.photo), ...Object.values(servicePhotos).flatMap((s) => [s.hero, s.detail])]);
  const unused = photos.filter((p) => p.dir === 'lash' && p.ratio !== 'original' && !shown.has(p.id)).map((p) => p.id);
  assert.deepEqual(unused, []);
});

test('brows portfolio: uniform ratio per group, every brow photo shown once (gallery or brows page)', () => {
  const ids = browGroups.flatMap((g) => g.items);
  for (const g of browGroups) for (const id of g.items) assert.equal(photo(id).ratio, g.ratio, id);
  const page = [servicePhotos['powder-brows'].hero, servicePhotos['powder-brows'].detail];
  const shown = [...ids, ...page];
  assert.equal(new Set(shown).size, shown.length);
  assert.deepEqual(photos.filter((p) => p.dir === 'brows').map((p) => p.id).sort(), [...shown].sort());
});
