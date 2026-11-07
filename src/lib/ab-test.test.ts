import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVariant, neverSplit, cookieHeader } from './ab-test.ts';

const q = (s = '') => new URLSearchParams(s);

test('test off (0%): every new visitor gets A', () => {
  for (const r of [0, 0.3, 0.99]) assert.deepEqual(pickVariant(null, q(), 0, 'style', r), { variant: 'A', setCookie: true });
});

test('50%: rand below 0.5 → B, above → A; split is even over many visitors', () => {
  assert.equal(pickVariant(null, q(), 50, 'style', 0.49).variant, 'B');
  assert.equal(pickVariant(null, q(), 50, 'style', 0.5).variant, 'A');
  let b = 0; const n = 20000;
  for (let i = 0; i < n; i++) if (pickVariant(null, q(), 50, 'style', Math.random()).variant === 'B') b++;
  assert.ok(Math.abs(b / n - 0.5) < 0.02, `B share ${b / n}`);
});

test('returning visitor keeps their variant, no new cookie', () => {
  assert.deepEqual(pickVariant('x=1; style=B; y=2', q(), 50, 'style', 0.99), { variant: 'B', setCookie: false });
  assert.deepEqual(pickVariant('style=A', q(), 100, 'style', 0), { variant: 'A', setCookie: false });
});

test('a malformed cookie is ignored and re-drawn', () => {
  assert.equal(pickVariant('style=C', q(), 100, 'style', 0).variant, 'B');
  assert.equal(pickVariant('mystyle=B', q(), 0, 'style', 0).variant, 'A');
});

test('?style=A|B forces a look and rewrites the cookie; other values are ignored', () => {
  assert.deepEqual(pickVariant('style=A', q('style=B'), 0, 'style', 0.9), { variant: 'B', setCookie: true });
  assert.equal(pickVariant('style=A', q('style=Z'), 0, 'style', 0.9).variant, 'A');
});

test('out-of-range percent is clamped', () => {
  assert.equal(pickVariant(null, q(), 250, 'style', 0.99).variant, 'B');
  assert.equal(pickVariant(null, q(), -5, 'style', 0).variant, 'A');
});

test('the booking API never splits; pages and assets do', () => {
  assert.ok(neverSplit('/api/availability'));
  assert.ok(!neverSplit('/zh/book/'));
  assert.ok(!neverSplit('/_astro/BaseLayout.x.css'));
});

test('cookie: 30 days, Lax, Secure only on https', () => {
  assert.equal(cookieHeader('style', 'B', 30, true), 'style=B; Path=/; Max-Age=2592000; SameSite=Lax; Secure');
  assert.ok(!cookieHeader('style', 'A', 30, false).includes('Secure'));
});
