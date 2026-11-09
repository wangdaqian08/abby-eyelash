// Google Calendar via a service account (JWT RS256 signed with Web Crypto) — runs in Cloudflare Workers.
import { mockBusy, zonedTimeToUtc, type Interval } from './availability.ts';

export interface GoogleEnv {
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_CALENDAR_ID?: string;
  BOOKING_DEMO?: string;
}

export const isConfigured = (env: GoogleEnv) =>
  Boolean(env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_CALENDAR_ID);

// Demo mode (mock slots) only when explicitly enabled or on localhost,
// so a missing/misspelled secret in production fails closed instead of silently faking bookings.
export const demoAllowed = (env: { BOOKING_DEMO?: string }, url: string) =>
  env.BOOKING_DEMO === '1' || ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

/** Edge-cache key for a month's busy times (one per month, whatever is being booked). */
export const availabilityCacheKey = (origin: string, month: string) =>
  new Request(`${origin}/api/availability?${new URLSearchParams({ busy: '1', month })}`);

const API = 'https://www.googleapis.com/calendar/v3';
// Read-only: event titles are needed to tell client bookings (💗) from Abby's personal events. The site never writes.
const SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));

let cached: { token: string; exp: number } | undefined; // per isolate

async function accessToken(env: GoogleEnv): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  // Env UIs often store the PEM with literal "\n" sequences.
  const pem = env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n').replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`google token ${res.status}: ${await res.text()}`);
  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: access_token, exp: now + expires_in };
  return access_token;
}

/** Marks a client booking (or time Abby closed): the event title starts with this. Other events never block booking times. */
export const BOOKED_MARK = '💗';

type CalEvent = { summary?: string; status?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string } };

/** Busy intervals from calendar events: only 💗 events count (all-day ones block whole days). Titles stay on the server. */
export function bookedIntervals(events: CalEvent[], tz: string): Interval[] {
  const at = (t: { date?: string; dateTime?: string }) => (t.dateTime ? Date.parse(t.dateTime) : zonedTimeToUtc(t.date!, '00:00', tz));
  return events
    .filter((e) => e.status !== 'cancelled' && e.start && e.end && (e.summary ?? '').trimStart().startsWith(BOOKED_MARK))
    .map((e) => ({ start: at(e.start!), end: at(e.end!) }));
}

async function get<T>(env: GoogleEnv, path: string, query: Record<string, string>): Promise<T> {
  const res = await fetch(`${API}${path}?${new URLSearchParams(query)}`, { headers: { authorization: `Bearer ${await accessToken(env)}` } });
  // A calendar that isn't shared with the service account (with "See all event details") fails here, never reads as "free".
  if (!res.ok) throw new Error(`google ${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Busy intervals in the calendar (💗 events only). Demo mode (no credentials) returns deterministic mock blocks. */
export async function busyBetween(env: GoogleEnv, range: Interval, tz: string): Promise<Interval[]> {
  if (!isConfigured(env)) return mockBusy(range, tz);
  const path = `/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID!)}/events`;
  const events: CalEvent[] = [];
  let pageToken = '';
  do {
    const r = await get<{ items?: CalEvent[]; nextPageToken?: string }>(env, path, {
      timeMin: new Date(range.start).toISOString(),
      timeMax: new Date(range.end).toISOString(),
      singleEvents: 'true', // recurring events expanded into their occurrences
      maxResults: '2500',
      fields: 'items(summary,status,start,end),nextPageToken',
      ...(pageToken && { pageToken }),
    });
    events.push(...(r.items ?? []));
    pageToken = r.nextPageToken ?? '';
  } while (pageToken);
  return bookedIntervals(events, tz);
}
