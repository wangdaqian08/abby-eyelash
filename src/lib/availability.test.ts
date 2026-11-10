import test from 'node:test';
import assert from 'node:assert/strict';
import { site } from '../data/site.ts';
import {
  zonedTimeToUtc,
  localDate,
  slotsForDate,
  hoursOn,
  monthAvailability,
  busyQueryRange,
  mockBusy,
  validateDetails,
} from './availability.ts';

const TZ = site.timezone;
// Fixed rules so these tests don't change when Abby edits her hours or buffer in site.ts.
const R = {
  ...site,
  booking: { ...site.booking, bufferMinutes: 15 },
  hours: [1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '10:00', close: '20:00' })).concat({ day: 0, open: '09:00', close: '20:00', nth: 3 } as never),
};
const at = (iso: string) => Date.parse(iso);
const syd = (date: string, time: string) => zonedTimeToUtc(date, time, TZ);
const EARLY = at('2026-11-01T00:00:00Z'); // "now" well before the test dates

test('Mon 10:00–20:00, 60 min: every 30 min, and 20:00 is still a valid (last) start', () => {
  const s = slotsForDate('2026-11-16', 60, [], EARLY, R);
  assert.equal(s[0], '10:00');
  assert.equal(s.at(-1), '20:00');
  assert.equal(s.length, 21);
});

test('last start does not depend on duration: a 150 min service can still start at 20:00', () => {
  assert.equal(slotsForDate('2026-11-21', 150, [], EARLY, R).at(-1), '20:00');
});

test('several services: the last one must still start by the last start time', () => {
  // 120 min of other services first (lead), then the longest one: the visit can start at 18:00 at the latest
  assert.equal(slotsForDate('2026-11-21', 270, [], EARLY, R, 120).at(-1), '18:00');
  assert.deepEqual(monthAvailability('2026-11', 270, [], EARLY, R, 120)['2026-11-21'], slotsForDate('2026-11-21', 270, [], EARLY, R, 120));
});

test('Sundays: only the 3rd Sunday of the month is open, from 09:00', () => {
  assert.equal(slotsForDate('2026-11-15', 60, [], EARLY, R)[0], '09:00'); // 3rd Sunday of Nov 2026
  for (const d of ['2026-11-01', '2026-11-08', '2026-11-22', '2026-11-29']) assert.deepEqual(slotsForDate(d, 60, [], EARLY, R), [], d);
  assert.equal(hoursOn('2026-11-15', R)?.nth, 3);
  assert.equal(hoursOn('2026-11-22', R), undefined);
});

test('15-min buffer applies on both sides of a busy event', () => {
  const busy = [{ start: syd('2026-11-16', '12:00'), end: syd('2026-11-16', '13:00') }];
  const s = slotsForDate('2026-11-16', 60, busy, EARLY, R);
  assert.ok(s.includes('10:30')); // ends 11:30, before 11:45
  assert.ok(!s.includes('11:00')); // ends 12:00, inside buffer
  assert.ok(!s.includes('12:30'));
  assert.ok(!s.includes('13:00')); // starts inside 13:00–13:15 buffer
  assert.ok(s.includes('13:30'));
});

test('site rules: a booking ending 15:30 can be followed by a 15:30 start', () => {
  const busy = [{ start: syd('2026-11-14', '12:00'), end: syd('2026-11-14', '15:30') }];
  assert.equal(slotsForDate('2026-11-14', 120, busy, EARLY, site).find((t) => t >= '12:00'), '15:30');
});

test('min notice 3h', () => {
  const now = syd('2026-11-16', '10:10');
  assert.equal(slotsForDate('2026-11-16', 60, [], now, R)[0], '13:30');
});

test('past dates and dates beyond 60 days are closed', () => {
  const now = syd('2026-11-16', '08:00');
  assert.deepEqual(slotsForDate('2026-11-14', 60, [], now, R), []);
  assert.ok(slotsForDate('2027-01-15', 60, [], now, R).length > 0); // today + 60
  assert.deepEqual(slotsForDate('2027-01-16', 60, [], now, R), []);
});

test('DST ends 2026-04-05: +11 before, +10 after; busy times map to the right wall clock', () => {
  assert.equal(syd('2026-04-04', '09:00'), at('2026-04-03T22:00:00Z'));
  assert.equal(syd('2026-04-06', '10:00'), at('2026-04-06T00:00:00Z'));
  assert.equal(localDate(at('2026-04-05T00:00:00Z'), TZ), '2026-04-05');
  // Busy 01:00–02:00Z on Mon 6 Apr is 11:00–12:00 AEST; a fixed +11 offset would put it at 12:00–13:00.
  const busy = [{ start: at('2026-04-06T01:00:00Z'), end: at('2026-04-06T02:00:00Z') }];
  const s = slotsForDate('2026-04-06', 30, busy, at('2026-04-01T00:00:00Z'), R);
  assert.deepEqual(s.slice(0, 2), ['10:00', '12:30']); // 10:30–12:00 blocked incl. buffer
});

test('DST starts 2026-10-04: +10 before, +11 after', () => {
  assert.equal(syd('2026-10-03', '09:00'), at('2026-10-02T23:00:00Z'));
  assert.equal(syd('2026-10-05', '10:00'), at('2026-10-04T23:00:00Z'));
  // Busy 00:00–01:00Z on Mon 5 Oct is 11:00–12:00 AEDT.
  const busy = [{ start: at('2026-10-05T00:00:00Z'), end: at('2026-10-05T01:00:00Z') }];
  const s = slotsForDate('2026-10-05', 30, busy, at('2026-10-01T00:00:00Z'), R);
  assert.deepEqual(s.slice(0, 2), ['10:00', '12:30']);
});

test('monthAvailability lists only days with slots; fully busy days are absent', () => {
  const now = syd('2026-11-10', '12:00');
  const range = busyQueryRange('2026-11', now, site)!;
  const days = monthAvailability('2026-11', 60, mockBusy(range, TZ), now, R);
  assert.ok(!('2026-11-09' in days)); // past
  assert.ok(!('2026-11-12' in days)); // mock: 12 % 6 === 0 → fully booked
  assert.ok('2026-11-11' in days);
  assert.ok(Object.values(days).every((s) => s.length > 0));
});

test('busyQueryRange is null outside the bookable window', () => {
  const now = syd('2026-11-10', '12:00');
  assert.equal(busyQueryRange('2026-10', now, site), null);
  assert.equal(busyQueryRange('2027-02', now, site), null);
  assert.ok(busyQueryRange('2027-01', now, site));
});

test('validateDetails: AU phone, lengths', () => {
  const ok = { name: 'Mia Chen', phone: '0412 345 678', notes: '' };
  assert.deepEqual(validateDetails(ok), {});
  for (const phone of ['+61 412 345 678', '(02) 9744 1234', '61412345678']) {
    assert.deepEqual(validateDetails({ ...ok, phone }), {}, phone);
  }
  for (const phone of ['12345', '0512345678', '+1 415 555 0100']) {
    assert.equal(validateDetails({ ...ok, phone }).phone, 'invalid', phone);
  }
  assert.equal(validateDetails({ ...ok, name: ' ' }).name, 'required');
  assert.equal(validateDetails({ ...ok, name: 'x'.repeat(81) }).name, 'tooLong');
  assert.equal(validateDetails({ ...ok, name: 'Mia\nChen' }).name, 'invalid');
  assert.equal(validateDetails({ ...ok, notes: 'x'.repeat(501) }).notes, 'tooLong');
});
