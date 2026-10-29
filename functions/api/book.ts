// POST /api/book — trust boundary: validate everything, verify Turnstile, re-check the slot, insert a PENDING event.
// Abby's email notification is sent by the browser after success (Web3Forms forbids server-side calls on the free plan).
import { site } from '../../src/data/site.ts';
import { services } from '../../src/data/services.ts';
import { slotsForDate, validateDetails, zonedTimeToUtc, normalisePhone } from '../../src/lib/availability.ts';
import { availabilityCacheKey, busyBetween, demoAllowed, insertEvent, isConfigured, type GoogleEnv } from '../../src/lib/google-calendar.ts';

interface Env extends GoogleEnv {
  TURNSTILE_SECRET_KEY?: string;
}

// Calendar text is rendered by Google (links, some HTML): drop control/bidi chars and angle brackets, collapse newlines.
const plain = (s: string) => s.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069<>]+/g, ' ').trim();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function turnstileOk(secret: string, token: string, ip: string | null) {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  return res.ok && ((await res.json()) as { success: boolean }).success === true;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'bad_request' }, 415);
  if (Number(request.headers.get('content-length') ?? 0) > 4000) return json({ error: 'bad_request' }, 413);
  const text = await request.text();
  if (text.length > 4000) return json({ error: 'bad_request' }, 413);
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object') throw 0;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string).trim() : '');
  const b = {
    name: str('name'),
    phone: str('phone'),
    email: str('email'),
    notes: str('notes'),
    service: str('service'),
    option: str('option'),
    date: str('date'),
    time: str('time'),
    lang: str('lang') === 'zh' ? 'zh' : 'en',
  };

  const errors: Record<string, string> = validateDetails(b);
  const service = services.find((s) => s.id === b.service);
  const option = service?.options.find((o) => o.id === b.option);
  if (!service) errors.service = 'invalid';
  else if (!option) errors.option = 'invalid';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !/^\d{2}:\d{2}$/.test(b.time)) errors.time = 'invalid';
  if (Object.keys(errors).length || !service || !option) return json({ error: 'validation', errors }, 400);

  const demo = !isConfigured(env);
  const mayDemo = demoAllowed(env, request.url);
  if ((demo || !env.TURNSTILE_SECRET_KEY) && !mayDemo) {
    console.error('book: Google Calendar or Turnstile env vars missing and BOOKING_DEMO is not set');
    return json({ error: 'calendar_unavailable' }, 503);
  }
  // Turnstile is skipped only when its secret is absent in an allowed demo/local run.
  if (env.TURNSTILE_SECRET_KEY) {
    const ok = await turnstileOk(env.TURNSTILE_SECRET_KEY, str('turnstileToken'), request.headers.get('cf-connecting-ip')).catch(
      () => false,
    );
    if (!ok) return json({ error: 'captcha' }, 403);
  }

  const buffer = site.booking.bufferMinutes * 60_000;
  const start = zonedTimeToUtc(b.date, b.time, site.timezone);
  const end = start + option.minutes * 60_000;
  try {
    const busy = await busyBetween(env, { start: start - buffer, end: end + buffer }, site.timezone);
    if (!slotsForDate(b.date, option.minutes, busy, Date.now(), site).includes(b.time)) {
      await purgeAvailability(request.url, b.date.slice(0, 7));
      return json({ error: 'slot_taken' }, 409);
    }
    const label = `${service.name.en} – ${option.name.en}`;
    const summary = `⏳ PENDING – ${plain(b.name)} – ${label}`;
    const description = [
      `Name: ${plain(b.name)}`,
      `Phone: ${normalisePhone(b.phone)}`,
      `Email: ${plain(b.email)}`,
      `Service: ${label} (${option.minutes} min)`,
      `Price: ${option.from ? 'from ' : ''}$${option.price}`,
      `Language: ${b.lang === 'zh' ? 'Chinese' : 'English'}`,
      `Notes: ${plain(b.notes) || '-'}`,
      '',
      'Booked via the website. Confirm with the customer by SMS/WhatsApp, collect the deposit, then rename this event (remove "⏳ PENDING").',
    ].join('\n');
    if (demo) console.log('[demo] booking not saved to a calendar:', summary);
    else await insertEvent(env, { summary, description, start, end, timeZone: site.timezone });
    await purgeAvailability(request.url, b.date.slice(0, 7));
  } catch (err) {
    console.error('booking failed', err);
    return json({ error: 'calendar_unavailable' }, 502);
  }
  return json({ ok: true, demo });
};

// Drop cached availability for every service/option of the month (each option has its own slot grid).
async function purgeAvailability(url: string, month: string) {
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  if (!cache) return;
  const origin = new URL(url).origin;
  await Promise.all(
    services.flatMap((s) => s.options.map((o) => cache.delete(availabilityCacheKey(origin, s.id, o.id, month)).catch(() => false))),
  );
}
