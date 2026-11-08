import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVariant, neverSplit, cookieHeader, lookOf, publicPath, lookBPath } from './ab-test.ts';

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

test('look from the URL: only /look-b/ pages are look B', () => {
  for (const p of ['/look-b/', '/look-b', '/look-b/zh/book/']) assert.equal(lookOf(new URL(`https://x.test${p}`)), 'B');
  for (const p of ['/', '/book/', '/look-better/', '/zh/look-b/']) assert.equal(lookOf(new URL(`https://x.test${p}`)), 'A');
});

test('public path drops the look-B prefix, nothing else', () => {
  assert.equal(publicPath('/look-b/'), '/');
  assert.equal(publicPath('/look-b'), '/');
  assert.equal(publicPath('/look-b/zh/lash-lift-burwood/'), '/zh/lash-lift-burwood/');
  assert.equal(publicPath('/zh/book/'), '/zh/book/');
  assert.equal(publicPath('/look-better/'), '/look-better/');
});

test('only page requests map to a look-B file; assets keep their path', () => {
  assert.equal(lookBPath('/'), '/look-b/');
  assert.equal(lookBPath('/zh/book/'), '/look-b/zh/book/');
  assert.equal(lookBPath('/404.html'), '/look-b/404.html');
  for (const p of ['/_astro/a.css', '/images/x.webp', '/favicon.svg', '/robots.txt']) assert.equal(lookBPath(p), null);
});

// public/_routes.json: only pages and /api run Functions; static files skip them so they don't use the free Functions quota
// (100k requests/day). Pages must stay included (the A/B split) and so must /look-b/ (the middleware 404s it).
test('_routes.json: static files skip Functions; pages, /api and /look-b/ still run them', async () => {
  const { readFileSync } = await import('node:fs');
  const routes = JSON.parse(readFileSync(new URL('../../public/_routes.json', import.meta.url), 'utf8')) as { version: number; include: string[]; exclude: string[] };
  const hit = (rules: string[], path: string) => rules.some((r) => (r.endsWith('/*') ? path.startsWith(r.slice(0, -1)) : path === r));
  const runs = (path: string) => hit(routes.include, path) && !hit(routes.exclude, path);
  assert.equal(routes.version, 1);
  for (const p of ['/', '/zh/', '/book/', '/privacy/', '/lash-lift-burwood/', '/no-such-page/', '/api/book', '/api/availability', '/look-b/', '/look-b/zh/']) assert.ok(runs(p), p);
  for (const p of ['/_astro/BaseLayout.abc.css', '/_astro/hero.abc.webp', '/media/brows-touch-up.mp4', '/favicon.svg', '/robots.txt', '/sitemap-0.xml']) assert.ok(!runs(p), p);
});
