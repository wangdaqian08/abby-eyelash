// Traditional Chinese (/zh-hant/) is the Simplified text converted to Taiwan character forms AFTER the build
// (scripts/zh-hant.mjs converts every built /zh-hant/ page). Nothing here converts, so no converter ships to the browser.
//
// aliasHant adds a 'zh-hant' key next to every { en, zh } pair, so code can index text with any Lang.
// - On the server the alias is the Simplified text; the built page is converted afterwards.
// - In the booking app (runs in the browser) the page hands over the converted strings (hantStrings → data-config,
//   converted with the page) and aliasHant(data, convertWith(...)) puts them in place.

import type { Lang } from '../data/services';

type Convert = (zh: unknown) => unknown;
const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Adds a non-enumerable 'zh-hant' to every { en, zh } object in `data` (deep). Returns `data`. */
export function aliasHant<T>(data: T, convert: Convert = (zh) => zh, seen = new Set<unknown>()): T {
  if (!data || typeof data !== 'object' || seen.has(data)) return data;
  seen.add(data);
  for (const v of Object.values(data as object)) aliasHant(v, convert, seen);
  if (plain(data) && 'en' in data && 'zh' in data)
    Object.defineProperty(data, 'zh-hant', { value: convert(data.zh), enumerable: false, writable: true, configurable: true });
  return data;
}

/** A text table written in en + zh, readable in every Lang ('zh-hant' reads zh). */
export const byLang = <T>(table: { en: T; zh: T }) => aliasHant(table) as unknown as Record<Lang, T>;

/** Every string inside the zh side of every { en, zh } pair in `data`, in a stable order, without repeats. */
export function zhStrings(data: unknown): string[] {
  const out = new Set<string>();
  const seen = new Set<unknown>();
  const strings = (v: unknown): void => {
    if (typeof v === 'string') out.add(v);
    else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x);
  };
  const walk = (v: unknown): void => {
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (plain(v) && 'en' in v && 'zh' in v) strings(v.zh);
    for (const x of Object.values(v)) walk(x);
  };
  walk(data);
  return [...out];
}

/** A converter for aliasHant from the page's converted copy of zhStrings(data) (same data, same order). */
export function convertWith(data: unknown, converted: readonly string[]): Convert {
  const map = new Map(zhStrings(data).map((s, i) => [s, converted[i] ?? s]));
  const deep = (v: unknown): unknown =>
    typeof v === 'string' ? (map.get(v) ?? v) : Array.isArray(v) ? v.map(deep) : plain(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v;
  return deep;
}
