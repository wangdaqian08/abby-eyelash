import type { Lang } from '../data/services';

// Route convention: EN at "/<path>", ZH at "/zh/<path>". Every page exists in both languages.
export const localePath = (lang: Lang, path: string) => {
  const clean = '/' + path.replace(/^\/+/, '');
  return lang === 'zh' ? (clean === '/' ? '/zh/' : '/zh' + clean) : clean;
};

// Strip the "/zh" prefix to get the language-neutral path of the current URL.
export const neutralPath = (pathname: string) => pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
