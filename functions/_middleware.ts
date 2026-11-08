// Style A/B split (src/data/ab-test.ts). Each new visitor is drawn A or B once and kept there by a cookie.
// One build holds both looks: look B pages are built under /look-b/ (src/pages/look-b/) and served here at the
// normal URLs, so the address never changes and both looks always ship from the same code.
// /api/* never splits (one booking backend). Crawlers are not singled out: same rules, same text in both looks.
import { abTest } from '../src/data/ab-test.ts';
import { cookieHeader, LOOK_B_PREFIX, lookBPath, neverSplit, pickVariant } from '../src/lib/ab-test.ts';

type Ctx = {
  request: Request;
  next: () => Promise<Response>;
  env: { AB_B_PERCENT?: string; ASSETS: { fetch: (input: Request | string | URL) => Promise<Response> } };
};

export const onRequest = async ({ request, next, env }: Ctx) => {
  const url = new URL(request.url);
  // The look-B copies are only ever served at the normal URLs (robots.txt also disallows them).
  if (url.pathname === LOOK_B_PREFIX || url.pathname.startsWith(`${LOOK_B_PREFIX}/`)) return new Response('Not found', { status: 404 });
  // Env override is for local testing only (wrangler --binding); production uses the value in src/data/ab-test.ts.
  const bPercent = env.AB_B_PERCENT !== undefined ? Number(env.AB_B_PERCENT) : abTest.bPercent;
  // Test off: only someone who forced a look (?style=B, cookie) still gets it, so a look can be checked on the live domain.
  const chosen = url.searchParams.has(abTest.cookie) || new RegExp(`(?:^|;\\s*)${abTest.cookie}=(A|B)(?:;|$)`).test(request.headers.get('cookie') ?? '');
  if (neverSplit(url.pathname) || (!bPercent && !chosen)) return next();

  const { variant, setCookie } = pickVariant(request.headers.get('cookie'), url.searchParams, bPercent, abTest.cookie, Math.random());
  let res = await next();
  // Look B: swap the body of a page (200) or the not-found page (404) for its look-B copy. Redirects (e.g. /book → /book/)
  // pass through untouched, so the /look-b/ prefix never reaches the browser. Any failure falls back to look A.
  const html = (res.headers.get('content-type') ?? '').includes('text/html');
  const bPath = variant === 'B' && html && (res.status === 200 || res.status === 404) ? (res.status === 404 ? `${LOOK_B_PREFIX}/404/` : lookBPath(url.pathname)) : null;
  if (bPath) {
    const b = await env.ASSETS.fetch(new URL(bPath, url)).catch(() => null);
    if (b?.ok && (b.headers.get('content-type') ?? '').includes('text/html')) res = new Response(b.body, { status: res.status, headers: b.headers });
  }
  res = new Response(res.body, res);
  if (setCookie) res.headers.append('set-cookie', cookieHeader(abTest.cookie, variant, abTest.maxAgeDays, url.protocol === 'https:'));
  res.headers.set('x-style-variant', variant);
  if ((res.headers.get('content-type') ?? '').includes('text/html')) res.headers.set('cache-control', 'private, no-cache'); // each visitor's own look
  return res;
};
