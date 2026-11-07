// Pure helpers for the style A/B split (functions/_middleware.ts). Kept here so they are unit-tested.
export type Variant = 'A' | 'B';

/** Which variant this request gets, and whether the cookie must be (re)written. `rand` is 0 ≤ r < 1. */
export function pickVariant(cookieHeader: string | null, query: URLSearchParams, bPercent: number, cookieName: string, rand: number): { variant: Variant; setCookie: boolean } {
  const forced = query.get(cookieName);
  if (forced === 'A' || forced === 'B') return { variant: forced, setCookie: true }; // ?style=A|B for checking a look by hand
  const m = new RegExp(`(?:^|;\\s*)${cookieName}=(A|B)(?:;|$)`).exec(cookieHeader ?? '');
  if (m) return { variant: m[1] as Variant, setCookie: false };
  const pct = Math.min(100, Math.max(0, bPercent || 0));
  return { variant: rand * 100 < pct ? 'B' : 'A', setCookie: true };
}

/** Requests that never split: the booking API (one real backend for both looks). */
export const neverSplit = (pathname: string) => pathname.startsWith('/api/');

export const cookieHeader = (name: string, v: Variant, maxAgeDays: number, secure: boolean) =>
  `${name}=${v}; Path=/; Max-Age=${maxAgeDays * 86400}; SameSite=Lax${secure ? '; Secure' : ''}`;
