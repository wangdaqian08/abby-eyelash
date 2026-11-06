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
  assert.equal(quote('nope', 'classic-natural', {}), null);
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

test('several services in one booking: durations and prices add up, deposit is the highest one', () => {
  const lash = quote(L, 'classic-natural', { 'bottom-full': 1 })!;
  const gel = quote('gel-nails', 'solid', { extension: 4 })!;
  const brows = quote('powder-brows', 'powder', {})!;
  const two = quoteAll([{ service: L, option: 'classic-natural', addons: { 'bottom-full': 1 } }, { service: 'gel-nails', option: 'solid', addons: { extension: 4 } }])!;
  assert.equal(two.minutes, lash.minutes + gel.minutes);
  assert.equal(two.price, lash.price + gel.price);
  assert.equal(two.deposit, 20);
  assert.equal(quoteAllText(two, 'en'), `$${lash.price + gel.price}`);
  const three = quoteAll([{ service: L, option: 'classic-natural', addons: {} }, { service: 'powder-brows', option: 'powder', addons: {} }, { service: 'gel-nails', option: 'solid', addons: {} }])!;
  assert.equal(three.deposit, 50);
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
  assert.equal(depositFor([services.find((s) => s.id === 'powder-brows')!]), 50);
  assert.equal(depositFor([services.find((s) => s.id === L)!]), 20);
});

test('items param round-trips and rejects malformed input', () => {
  const items = [{ service: L, option: 'classic-natural', addons: { 'bottom-full': 1 } }, { service: 'gel-nails', option: 'solid', addons: {} }];
  assert.equal(itemsParam(items), 'lash-extensions/classic-natural/bottom-full:1;gel-nails/solid/');
  assert.deepEqual(parseItems(itemsParam(items)), items);
  for (const bad of ['', 'lash-extensions', 'a/b', 'a/b/x:1,x:2', 'A/b/', 'a/b/;', 'a/b/;'.repeat(7)]) assert.equal(parseItems(bad), null, bad);
});
