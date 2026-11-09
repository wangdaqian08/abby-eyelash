import test from 'node:test';
import assert from 'node:assert/strict';
import { site } from '../data/site.ts';
import { bookedIntervals } from './google-calendar.ts';
import { zonedTimeToUtc } from './availability.ts';

const TZ = site.timezone;
const t = (time: string) => `2026-11-21T${time}:00+11:00`; // Sydney summer time

test('only 💗 events block: personal, all-day "rent" and cancelled ones do not', () => {
  const busy = bookedIntervals(
    [
      { summary: 'rent', start: { date: '2026-11-21' }, end: { date: '2026-11-22' } },
      { summary: '约医生', start: { dateTime: t('09:00') }, end: { dateTime: t('10:00') } },
      { summary: '给妈妈买花💗', start: { dateTime: t('10:00') }, end: { dateTime: t('11:00') } }, // 💗 not at the start
      { summary: '💗 ⏳ Lily – Lash lift', start: { dateTime: t('14:00') }, end: { dateTime: t('15:00') } },
      { summary: '  💗 Mia', start: { dateTime: t('16:00') }, end: { dateTime: t('17:00') } }, // leading spaces are fine
      { summary: '💗 cancelled', status: 'cancelled', start: { dateTime: t('18:00') }, end: { dateTime: t('19:00') } },
      { start: { dateTime: t('19:00') }, end: { dateTime: t('20:00') } }, // no title
    ],
    TZ,
  );
  assert.deepEqual(busy, [
    { start: Date.parse(t('14:00')), end: Date.parse(t('15:00')) },
    { start: Date.parse(t('16:00')), end: Date.parse(t('17:00')) },
  ]);
});

test('an all-day 💗 event (holiday) blocks the whole Sydney day', () => {
  const [day] = bookedIntervals([{ summary: '💗 休假', start: { date: '2026-11-21' }, end: { date: '2026-11-22' } }], TZ);
  assert.deepEqual(day, { start: zonedTimeToUtc('2026-11-21', '00:00', TZ), end: zonedTimeToUtc('2026-11-22', '00:00', TZ) });
});
