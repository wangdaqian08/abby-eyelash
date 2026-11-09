import test from 'node:test';
import assert from 'node:assert/strict';
import { bookable, bookableWith, depositFor, findOption, itemsParam, parseAddons, parseItems, priceText, quote, quoteAll, quoteAllText, quoteText, addonsParam, services } from './services.ts';

const L = 'lash-extensions';

test('quote: main option + add-on adds price and minutes', () => {
  const base = findOption(L, 'classic-natural')!;
  const bottom = quote(L, 'bottom-full', {}); // add-on can't be booked alone
  assert.equal(bottom, null);
  const q = quote(L, 'classic-natural', { 'bottom-full': 1 })!;
  assert.equal(q.minutes, base.minutes + 15);
  assert.equal(q.price, base.price + 35);
  assert.equal(q.extras.length, 1);
});

test('quote: rejects either/or clashes, units out of range, unknown ids and add-ons on removal', () => {
  assert.equal(quote(L, 'classic-natural', { 'bottom-full': 1, 'bottom-natural': 1 }), null);
  assert.equal(quote(L, 'classic-natural', { 'bottom-full': 2 }), null);
  assert.equal(quote(L, 'classic-natural', { 'bottom-full': 0 }), null);
  assert.equal(quote(L, 'classic-natural', { nope: 1 }), null);
  assert.equal(quote(L, 'removal', { 'bottom-full': 1 }), null);
  assert.ok(quote(L, 'removal', {}));
  const set = findOption(L, 'classic-natural')!;
  const both = quote(L, 'classic-natural', { removal: 1, 'bottom-full': 1 })!; // removal adds onto a full set, add-ons kept
  assert.equal(both.extras.length, 2);
  assert.equal(both.minutes, set.minutes + 15 + 15);
  assert.equal(quote(L, 'classic-natural', { removal: 2 }), null);
  assert.deepEqual(quote(L, 'classic-natural', { removal: 1, 'bottom-full': 1 })!.extras.map((e) => e.option.id), ['bottom-full', 'removal']); // menu order, not tick order
  assert.equal(quote('nope', 'classic-natural', {}), null);
});

test('price range: removal reads "$10–$20" / "$10 起至 $20"', () => {
  const o = findOption(L, 'removal')!;
  assert.equal(priceText(o, 'en'), '$10–$20');
  assert.equal(priceText(o, 'zh'), '$10 起至 $20');
});

test('parseAddons / addonsParam round-trip and reject junk', () => {
  assert.deepEqual(parseAddons(''), {});
  assert.deepEqual(parseAddons('bottom-full:1'), { 'bottom-full': 1 });
  assert.equal(addonsParam({ b: 2, a: 1, z: 0 }), 'a:1,b:2');
  for (const bad of ['bottom-full', 'x:1,x:2', 'A:1', 'x:100', 'x:1;', ',']) assert.equal(parseAddons(bad), null, bad);
});

test('nail extensions: one shared per-nail add-on, booked on top of a gel or hand-painted design', () => {
  const ext = findOption('gel-nails', 'solid')!;
  const q = quote('gel-nails', 'solid', { extension: 4 })!;
  assert.equal(q.price, ext.price + 4 * 6);
  assert.equal(quote('gel-nails', 'solid', { extension: 11 }), null); // max 10 nails
  assert.equal(quote('nail-extensions', 'extension', {}), null); // add-on-only service can't be booked alone
  assert.equal(bookableWith(services.find((s) => s.id === 'nail-extensions')!).id, 'gel-nails');
  assert.ok(!bookable().some((s) => s.id === 'nail-extensions'));
  const art = quote('handcrafted-nails', 'nail-art', { extension: 2 })!;
  assert.equal(art.onRequest, true);
  assert.equal(art.price, 12); // only the add-on is priced; the design is quoted by Abby
});

test('infill is a share of the last price: shown as a percentage, never a dollar amount', () => {
  const o = findOption(L, 'infill-2w')!;
  assert.equal(o.pct, 50);
  assert.equal(o.price, 0);
  assert.equal(priceText(o, 'en'), '50% of your last price');
  assert.equal(priceText(o, 'zh'), '上次价格的 50%');
  assert.equal(quoteText(quote(L, 'infill-2w', {})!, 'zh'), '上次价格的 50%');
  assert.equal(quoteText(quote(L, 'infill-2w', { 'bottom-full': 1 })!, 'en'), '50% of your last price + $35');
  assert.equal(quoteText(quote(L, 'classic-natural', {})!, 'en'), `$${findOption(L, 'classic-natural')!.price}`);
});

test('several services in one booking: durations, prices and deposits add up', () => {
  const lash = quote(L, 'classic-natural', { 'bottom-full': 1 })!;
  const gel = quote('gel-nails', 'solid', { extension: 4 })!;
  const brows = quote('powder-brows', 'powder', {})!;
  const two = quoteAll([{ service: L, option: 'classic-natural', addons: { 'bottom-full': 1 } }, { service: 'gel-nails', option: 'solid', addons: { extension: 4 } }])!;
  assert.equal(two.minutes, lash.minutes + gel.minutes);
  assert.equal(two.price, lash.price + gel.price);
  assert.equal(two.deposit, 40); // $20 + $20
  assert.equal(quoteAllText(two, 'en'), `$${lash.price + gel.price}`);
  const three = quoteAll([{ service: L, option: 'classic-natural', addons: {} }, { service: 'powder-brows', option: 'powder', addons: {} }, { service: 'gel-nails', option: 'solid', addons: {} }])!;
  assert.equal(three.deposit, 70); // $20 lashes + $30 brows + $20 nails
  assert.equal(three.minutes, findOption(L, 'classic-natural')!.minutes + brows.minutes + findOption('gel-nails', 'solid')!.minutes);
  assert.equal(three.lead, three.minutes - brows.minutes); // brows is the longest, so it goes last
  assert.equal(quoteAll([{ service: 'lash-lift', option: 'keratin-lift', addons: {} }])!.lead, 0);
});

test('several services: mixed prices stay honest, bad combinations are rejected', () => {
  const mixed = quoteAll([{ service: L, option: 'infill-2w', addons: {} }, { service: 'handcrafted-nails', option: 'nail-art', addons: { extension: 2 } }])!;
  assert.equal(quoteAllText(mixed, 'en'), '50% of your last price + Price on request + $12');
  assert.equal(quoteAll([]), null);
  assert.equal(quoteAll([{ service: L, option: 'classic-natural', addons: {} }, { service: L, option: 'classic-full', addons: {} }]), null); // same service twice
  assert.equal(quoteAll([{ service: L, option: 'classic-natural', addons: {} }, { service: 'gel-nails', option: 'nope', addons: {} }]), null);
  assert.equal(depositFor([services.find((s) => s.id === 'powder-brows')!]), 30);
  assert.equal(depositFor([services.find((s) => s.id === L)!]), 20);
});

test('items param round-trips and rejects malformed input', () => {
  const items = [{ service: L, option: 'classic-natural', addons: { 'bottom-full': 1 } }, { service: 'gel-nails', option: 'solid', addons: {} }];
  assert.equal(itemsParam(items), 'lash-extensions/classic-natural/bottom-full:1;gel-nails/solid/');
  assert.deepEqual(parseItems(itemsParam(items)), items);
  for (const bad of ['', 'lash-extensions', 'a/b', 'a/b/x:1,x:2', 'A/b/', 'a/b/;', 'a/b/;'.repeat(7)]) assert.equal(parseItems(bad), null, bad);
});

// Every lash-extension choice the booking form can make: main option (or none) × bottom lashes × removal.
test('lash extensions: all main × bottom × removal permutations', () => {
  const s = services.find((x) => x.id === L)!;
  const mains = s.options.filter((o) => !o.addon);
  const removal = s.options.find((o) => o.id === 'removal')!;
  let valid = 0;
  for (const main of [undefined, ...mains])
    for (const bottom of [undefined, 'bottom-natural', 'bottom-full'])
      for (const rem of [false, true]) {
        const addons: Record<string, number> = { ...(bottom && { [bottom]: 1 }), ...(rem && { removal: 1 }) };
        const id = `${main?.id ?? '-'}/${bottom ?? '-'}/${rem}`;
        if (!main) {
          // no main option: only removal on its own is bookable (the form sends it as the option)
          if (bottom) {
            // bottom lashes need a set: rejected with or without removal
            assert.equal(quote(L, 'removal', { [bottom]: 1 }), null, id);
            assert.equal(quote(L, bottom, rem ? { removal: 1 } : {}), null, id);
          } else if (rem) {
            const q = quote(L, 'removal', {})!;
            assert.deepEqual([q.minutes, q.price, q.from, q.extras.length], [removal.minutes, removal.price, true, 0], id);
            valid++;
          }
          continue;
        }
        const q = quote(L, main.id, addons);
        if (main.noRemoval && rem) {
          assert.equal(q, null, id); // infill means the lashes were done here: no removal
          continue;
        }
        assert.ok(q, id);
        const extras = s.options.filter((o) => o.id in addons);
        assert.equal(q.minutes, main.minutes + extras.reduce((n, o) => n + o.minutes, 0), id);
        assert.equal(q.price, main.price + extras.reduce((n, o) => n + o.price, 0), id);
        assert.equal(q.from, !!main.from || rem, id); // removal is "$10–20", so a total with it is "from"
        assert.deepEqual(parseItems(itemsParam([{ service: L, option: main.id, addons }])), [{ service: L, option: main.id, addons }], id);
        valid++;
      }
  const infills = mains.filter((o) => o.noRemoval).length;
  assert.equal(infills, 3);
  assert.equal(valid, mains.length * 3 * 2 - infills * 3 + 1); // 8 mains × 3 × 2, minus infill + removal, + removal alone = 40
});

test('per-nail extensions: 0..max units valid, max+1 rejected, for every design', () => {
  for (const s of services.filter((x) => x.id === 'gel-nails' || x.id === 'handcrafted-nails'))
    for (const o of s.options.filter((x) => !x.addon)) {
      for (let n = 0; n <= 10; n++) assert.ok(quote(s.id, o.id, n ? { extension: n } : {}), `${s.id}/${o.id}/${n}`);
      assert.equal(quote(s.id, o.id, { extension: 11 }), null);
    }
});

test('every subset of bookable services adds up (minutes, dollars, deposit)', () => {
  const list = bookable();
  for (let mask = 1; mask < 1 << list.length; mask++) {
    const pick = list.filter((_, i) => mask & (1 << i));
    const items = pick.map((s) => ({ service: s.id, option: s.options.find((o) => !o.addon)!.id, addons: {} }));
    const all = quoteAll(items)!;
    const one = items.map((i) => quote(i.service, i.option, i.addons)!);
    assert.ok(all, String(mask));
    assert.equal(all.minutes, one.reduce((n, q) => n + q.minutes, 0));
    assert.equal(all.price, one.reduce((n, q) => n + q.price, 0));
    assert.equal(all.deposit, depositFor(pick));
    assert.deepEqual(parseItems(itemsParam(items)), items);
  }
  // removal alone combines with other services too
  assert.ok(quoteAll([{ service: L, option: 'removal', addons: {} }, { service: 'gel-nails', option: 'solid', addons: { extension: 3 } }]));
});
