import type { Lang } from '../data/services';

// Route convention: EN at "/<path>", ZH at "/zh/<path>". Every page exists in both languages.
// Page paths get a trailing slash (the canonical form Cloudflare serves); anchors and queries are left alone.
export const localePath = (lang: Lang, path: string) => {
  let clean = '/' + path.replace(/^\/+/, '');
  if (!/[#?]/.test(clean) && !clean.endsWith('/')) clean += '/';
  return lang === 'zh' ? (clean === '/' ? '/zh/' : '/zh' + clean) : clean;
};

// Strip the "/zh" prefix to get the language-neutral path of the current URL.
export const neutralPath = (pathname: string) => pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
