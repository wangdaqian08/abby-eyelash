import test from 'node:test';
import assert from 'node:assert/strict';
import { allDurations, bookable, bookableWith, findOption, parseAddons, quote, addonsParam, services } from './services.ts';

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

test('allDurations covers base, base + add-on, and removal without add-ons', () => {
  const d = allDurations();
  const base = findOption(L, 'classic-natural')!.minutes;
  assert.ok(d.includes(base) && d.includes(base + 15));
  assert.ok(d.includes(findOption(L, 'removal')!.minutes));
  for (const q of [quote(L, 'hybrid-full', { 'bottom-natural': 1 })!, quote('lash-lift', 'keratin-lift', {})!]) assert.ok(d.includes(q.minutes));
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
