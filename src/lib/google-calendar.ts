// Google Calendar via a service account (JWT RS256 signed with Web Crypto) — runs in Cloudflare Workers.
import { mockBusy, type Interval } from './availability.ts';

export interface GoogleEnv {
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_CALENDAR_ID?: string;
  BOOKING_DEMO?: string;
}

export const isConfigured = (env: GoogleEnv) =>
  Boolean(env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_CALENDAR_ID);

// Demo mode (mock slots, no calendar writes, no Turnstile) only when explicitly enabled or on localhost,
// so a missing/misspelled secret in production fails closed instead of silently faking bookings.
export const demoAllowed = (env: { BOOKING_DEMO?: string }, url: string) =>
  env.BOOKING_DEMO === '1' || ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

// Shared edge-cache key for /api/availability, so a booking can purge what it just made stale.
export const availabilityCacheKey = (origin: string, service: string, option: string, month: string) =>
  new Request(`${origin}/api/availability?${new URLSearchParams({ service, option, month })}`);

const API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.events';

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

async function call<T>(env: GoogleEnv, path: string, body: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken(env)}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`google ${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Busy intervals in the calendar. Demo mode (no credentials) returns deterministic mock blocks. */
export async function busyBetween(env: GoogleEnv, range: Interval, tz: string): Promise<Interval[]> {
  if (!isConfigured(env)) return mockBusy(range, tz);
  const id = env.GOOGLE_CALENDAR_ID!;
  const r = await call<{ calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }> }>(
    env,
    '/freeBusy',
    { timeMin: new Date(range.start).toISOString(), timeMax: new Date(range.end).toISOString(), items: [{ id }] },
  );
  const cal = r.calendars[id];
  // A calendar that isn't shared with the service account comes back as an error, not as "free".
  if (!cal || cal.errors?.length) throw new Error(`freeBusy error: ${JSON.stringify(cal?.errors)}`);
  return (cal.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

export async function insertEvent(
  env: GoogleEnv,
  e: { summary: string; description: string; start: number; end: number; timeZone: string },
): Promise<void> {
  await call(env, `/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID!)}/events`, {
    summary: e.summary,
    description: e.description,
    start: { dateTime: new Date(e.start).toISOString(), timeZone: e.timeZone },
    end: { dateTime: new Date(e.end).toISOString(), timeZone: e.timeZone },
  });
}
