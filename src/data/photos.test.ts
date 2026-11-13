import test from 'node:test';
import assert from 'node:assert/strict';
import { bookableWith, findOption, mainOptions, priceText, services } from './services.ts';
import { adminData, adminGroups, adminSlots, browGroups, browVideo, homeHero, lashCards, lashGroups, lashLooks, lookName, nailGroups, nailVideo, photo, photos, servicePhotos, styleGuide, styledLooks, uploadAlt, videos } from './photos.ts';

test('every lash card points at a bookable main option', () => {
  assert.equal(lashCards.length, 6);
  for (const c of lashCards) {
    const s = services.find((x) => x.id === c.serviceId)!;
    assert.ok(s && bookableWith(s).id === s.id, c.serviceId);
    assert.ok(mainOptions(s).some((o) => o.id === c.optionId), c.optionId);
  }
});
// The admin (/admin/) edits src/data/photo-admin.json, so no test may pin a count or an id that it can change.
test('photo-admin.json: the ten groups, no unknown place, every id known with the right dir and ratio', () => {
  assert.deepEqual(Object.keys(adminData.groups).sort(), adminGroups.map((g) => g.id).sort());
  assert.equal(adminGroups.length, 10);
  assert.equal(adminSlots.length, 18);
  for (const g of adminGroups) {
    const ids = adminData.groups[g.id];
    assert.equal(new Set(ids).size, ids.length, g.id);
    for (const id of ids) {
      const p = videos[id] ? photo(videos[id].poster) : photo(id);
      assert.equal(p.dir, g.dir, id); assert.equal(p.ratio, g.ratio, id);
      assert.ok(!/^AI-generated/.test(p.alt.en), id);
    }
  }
  for (const [key, id] of Object.entries(adminData.slots)) {
    const s = adminSlots.find((x) => x.key === key)!;
    assert.ok(s, key); assert.equal(photo(id).ratio, s.ratio, key); assert.equal(photo(id).dir, s.dir, key);
  }
  photo(nailVideo.poster); photo(browVideo.poster); photo(homeHero);
});
test('the site lists are built from photo-admin.json', () => {
  assert.deepEqual(styledLooks.map((l) => l.photo), adminData.groups.styled);
  const cards = new Set(lashCards.map((c) => c.photo));
  assert.deepEqual(lashGroups.find((g) => g.id === 'styled')!.items, adminData.groups.styled.filter((id) => !cards.has(id)));
  assert.deepEqual(nailGroups.map((g) => g.items), nailGroups.map((g) => adminData.groups[g.id]));
  assert.deepEqual(browGroups.map((g) => g.items), browGroups.map((g) => adminData.groups[g.id]));
  for (const c of lashCards) assert.equal(photo(c.photo).ratio, '4:3');
});
test('an upload is a photo with a generated alt; a place override wins and drops the old position tweak', () => {
  const u = { dir: 'lash', ratio: '4:3', where: 'styled' } as const;
  assert.deepEqual({ en: uploadAlt(u, 'look:mermaid').en, zh: uploadAlt(u, 'look:mermaid').zh }, { en: 'Mermaid – lash extensions by Abby, Burwood', zh: '人鱼，Abby 嫁接睫毛，Burwood' });
  assert.equal(uploadAlt(u, undefined).en, 'Styled sets – lash extensions by Abby, Burwood');
  assert.equal(uploadAlt({ dir: 'nails', ratio: '3:4', where: 'page:gel-nails:hero' }, undefined).zh, '凝胶美甲，Abby 美甲，Burwood');
  assert.equal(lookName('styled-fairy')!.en, 'Fairy');
  assert.equal(lookName('hero-mirror'), undefined);
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
