// Pure booking logic shared by the booking UI and the Pages Functions (no I/O, no Node APIs).
// Dates are "YYYY-MM-DD" and times "HH:MM" in the business timezone; instants are epoch ms.

export interface Rules {
  timezone: string;
  hours: readonly { day: number; open: string; close: string }[]; // day 0 = Sunday
  booking: { slotMinutes: number; bufferMinutes: number; minNoticeHours: number; maxAdvanceDays: number };
}
export interface Interval {
  start: number;
  end: number;
}

const MIN = 60_000;
const DAY = 86_400_000;

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function parts(t: number, tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    fmtCache.set(tz, f);
  }
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(t)) p[x.type] = x.value;
  return p;
}

// Offset of `tz` from UTC at instant t (ms): local wall clock read as UTC, minus t.
function tzOffset(t: number, tz: string) {
  const p = parts(t, tz);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(t / 1000) * 1000;
}

/** Wall-clock date+time in `tz` → UTC instant. Correct on both sides of a DST change. */
export function zonedTimeToUtc(date: string, time: string, tz: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let t = wall - tzOffset(wall, tz);
  const o = tzOffset(t, tz); // the guess may sit on the other side of a transition
  if (wall - o !== t) t = wall - o;
  return t;
}

/** Calendar date of instant t in `tz`. */
export function localDate(t: number, tz: string): string {
  const p = parts(t, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10);
}

export const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const toMin = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function daysInMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/** Last bookable calendar date (today + maxAdvanceDays, in the business timezone). */
export const maxDate = (now: number, r: Rules) => addDays(localDate(now, r.timezone), r.booking.maxAdvanceDays);

/** Bookable start times ("HH:MM") on `date` for a service of `minutes`. */
export function slotsForDate(date: string, minutes: number, busy: Interval[], now: number, r: Rules): string[] {
  const { slotMinutes, bufferMinutes, minNoticeHours } = r.booking;
  if (date < localDate(now, r.timezone) || date > maxDate(now, r)) return [];
  const h = r.hours.find((x) => x.day === weekday(date));
  if (!h) return [];
  const earliest = now + minNoticeHours * 60 * MIN;
  const buf = bufferMinutes * MIN;
  const close = toMin(h.close);
  const out: string[] = [];
  for (let m = toMin(h.open); m + minutes <= close; m += slotMinutes) {
    const time = toHHMM(m);
    const start = zonedTimeToUtc(date, time, r.timezone);
    const end = start + minutes * MIN;
    if (start < earliest) continue;
    if (busy.some((b) => start < b.end + buf && end > b.start - buf)) continue;
    out.push(time);
  }
  return out;
}

/** Days of `month` ("YYYY-MM") with at least one slot → their slots. */
export function monthAvailability(month: string, minutes: number, busy: Interval[], now: number, r: Rules) {
  const days: Record<string, string[]> = {};
  for (const date of daysInMonth(month)) {
    const s = slotsForDate(date, minutes, busy, now, r);
    if (s.length) days[date] = s;
  }
  return days;
}

/** UTC window worth querying for busy times in `month` (padded by the buffer), or null if nothing is bookable. */
export function busyQueryRange(month: string, now: number, r: Rules): Interval | null {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const pad = r.booking.bufferMinutes * MIN;
  const start = Math.max(zonedTimeToUtc(`${month}-01`, '00:00', r.timezone), now);
  const end = Math.min(
    zonedTimeToUtc(`${next}-01`, '00:00', r.timezone),
    zonedTimeToUtc(addDays(maxDate(now, r), 1), '00:00', r.timezone),
  );
  return start < end ? { start: start - pad, end: end + pad } : null;
}

/** Deterministic fake busy blocks for demo mode (no Google credentials). */
export function mockBusy(range: Interval, tz: string): Interval[] {
  const out: Interval[] = [];
  const block = (date: string, from: string, to: string) =>
    out.push({ start: zonedTimeToUtc(date, from, tz), end: zonedTimeToUtc(date, to, tz) });
  for (let date = localDate(range.start, tz); zonedTimeToUtc(date, '00:00', tz) < range.end; date = addDays(date, 1)) {
    const d = +date.slice(8);
    if (d % 6 === 0) block(date, '00:00', '23:59'); // fully booked day
    if (d % 3 === 1) block(date, '11:00', '13:00');
    if (d % 2 === 0) block(date, '15:00', '16:30');
  }
  return out;
}

// --- Customer details validation (UI blur checks and the /api/book trust boundary) ---

export const LIMITS = { name: 80, email: 254, notes: 500 } as const;
export const normalisePhone = (s: string) => s.replace(/[\s().-]/g, '');
// AU mobile (04…) or landline (02/03/07/08), with 0 or +61 prefix.
const PHONE_RE = /^(?:\+?61|0)[2-478]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

export type DetailError = 'required' | 'tooLong' | 'invalid';
export interface Details {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export function validateDetails(d: Details): Partial<Record<keyof Details, DetailError>> {
  const e: Partial<Record<keyof Details, DetailError>> = {};
  const name = d.name.trim();
  if (name.length < 2) e.name = 'required';
  else if (name.length > LIMITS.name) e.name = 'tooLong';
  else if (CONTROL_RE.test(name)) e.name = 'invalid';
  if (!d.phone.trim()) e.phone = 'required';
  else if (!PHONE_RE.test(normalisePhone(d.phone))) e.phone = 'invalid';
  const email = d.email.trim();
  if (!email) e.email = 'required';
  else if (email.length > LIMITS.email) e.email = 'tooLong';
  else if (!EMAIL_RE.test(email)) e.email = 'invalid';
  if (d.notes.length > LIMITS.notes) e.notes = 'tooLong';
  return e;
}
