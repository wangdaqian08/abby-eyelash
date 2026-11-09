import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aliasHant, byLang, convertWith, zhStrings } from './hant.ts';
import { bookingText } from '../components/booking/booking-text.ts';
import { priceText, services } from '../data/services.ts';
import { common } from '../i18n/common.ts';
import { bookingStrings } from '../i18n/booking.ts';

test("aliasHant: every { en, zh } pair reads 'zh-hant' as zh, without changing keys or JSON", () => {
  const data = { a: { en: 'Hi', zh: '你好' }, list: [{ name: { en: 'x', zh: '项' } }], other: { en: 1 } };
  aliasHant(data);
  assert.equal((data.a as Record<string, string>)['zh-hant'], '你好');
  assert.equal((data.list[0].name as Record<string, string>)['zh-hant'], '项');
  assert.equal('zh-hant' in data.other, false); // not a pair
  assert.deepEqual(Object.keys(data.a), ['en', 'zh']);
  assert.equal(JSON.stringify(data.a), '{"en":"Hi","zh":"你好"}');
});

test('site text is readable in every language', () => {
  assert.equal(common['zh-hant'], common.zh);
  assert.equal(bookingStrings['zh-hant'].submit, bookingStrings.zh.submit);
  assert.equal(services[0].name['zh-hant'], services[0].name.zh);
  assert.equal(byLang({ en: 1, zh: 2 })['zh-hant'], 2);
});

test('booking app on a Traditional page: the converted copy replaces every booking text', () => {
  // What BookingApp.astro hands over: zhStrings(bookingText), then converted with the page. Fake a conversion here.
  const zh = zhStrings(bookingText);
  assert.ok(zh.length > 50);
  assert.equal(new Set(zh).size, zh.length);
  assert.ok(zh.includes(bookingStrings.zh.msg.header) && zh.includes(services[0].name.zh));
  const converted = zh.map((s) => `«${s}»`);
  const copy = structuredClone({ bookingStrings: { en: bookingStrings.en, zh: bookingStrings.zh }, services: services.map((s) => ({ name: { ...s.name } })) });
  aliasHant(copy, convertWith(copy, zhStrings(copy).map((s) => `«${s}»`)));
  assert.equal((copy.bookingStrings as unknown as Record<string, typeof bookingStrings.zh>)['zh-hant'].msg.header, `«${bookingStrings.zh.msg.header}»`);
  assert.equal((copy.services[0].name as Record<string, string>)['zh-hant'], `«${services[0].name.zh}»`);
  assert.equal(copy.bookingStrings.zh.msg.header, bookingStrings.zh.msg.header); // the Simplified stays as it was
  // The real module: aliasing it with a converter puts converted text behind 'zh-hant', and leaves zh alone.
  const before = services[0].name.zh;
  aliasHant(bookingText, convertWith(bookingText, converted));
  try {
    assert.equal(services[0].name['zh-hant'], `«${before}»`);
    assert.equal(priceText({ price: 0, onRequest: true }, 'zh-hant'), '«定制价，需咨询»');
    assert.equal(services[0].name.zh, before);
  } finally {
    aliasHant(bookingText); // back to the server alias for the other tests
  }
});
