import type { Lang } from '../data/services';

// Route convention: EN at "/<path>", Simplified Chinese at "/zh/<path>", Traditional Chinese at "/zh-hant/<path>".
// Every page exists in all three. Page paths get a trailing slash (the canonical form Cloudflare serves); anchors and
// queries are left alone.
export const LANGS = ['en', 'zh', 'zh-hant'] as const satisfies readonly Lang[];
const PREFIX: Record<Lang, string> = { en: '', zh: '/zh', 'zh-hant': '/zh-hant' };
/** BCP 47 tag of each language (html lang, hreflang, JSON-LD). */
export const HREFLANG: Record<Lang, string> = { en: 'en-AU', zh: 'zh-Hans', 'zh-hant': 'zh-Hant' };
/** Locale for dates and times (Intl). Traditional uses Taiwan forms, like the converted text. */
export const INTL: Record<Lang, string> = { en: 'en-AU', zh: 'zh-CN', 'zh-hant': 'zh-TW' };

export const localePath = (lang: Lang, path: string) => {
  let clean = '/' + path.replace(/^\/+/, '');
  if (!/[#?]/.test(clean) && !clean.endsWith('/')) clean += '/';
  return lang === 'en' ? clean : clean === '/' ? `${PREFIX[lang]}/` : PREFIX[lang] + clean;
};

/** Strip the language prefix to get the language-neutral path of a URL path. */
export const neutralPath = (pathname: string) => pathname.replace(/^\/zh(?:-hant)?(?=\/|$)/, '') || '/';
/** The language a URL path is in. */
export const pageLang = (pathname: string): Lang => (/^\/zh-hant(?=\/|$)/.test(pathname) ? 'zh-hant' : /^\/zh(?=\/|$)/.test(pathname) ? 'zh' : 'en');

// ── Automatic language routing (functions/_middleware.ts) ──
// A remembered choice (cookie, set by the language switcher) always wins. Without one, a phone set to Chinese picks
// which Chinese: Traditional for zh-TW/HK/MO or the Hant script, Simplified for other Chinese. A phone set to any
// other language is never moved: an English page stays English and a Chinese page stays in the Chinese it was linked
// in (many Chinese-speaking clients in Sydney keep their phones in English). Crawlers and link previews are never moved.
export const LANG_COOKIE = 'lang';
export const LANG_PARAM = 'lang'; // ?lang=… on the switcher's links: remember this choice
const isLang = (v: string | null | undefined): v is Lang => (LANGS as readonly string[]).includes(v ?? '');

/** The Chinese a phone asks for, from the first Accept-Language tag; null when the phone is not set to Chinese. */
export function deviceLang(acceptLanguage: string | null): Lang | null {
  const first = (acceptLanguage ?? '').split(',')[0].split(';')[0].trim().toLowerCase();
  if (first !== 'zh' && !first.startsWith('zh-')) return null;
  return /^zh-(hant|tw|hk|mo)\b/.test(first) || /-hant\b/.test(first) ? 'zh-hant' : 'zh';
}

/** Crawlers, link-preview fetchers and scripts: never redirected. */
export const isBot = (ua: string | null) =>
  !ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|whatsapp|telegram|discord|slack|embedly|pinterest|vkshare|skype|curl|wget|python|httpclient|headless|lighthouse/i.test(ua);

/** A page request the router may move (not the API, the calendar link, a file or a look-B path). */
export const routable = (pathname: string) =>
  !/^\/(api|c|look-b|_astro|media|images)(\/|$)/.test(pathname) && (!/\.[a-z0-9]+$/i.test(pathname) || pathname.endsWith('.html'));

export interface LangRequest {
  pathname: string;
  search: string;
  cookie: string | null;
  acceptLanguage: string | null;
  userAgent: string | null;
}
/** What the router does with a request: redirect somewhere, and/or remember a choice. null = serve as is. */
export function langRoute(r: LangRequest): { location: string; remember?: Lang } | null {
  if (!routable(r.pathname)) return null;
  const params = new URLSearchParams(r.search);
  const picked = params.get(LANG_PARAM);
  if (isLang(picked)) {
    // The switcher's link: remember the choice and drop the parameter from the address.
    params.delete(LANG_PARAM);
    const rest = params.toString();
    return { location: localePath(picked, neutralPath(r.pathname)) + (rest ? `?${rest}` : ''), remember: picked };
  }
  const saved = new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([a-z-]+)(?:;|$)`).exec(r.cookie ?? '')?.[1];
  const want = isLang(saved) ? saved : isBot(r.userAgent) ? null : deviceLang(r.acceptLanguage);
  if (!want || want === pageLang(r.pathname)) return null;
  return { location: localePath(want, neutralPath(r.pathname)) + r.search };
}

export const langCookieHeader = (lang: Lang, secure: boolean) =>
  `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${365 * 86400}; SameSite=Lax${secure ? '; Secure' : ''}`;
