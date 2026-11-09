// POST /api/request — stores a booking request for the short calendar link in the customer's message. Returns { code }.
// Trust boundary: validate everything. Anything wrong with the database → 503, and the page sends the message without a link.
import { validRequest } from '../../src/lib/booking-message.ts';
import { dbUrl, saveRequest, type DbEnv } from '../../src/lib/db.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const onRequestPost = async ({ request, env }: { request: Request; env: DbEnv }) => {
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'bad_request' }, 415);
  const text = await request.text();
  if (text.length > 2000) return json({ error: 'bad_request' }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const r = validRequest(raw);
  if (!r) return json({ error: 'validation' }, 400);
  if (!dbUrl(env)) return json({ error: 'no_database' }, 503);
  try {
    return json({ code: await saveRequest(env, r) });
  } catch (err) {
    console.error('request: database error', err);
    return json({ error: 'database' }, 503);
  }
};
