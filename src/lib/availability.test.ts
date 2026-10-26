import test from 'node:test';
import assert from 'node:assert/strict';
import { site } from '../data/site.ts';
import {
  zonedTimeToUtc,
  localDate,
  slotsForDate,
  monthAvailability,
  busyQueryRange,
  mockBusy,
  validateDetails,
} from './availability.ts';

const TZ = site.timezone;
const at = (iso: string) => Date.parse(iso);
const syd = (date: string, time: string) => zonedTimeToUtc(date, time, TZ);
const EARLY = at('2026-11-01T00:00:00Z'); // "now" well before the test dates

test('Mon 09:00–19:00, 60 min: every 30 min until start+duration fits before close', () => {
  const s = slotsForDate('2026-11-16', 60, [], EARLY, site);
  assert.equal(s[0], '09:00');
  assert.equal(s.at(-1), '18:00');
  assert.equal(s.length, 19);
});

test('Saturday closes 18:00: 150 min service last start is 15:30', () => {
  assert.equal(slotsForDate('2026-11-21', 150, [], EARLY, site).at(-1), '15:30');
});

test('15-min buffer applies on both sides of a busy event', () => {
  const busy = [{ start: syd('2026-11-16', '11:00'), end: syd('2026-11-16', '12:00') }];
  const s = slotsForDate('2026-11-16', 60, busy, EARLY, site);
  assert.ok(s.includes('09:30')); // ends 10:30, before 10:45
  assert.ok(!s.includes('10:00')); // ends 11:00, inside buffer
  assert.ok(!s.includes('11:30'));
  assert.ok(!s.includes('12:00')); // starts inside 12:00–12:15 buffer
  assert.ok(s.includes('12:30'));
});

test('min notice 3h', () => {
  const now = syd('2026-11-16', '10:10');
  assert.equal(slotsForDate('2026-11-16', 60, [], now, site)[0], '13:30');
});

test('past dates and dates beyond 60 days are closed', () => {
  const now = syd('2026-11-16', '08:00');
  assert.deepEqual(slotsForDate('2026-11-15', 60, [], now, site), []);
  assert.ok(slotsForDate('2027-01-15', 60, [], now, site).length > 0); // today + 60
  assert.deepEqual(slotsForDate('2027-01-16', 60, [], now, site), []);
});

test('DST ends first Sunday of April (2026-04-05): +11 Saturday, +10 Sunday', () => {
  assert.equal(syd('2026-04-04', '09:00'), at('2026-04-03T22:00:00Z'));
  assert.equal(syd('2026-04-05', '10:00'), at('2026-04-05T00:00:00Z'));
  assert.equal(localDate(at('2026-04-05T00:00:00Z'), TZ), '2026-04-05');
  // Busy 01:00–02:00Z is 11:00–12:00 AEST; a fixed +11 offset would put it at 12:00–13:00.
  const busy = [{ start: at('2026-04-05T01:00:00Z'), end: at('2026-04-05T02:00:00Z') }];
  const s = slotsForDate('2026-04-05', 30, busy, at('2026-04-01T00:00:00Z'), site);
  assert.deepEqual(s.slice(0, 2), ['10:00', '12:30']); // 10:30–12:00 blocked incl. buffer
  assert.equal(s.at(-1), '16:30'); // Sun closes 17:00
});

test('DST starts first Sunday of October (2026-10-04): +10 Saturday, +11 Sunday', () => {
  assert.equal(syd('2026-10-03', '09:00'), at('2026-10-02T23:00:00Z'));
  assert.equal(syd('2026-10-04', '10:00'), at('2026-10-03T23:00:00Z'));
  // Busy 00:00–01:00Z is 11:00–12:00 AEDT.
  const busy = [{ start: at('2026-10-04T00:00:00Z'), end: at('2026-10-04T01:00:00Z') }];
  const s = slotsForDate('2026-10-04', 30, busy, at('2026-10-01T00:00:00Z'), site);
  assert.deepEqual(s.slice(0, 2), ['10:00', '12:30']);
});

test('monthAvailability lists only days with slots; fully busy days are absent', () => {
  const now = syd('2026-11-10', '12:00');
  const range = busyQueryRange('2026-11', now, site)!;
  const days = monthAvailability('2026-11', 60, mockBusy(range, TZ), now, site);
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

test('validateDetails: AU phone, email, lengths', () => {
  const ok = { name: 'Mia Chen', phone: '0412 345 678', email: 'mia@example.com', notes: '' };
  assert.deepEqual(validateDetails(ok), {});
  for (const phone of ['+61 412 345 678', '(02) 9744 1234', '61412345678']) {
    assert.deepEqual(validateDetails({ ...ok, phone }), {}, phone);
  }
  for (const phone of ['12345', '0512345678', '+1 415 555 0100']) {
    assert.equal(validateDetails({ ...ok, phone }).phone, 'invalid', phone);
  }
  assert.equal(validateDetails({ ...ok, email: 'a@b' }).email, 'invalid');
  assert.equal(validateDetails({ ...ok, name: ' ' }).name, 'required');
  assert.equal(validateDetails({ ...ok, name: 'x'.repeat(81) }).name, 'tooLong');
  assert.equal(validateDetails({ ...ok, name: 'Mia\nChen' }).name, 'invalid');
  assert.equal(validateDetails({ ...ok, notes: 'x'.repeat(501) }).notes, 'tooLong');
});
