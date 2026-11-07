import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consentLines, onRequestPost } from './book.ts';
import { site } from '../../src/data/site.ts';

const post = (body: Record<string, unknown>) =>
  onRequestPost({ request: new Request('http://localhost/api/book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: {} });

test('booking is refused unless the deposit terms are agreed', async () => {
  for (const deposit of [undefined, false, 'true']) {
    const res = await post({ name: 'Jane Doe', phone: '0412 345 678', email: 'jane@example.com', deposit });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { errors: Record<string, string> }).errors.deposit, 'required');
  }
  const res = await post({ name: 'Jane Doe', phone: '0412 345 678', email: 'jane@example.com', deposit: true });
  assert.equal(((await res.json()) as { errors?: Record<string, string> }).errors?.deposit, undefined);
});

test('calendar event records the terms version and photo consent; only true is a yes', () => {
  assert.ok(consentLines({}).includes(`Terms version: ${site.booking.termsVersion}`));
  assert.match(consentLines({ photos: true }).join('\n'), /Photo consent: YES/);
  for (const photos of [undefined, false, 'true', 1, 'yes']) assert.match(consentLines({ photos }).join('\n'), /Photo consent: NO/);
});
