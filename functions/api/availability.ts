// GET /api/availability?service=&option=&addons=id:n,…&month=YYYY-MM
//   → { days: { "YYYY-MM-DD": ["HH:MM", …] }, recommended: { "YYYY-MM-DD": ["HH:MM", …] }, demo }
// Only computed free start times leave this function — never calendar event details.
import { site } from '../../src/data/site.ts';
import { parseAddons, quote } from '../../src/data/services.ts';
import { busyQueryRange, monthAvailability, monthRecommended } from '../../src/lib/availability.ts';
import { availabilityCacheKey, busyBetween, demoAllowed, isConfigured, type GoogleEnv } from '../../src/lib/google-calendar.ts';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

type Ctx = { request: Request; env: GoogleEnv; waitUntil: (p: Promise<unknown>) => void };

export const onRequestGet = async ({ request, env, waitUntil }: Ctx) => {
  const url = new URL(request.url);
  const q = url.searchParams;
  const addons = parseAddons(q.get('addons') ?? '');
  const booking = addons && quote(q.get('service') ?? '', q.get('option') ?? '', addons);
  const month = q.get('month') ?? '';
  if (!booking || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: 'bad_request' }, 400);

  const demo = !isConfigured(env);
  if (demo && !demoAllowed(env, request.url)) {
    console.error('availability: Google Calendar env vars missing and BOOKING_DEMO is not set');
    return json({ error: 'calendar_unavailable' }, 503, { 'cache-control': 'no-store' });
  }
  // Edge cache (60 s) keeps one Google freeBusy call per service/option/month per minute — protects the API quota.
  // shortcut: no-op on *.pages.dev preview hosts, works on the custom domain.
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = availabilityCacheKey(url.origin, booking.minutes, month);
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) return hit;
  const now = Date.now();
  const range = busyQueryRange(month, now, site);
  if (!range) return json({ days: {}, recommended: {}, demo }, 200, { 'cache-control': 'public, max-age=60' });
  try {
    const busy = await busyBetween(env, range, site.timezone);
    const days = monthAvailability(month, booking.minutes, busy, now, site);
    const res = json({ days, recommended: monthRecommended(days, booking.minutes, busy, site), demo }, 200, {
      'cache-control': 'public, max-age=60',
    });
    if (cache) waitUntil(cache.put(cacheKey, res.clone()).catch(() => {}));
    return res;
  } catch (err) {
    console.error('availability failed', err);
    return json({ error: 'calendar_unavailable' }, 502, { 'cache-control': 'no-store' });
  }
};
