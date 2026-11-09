import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { site } from '../data/site.ts';
import { CODE_RE, googleCalendarUrl, newCode, smsHref, validRequest, waTextHref, type CalendarRequest } from './booking-message.ts';
import { onRequestPost } from '../../functions/api/request.ts';
import { onRequestGet } from '../../functions/c/[code].ts';

const r: CalendarRequest = { items: 'lash-lift/keratin-lift/', date: '2026-11-21', time: '14:00', name: '李 Lily', phone: '0412345678', photos: true };
const post = (body: unknown, env = {}) =>
  onRequestPost({ request: new Request('https://x.test/api/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env });
const open = (code: string, env = {}) => onRequestGet({ params: { code }, env });

test('a booking request from the browser is validated; phone normalised, only true is photo consent', () => {
  assert.deepEqual(validRequest({ ...r, phone: '0412 345 678' }), r);
  assert.equal(validRequest({ ...r, photos: 'true' })?.photos, false);
  for (const bad of [{ ...r, items: 'nope/nope/' }, { ...r, name: 'x' }, { ...r, phone: '12345' }, { ...r, date: '2026-13-45' }, { ...r, time: '2pm' }, null, 'x'])
    assert.equal(validRequest(bad), null, JSON.stringify(bad));
});

test('codes: 8 characters, no look-alikes, all different', () => {
  const codes = new Set(Array.from({ length: 2000 }, newCode));
  assert.equal(codes.size, 2000);
  for (const c of codes) assert.match(c, CODE_RE);
  assert.doesNotMatch('0o1il', /[2-9a-hj-km-np-zA]/);
});

test('Google Calendar event: ❤️ ⏳ title, Sydney time, service length, consent, no HTML', () => {
  const u = new URL(googleCalendarUrl({ ...r, name: 'Lily <b>' }, site.timezone));
  assert.equal(u.hostname, 'calendar.google.com');
  assert.match(u.searchParams.get('dates')!, /^20261121T030000Z\/20261121T\d{6}Z$/); // 2 pm AEDT = 03:00 UTC
  assert.match(u.searchParams.get('text')!, /^❤️ ⏳ Lily /);
  assert.doesNotMatch(u.searchParams.get('text')!, /[<>]/);
  assert.match(u.searchParams.get('details')!, /Phone: 0412345678[\s\S]*Photo consent: YES/);
});

test('without a database: request → 503 (message goes out without a link), bad input → 400, link page → 410', async () => {
  assert.equal((await post(r)).status, 503);
  assert.equal((await post({ ...r, phone: 'x' })).status, 400);
  assert.equal((await open('abc')).status, 410);
});

test('SMS and WhatsApp links carry the message', () => {
  assert.equal(smsHref('+61 457 058 649', 'Hi & bye'), 'sms:+61457058649?&body=Hi%20%26%20bye');
  assert.equal(waTextHref('+61 457 058 649', 'Hi'), 'https://wa.me/61457058649?text=Hi');
});

// Needs the local database: npm run db (or npm run start). Skipped when it isn't running.
const DATABASE_URL = 'postgres://abby_app:abby_dev@127.0.0.1:5434/postgres';
const probe = postgres(DATABASE_URL, { max: 1, connect_timeout: 2 });
const up = await probe`SELECT 1`.then(() => true, () => false);
await probe.end();
test('with the database: request → code → /c redirects to Google; after 24 h the link expires and the row goes', { skip: !up && 'local database not running' }, async () => {
  const env = { DATABASE_URL };
  const res = await post({ ...r, phone: '0412 345 678' }, env);
  const { code } = (await res.json()) as { code: string };
  assert.match(code, CODE_RE);
  const go = await open(code, env);
  assert.equal(go.status, 302);
  assert.match(new URL(go.headers.get('location')!).searchParams.get('text')!, /^❤️ ⏳ 李 Lily – Lash Lift/);

  const sql = postgres(DATABASE_URL, { max: 1 });
  await sql`UPDATE abby.booking_request SET created_at = now() - interval '25 hours' WHERE code = ${code}`;
  assert.equal((await open(code, env)).status, 410);
  await post(r, env); // the next request clears expired rows
  assert.equal((await sql`SELECT count(*)::int AS n FROM abby.booking_request WHERE code = ${code}`)[0].n, 0);
  await sql.end();
});
