import test from 'node:test';
import assert from 'node:assert/strict';
import { bookableWith, findOption, mainOptions, priceText, services } from './services.ts';
import { adminData, adminGroups, adminSlots, bookingHref, browVideo, homeHero, photoBooking, lashCards, lashLooks, lookName, nailVideo, photo, photos, servicePhotos, styleGuide, styledLooks, uploadAlt, videos } from './photos.ts';
import { fixture } from './photo-admin.fixture.ts';

test('every lash card points at a bookable main option', () => {
  assert.equal(lashCards.length, 6);
  for (const c of lashCards) {
    const s = services.find((x) => x.id === c.serviceId)!;
    assert.ok(s && bookableWith(s).id === s.id, c.serviceId);
    assert.ok(mainOptions(s).some((o) => o.id === c.optionId), c.optionId);
  }
});
// The admin (/admin/) edits src/data/photo-admin.json, so no test may pin a count or an id that it can change.
test('portfolio groups: 整脸效果 first, then every service style and an Other per service, in site order', () => {
  assert.deepEqual(adminGroups.map((g) => g.id), ['face',
    'lash-extensions/classic-natural', 'lash-extensions/classic-full', 'lash-extensions/hybrid-natural', 'lash-extensions/hybrid-full', 'lash-extensions/styled', 'lash-extensions/other',
    'lash-lift/keratin-lift', 'lash-lift/other',
    'gel-nails/solid', 'gel-nails/cat-eye', 'gel-nails/aurora', 'gel-nails/french', 'gel-nails/other',
    'handcrafted-nails/nail-art', 'handcrafted-nails/other', 'nail-extensions/other', 'powder-brows/powder', 'powder-brows/other']);
  const g = (id: string) => adminGroups.find((x) => x.id === id)!;
  assert.deepEqual([g('face').ratio, g('lash-extensions/styled').ratio, g('lash-lift/other').ratio, g('gel-nails/solid').ratio, g('powder-brows/powder').ratio], ['3:4', '4:3', '4:3', '3:4', '3:4']);
  assert.deepEqual([g('face').name.zh, g('gel-nails/cat-eye').name.zh, g('gel-nails/other').name.zh, g('handcrafted-nails/nail-art').name.zh, g('powder-brows/powder').name.zh], ['整脸效果', '猫眼', '其他', '手绘造型', '雾眉']);
  assert.deepEqual([...new Set(adminGroups.map((x) => x.dir))], ['lash', 'nails', 'brows']);
});
test('photo-admin.json: every group, no unknown place, every id known with the right dir', () => {
  assert.deepEqual(Object.keys(adminData.groups).sort(), adminGroups.map((g) => g.id).sort());
  assert.equal(adminSlots.length, 24); // home hero, 6 lash cards, 11 page photos, 6 link previews
  for (const s of services) assert.equal(adminSlots.find((x) => x.key === `page:${s.id}:og`)?.ratio, '1.91:1', s.id); // every service page has one
  for (const g of adminGroups) {
    for (const id of adminData.groups[g.id]) {
      const p = videos[id] ? photo(videos[id].poster) : photo(id);
      assert.equal(p.dir, g.dir, id);
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
  assert.deepEqual(styledLooks.map((l) => l.photo), adminData.groups['lash-extensions/styled']);
  for (const c of lashCards) assert.equal(photo(c.photo).ratio, '4:3');
});
test('an upload is a photo with a generated alt; a place override wins and drops the old position tweak', () => {
  const d = fixture(); const u = { dir: 'lash', ratio: '4:3', where: 'lash-extensions/styled' } as const;
  d.groups['lash-extensions/styled'].push('u-abcdefghij'); d.labels['u-abcdefghij'] = 'look:mermaid';
  assert.deepEqual({ en: uploadAlt('u-abcdefghij', u, d).en, zh: uploadAlt('u-abcdefghij', u, d).zh }, { en: 'Mermaid – lash extensions by Abby, Burwood', zh: '人鱼，Abby 嫁接睫毛，Burwood' });
  delete d.labels['u-abcdefghij'];
  assert.equal(uploadAlt('u-abcdefghij', u, d).en, 'Styled set – lash extensions by Abby, Burwood');
  assert.deepEqual({ ...uploadAlt('u-0000000000', { dir: 'nails', ratio: '3:4', where: 'page:gel-nails:hero' }, d) }, { en: 'Gel Nails by Abby, Burwood', zh: 'Abby 凝胶美甲，Burwood' }); // the service once
  // the noun is the photo's service, not its folder: a lash lift is not lash extensions
  d.groups['lash-lift/keratin-lift'].push('u-1111111111');
  assert.deepEqual({ ...uploadAlt('u-1111111111', { dir: 'lash', ratio: '4:3', where: 'lash-lift/keratin-lift' }, d) }, { en: 'Keratin lash lift – lash lift by Abby, Burwood', zh: '角蛋白翘睫，Abby 翘睫，Burwood' });
  d.groups['gel-nails/aurora'].push('u-2222222222');
  assert.equal(uploadAlt('u-2222222222', { dir: 'nails', ratio: '3:4', where: 'gel-nails/aurora' }, d).en, 'Aurora – gel nails by Abby, Burwood');
  assert.equal(uploadAlt('u-3333333333', { dir: 'lash', ratio: '3:4', where: 'home-hero' }, d).en, 'Home – lash extensions by Abby, Burwood'); // no service: the folder's noun
  // the name it had before the admin, unless a look name has been chosen for it in the admin since
  assert.equal(lookName('styled-fairy', d)!.en, 'Fairy');
  d.labels['styled-fairy'] = 'look:mermaid';
  assert.equal(lookName('styled-fairy', d)!.en, 'Mermaid');
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
    ...Object.values(adminData.groups).flat(), ...Object.values(servicePhotos).flatMap((s) => [s.hero, s.detail])];
  for (const id of ai) assert.ok(!used.includes(id), id);
  for (const g of styleGuide) assert.ok(findOption('lash-extensions', g.optionId), g.optionId);
});

const data = fixture();
const b = (id: string, edit: (d: typeof data) => void = () => {}) => { const d = structuredClone(data); edit(d); return photoBooking(id, d)!; };
test('photoBooking: a style group books that style and shows its name', () => {
  assert.deepEqual(b('classic-natural-2'), { service: 'lash-extensions', option: 'classic-natural', name: findOption('lash-extensions', 'classic-natural')!.name });
  assert.equal(b('nail-fc1a').name.zh, '猫眼');
  assert.equal(b('brow-3166').name.zh, '雾眉'); // brows now show their style too
  assert.equal(b('nail-8351').name.zh, '手绘造型'); // 定制款 alone says nothing: the service name
});
test('photoBooking: Other books the service only, its name muted', () => {
  assert.deepEqual(b('nail-2020'), { service: 'gel-nails', name: services.find((s) => s.id === 'gel-nails')!.name, muted: true });
  const ext = b('nail-2020', (d) => { d.groups['gel-nails/other'] = []; d.groups['nail-extensions/other'] = ['nail-2020']; });
  assert.deepEqual([ext.service, ext.option, ext.name.zh, ext.muted], ['nail-extensions', undefined, '延长甲', true]);
  assert.equal(bookableWith(services.find((s) => s.id === 'nail-extensions')!).id, 'gel-nails'); // the booking page opens gel nails for it
});
test('photoBooking: a 整脸效果 photo books its own style, or lash extensions when it has none', () => {
  assert.deepEqual([b('styled-half-face').option, b('styled-half-face').name.zh], ['classic-full', '日式单根 · 浓密']);
  assert.deepEqual([b('face-smile').service, b('face-smile').option, b('face-smile').muted], ['lash-extensions', undefined, true]);
});
test('photoBooking: a styled-set photo shows its look name and books the styled set with it', () => {
  assert.deepEqual(b('styled-liner-2'), { service: 'lash-extensions', option: 'styled', look: true, name: lookName('styled-liner-2')! });
  assert.equal(b('styled-liner-2', (d) => { d.labels['styled-liner-2'] = 'look:manga'; }).name.zh, '漫画');
  assert.equal(photoBooking('hero-mirror', data), undefined); // not in the portfolio
});
test('bookingHref', () => {
  assert.equal(bookingHref('zh', 'styled-mermaid', b('styled-mermaid')), '/zh/book?service=lash-extensions&option=styled&look=styled-mermaid');
  assert.equal(bookingHref('en', 'nail-2020', b('nail-2020')), '/book?service=gel-nails');
  assert.equal(bookingHref('en', 'nail-fc1a', b('nail-fc1a')), '/book?service=gel-nails&option=cat-eye');
});

// Live data, so no id is pinned: Abby may change any group (see the rule at the top of this file).
test('the published data is valid and every portfolio photo maps to a booking and a number', async () => {
  const { validateAdmin } = await import('../lib/photo-admin.ts');
  assert.equal(validateAdmin(adminData, adminData, new Set()), null);
  for (const g of adminGroups) for (const id of adminData.groups[g.id]) { assert.ok(photoBooking(id)?.service, id); assert.ok(adminData.numbers[id], id); }
});
