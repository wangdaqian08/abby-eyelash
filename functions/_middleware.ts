// Style A/B split (src/data/ab-test.ts). Each new visitor is drawn A or B once and kept there by a cookie.
// A → this deployment. B → the liquid-glass deployment, fetched at the edge so the URL never changes.
// /api/* never splits (one booking backend). Crawlers are not singled out: same rules, same text in both looks.
import { abTest } from '../src/data/ab-test.ts';
import { cookieHeader, neverSplit, pickVariant } from '../src/lib/ab-test.ts';

type Ctx = { request: Request; next: () => Promise<Response>; env: { AB_B_PERCENT?: string; AB_B_ORIGIN?: string } };

export const onRequest = async ({ request, next, env }: Ctx) => {
  const url = new URL(request.url);
  // Env overrides are for local testing only (wrangler --binding); production uses the values in src/data/ab-test.ts.
  const bPercent = env.AB_B_PERCENT !== undefined ? Number(env.AB_B_PERCENT) : abTest.bPercent;
  const bOrigin = env.AB_B_ORIGIN || abTest.bOrigin;
  // The B deployment carries this same file once main is merged into it: never split there (no proxy loop).
  if (request.headers.has('x-style-proxied') || (bOrigin && url.host === new URL(bOrigin).host)) return next();
  // Test off: only someone who forced a look (?style=B, cookie) still gets it, so a look can be checked on the live domain.
  const chosen = url.searchParams.has(abTest.cookie) || new RegExp(`(?:^|;\\s*)${abTest.cookie}=(A|B)(?:;|$)`).test(request.headers.get('cookie') ?? '');
  if (neverSplit(url.pathname) || (!bPercent && !chosen)) return next();

  const { variant, setCookie } = pickVariant(request.headers.get('cookie'), url.searchParams, bPercent, abTest.cookie, Math.random());
  let res: Response;
  if (variant === 'B' && bOrigin) {
    const fwd = new Request(new URL(url.pathname + url.search, bOrigin), request);
    fwd.headers.set('x-style-proxied', '1');
    const upstream = await fetch(fwd, { redirect: 'manual' });
    res = new Response(upstream.body, upstream);
    // Preview deployments send `X-Robots-Tag: noindex`; on the real domain that would de-index the page for B visitors.
    res.headers.delete('x-robots-tag');
  } else {
    res = await next();
    res = new Response(res.body, res);
  }
  if (setCookie) res.headers.append('set-cookie', cookieHeader(abTest.cookie, variant, abTest.maxAgeDays, url.protocol === 'https:'));
  res.headers.set('x-style-variant', variant);
  if ((res.headers.get('content-type') ?? '').includes('text/html')) res.headers.set('cache-control', 'private, no-cache'); // each visitor's own look
  return res;
};
