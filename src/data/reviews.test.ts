import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoDummyAtLaunch, reviews } from './reviews.ts';
import { hoursRows, priceLine } from '../i18n/common.ts';
import { groupAt, services } from './services.ts';
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
    { days: 'Monday – Saturday', time: '10:00 am – 8:00 pm' },
    { days: 'Sunday (3rd of the month only)', time: '9:00 am – 8:00 pm' },
  ]);
  assert.deepEqual(hoursRows(site.hours, 'zh'), [
    { days: '周一至周六', time: '10:00 – 20:00' },
    { days: '周日（仅每月第 3 个）', time: '9:00 – 20:00' },
  ]);
  const noMonday = site.hours.filter((h) => h.day !== 1);
  assert.deepEqual(hoursRows(noMonday, 'en')[0], { days: 'Monday', time: 'Closed' });
  assert.equal(hoursRows([{ day: 2, open: '12:00', close: '00:30' }], 'en')[1].time, '12:00 pm – 12:30 am');
});

test('priceLine derives "from" price and duration range from services.ts', () => {
  const by = (id: string) => services.find((s) => s.id === id)!;
  assert.equal(priceLine(by('lash-extensions'), 'en'), 'from $80 · 50–75 min');
  assert.equal(priceLine(by('lash-lift'), 'en'), '$80 · 60 min');
  assert.equal(priceLine(by('handcrafted-nails'), 'zh'), '定制价，需咨询 · 120 分钟');
  assert.equal(priceLine(by('powder-brows'), 'en'), '$480 (was $580) · 120 min');
  assert.equal(priceLine(by('nail-extensions'), 'zh'), '$6 / 只');
  assert.equal(priceLine(by('gel-nails'), 'en'), 'from $70 · 75–80 min');
});

test('groupAt: one heading per lash group, none for ungrouped services', () => {
  const heads = (id: string) => {
    const o = services.find((s) => s.id === id)!.options;
    return o.flatMap((_, i) => (groupAt(o, i) ? [groupAt(o, i)!.zh] : []));
  };
  assert.deepEqual(heads('lash-extensions'), ['全套', '下睫毛', '回补', '卸睫毛']);
  assert.deepEqual(heads('gel-nails'), []);
});
