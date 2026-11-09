// Booking by message: the site never takes a booking itself. The customer picks a time, then sends Abby a pre-filled
// SMS/WhatsApp. The message carries a short /c link that opens Google Calendar's "new event" page, filled in, for Abby.
import { parseItems, quoteAll, quoteAllText } from '../data/services.ts';
import { normalisePhone, validateDetails, zonedTimeToUtc } from './availability.ts';

export interface CalendarRequest {
  items: string; // itemsParam(...)
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, studio time
  name: string;
  phone: string;
  photos: boolean;
}

/** Checks a booking request from the browser (trust boundary: anyone can post one). null when invalid. */
export function validRequest(raw: unknown): CalendarRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === 'string' ? (o[k] as string).trim() : '');
  const r: CalendarRequest = { items: str('items'), date: str('date'), time: str('time'), name: str('name'), phone: normalisePhone(str('phone')), photos: o.photos === true };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !/^\d{2}:\d{2}$/.test(r.time) || Number.isNaN(Date.parse(`${r.date}T${r.time}:00Z`))) return null;
  const items = parseItems(r.items);
  if (!items || !quoteAll(items)) return null;
  return Object.keys(validateDetails({ name: r.name, phone: r.phone, notes: '' })).length ? null : r;
}

// 32 letters and digits, no look-alikes (0/o, 1/i/l); 256 is a multiple of 32, so every letter is equally likely.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzA';
/** Random 8-character code for /c/<code> (40 bits): the link shows nothing about the booking and can't be guessed. */
export const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALPHABET[b % 32]).join('');
export const CODE_RE = /^[2-9a-hj-km-np-zA]{8}$/;

// Calendar text is rendered by Google (links, some HTML): drop control/bidi chars and angle brackets.
const plain = (s: string) => s.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069<>]+/g, ' ').trim();
const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Google Calendar "new event" URL for Abby: title, time, length and the booking details filled in. */
export function googleCalendarUrl(r: CalendarRequest, tz: string, deposit: (n: number) => string = (n) => `$${n}`) {
  const q = quoteAll(parseItems(r.items)!)!;
  const label = q.items
    .flatMap((i) => [`${i.service.name.en} – ${i.option.name.en}`, ...i.extras.map((e) => `${e.option.name.en}${e.units > 1 ? ` × ${e.units}` : ''}`)])
    .join(' + ');
  const start = zonedTimeToUtc(r.date, r.time, tz);
  const end = start + q.minutes * 60_000;
  const details = [
    `Name: ${plain(r.name)}`,
    `Phone: ${normalisePhone(r.phone)}`,
    `Service: ${label} (${q.minutes} min)`,
    `Price: ${quoteAllText(q, 'en')}`,
    `Deposit: ${deposit(q.deposit)} by bank transfer`,
    `Photo consent: ${r.photos ? 'YES, may use photos for promotion' : 'NO, do not post photos'}`,
    '',
    'Requested by message from the website. Confirm with the customer, collect the deposit, then remove "⏳" (keep ❤️: it blocks this time on the website).',
  ].join('\n');
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: 'TEMPLATE',
    text: `❤️ ⏳ ${plain(r.name)} – ${label}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details,
    ctz: tz,
  })}`;
}

/** sms: link with the message filled in. `?&body=` is the form both iPhone and Android read. */
export const smsHref = (phone: string, body: string) => `sms:${phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(body)}`;
/** WhatsApp chat with the message filled in (app on phones, WhatsApp Web on computers). */
export const waTextHref = (phone: string, body: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`;
