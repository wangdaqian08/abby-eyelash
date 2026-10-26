import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoDummyAtLaunch, reviews } from './reviews.ts';
import { hoursRows, priceLine } from '../i18n/common.ts';
import { services } from './services.ts';
import { site } from './site.ts';

test('launch guard throws only when LAUNCH=1 and dummy data remains', () => {
  assert.throws(() => assertNoDummyAtLaunch([{ dummy: false }, { dummy: true }], '1'), /Dummy reviews present/);
  assert.doesNotThrow(() => assertNoDummyAtLaunch([{ dummy: true }], undefined));
  assert.doesNotThrow(() => assertNoDummyAtLaunch([{ dummy: true }], '0'));
  assert.doesNotThrow(() => assertNoDummyAtLaunch([{ dummy: false }], '1'));
  assert.equal(reviews.length, 6);
});

test('hoursRows groups consecutive days, Monday first, and formats per locale', () => {
  assert.deepEqual(hoursRows(site.hours, 'en'), [
    { days: 'Monday – Friday', time: '9:00 am – 7:00 pm' },
    { days: 'Saturday', time: '9:00 am – 6:00 pm' },
    { days: 'Sunday', time: '10:00 am – 5:00 pm' },
  ]);
  assert.deepEqual(hoursRows(site.hours, 'zh')[0], { days: '周一至周五', time: '9:00 – 19:00' });
  const noMonday = site.hours.filter((h) => h.day !== 1);
  assert.deepEqual(hoursRows(noMonday, 'en')[0], { days: 'Monday', time: 'Closed' });
  assert.equal(hoursRows([{ day: 2, open: '12:00', close: '00:30' }], 'en')[1].time, '12:00 pm – 12:30 am');
});

test('priceLine derives "from" price and duration range from services.ts', () => {
  const by = (id: string) => services.find((s) => s.id === id)!;
  assert.equal(priceLine(by('lash-extensions'), 'en'), 'from $65 · 60–150 min');
  assert.equal(priceLine(by('lash-lift'), 'en'), '$90 · 60 min');
  assert.equal(priceLine(by('handcrafted-nails'), 'zh'), '$80 起 · 90 分钟');
});
