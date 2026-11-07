import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from './book.ts';

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
