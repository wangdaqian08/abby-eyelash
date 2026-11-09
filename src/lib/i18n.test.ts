import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceLang, isBot, langCookieHeader, langRoute, localePath, neutralPath, pageLang, routable } from './i18n.ts';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const req = (pathname: string, o: { search?: string; cookie?: string; al?: string | null; ua?: string | null } = {}) =>
  langRoute({ pathname, search: o.search ?? '', cookie: o.cookie ?? null, acceptLanguage: o.al === undefined ? 'en-AU,en;q=0.9' : o.al, userAgent: o.ua === undefined ? IPHONE : o.ua });

test('paths in three languages', () => {
  assert.equal(localePath('en', 'book'), '/book/');
  assert.equal(localePath('zh', '/'), '/zh/');
  assert.equal(localePath('zh-hant', '/'), '/zh-hant/');
  assert.equal(localePath('zh-hant', '/lash-lift-burwood'), '/zh-hant/lash-lift-burwood/');
  assert.equal(localePath('zh-hant', '/book?service=x'), '/zh-hant/book?service=x');
  for (const p of ['/zh/book/', '/zh-hant/book/', '/book/']) assert.equal(neutralPath(p), '/book/');
  assert.equal(neutralPath('/zh-hant'), '/');
  assert.equal(neutralPath('/zhong/'), '/zhong/'); // only the exact prefixes
  assert.deepEqual(['/', '/zh/', '/zh-hant/x/', '/zhx/'].map(pageLang), ['en', 'zh', 'zh-hant', 'en']);
});

test('device language: first Accept-Language tag only', () => {
  assert.equal(deviceLang('zh-TW,zh;q=0.9,en;q=0.8'), 'zh-hant');
  assert.equal(deviceLang('zh-HK'), 'zh-hant');
  assert.equal(deviceLang('zh-MO'), 'zh-hant');
  assert.equal(deviceLang('zh-Hant-AU,en;q=0.5'), 'zh-hant');
  assert.equal(deviceLang('zh-CN,zh;q=0.9'), 'zh');
  assert.equal(deviceLang('zh-Hans-AU'), 'zh');
  assert.equal(deviceLang('zh-SG'), 'zh');
  assert.equal(deviceLang('zh'), 'zh');
  assert.equal(deviceLang('en-AU,zh-TW;q=0.9'), null); // phone in English
  assert.equal(deviceLang('ko-KR'), null);
  assert.equal(deviceLang(''), null);
  assert.equal(deviceLang(null), null);
});

test('phone in Chinese picks which Chinese, on every page', () => {
  assert.deepEqual(req('/', { al: 'zh-TW,zh;q=0.9' }), { location: '/zh-hant/' });
  assert.deepEqual(req('/zh/lash-lift-burwood/', { al: 'zh-HK' }), { location: '/zh-hant/lash-lift-burwood/' });
  assert.deepEqual(req('/zh-hant/book/', { al: 'zh-CN', search: '?service=lash-lift' }), { location: '/zh/book/?service=lash-lift' });
  assert.equal(req('/zh-hant/', { al: 'zh-TW' }), null); // already there
  assert.equal(req('/zh/', { al: 'zh-CN' }), null);
});

test('phone in another language is never moved (a Chinese link stays Chinese)', () => {
  assert.equal(req('/zh/lash-lift-burwood/', { al: 'en-AU,en;q=0.9' }), null);
  assert.equal(req('/zh-hant/', { al: 'ko-KR' }), null);
  assert.equal(req('/', { al: 'en-AU' }), null);
});

test('a remembered choice wins over the phone, including English', () => {
  assert.equal(req('/zh/', { al: 'zh-TW', cookie: 'style=A; lang=zh' }), null);
  assert.deepEqual(req('/zh-hant/book/', { al: 'zh-TW', cookie: 'lang=en' }), { location: '/book/' });
  assert.deepEqual(req('/', { al: 'en-AU', cookie: 'lang=zh-hant' }), { location: '/zh-hant/' });
  assert.deepEqual(req('/', { al: 'zh-TW', cookie: 'lang=nonsense' }), { location: '/zh-hant/' }); // bad cookie ignored
});

test('the switcher link remembers the choice and cleans the address', () => {
  assert.deepEqual(req('/zh-hant/book/', { search: '?lang=zh-hant', al: 'zh-CN', cookie: 'lang=zh' }), { location: '/zh-hant/book/', remember: 'zh-hant' });
  assert.deepEqual(req('/book/', { search: '?service=x&lang=en', al: 'zh-TW' }), { location: '/book/?service=x', remember: 'en' });
  assert.deepEqual(req('/zh/', { search: '?lang=zh-hant' }), { location: '/zh-hant/', remember: 'zh-hant' }); // path fixed too
});

test('crawlers, link previews and requests without Accept-Language are never moved', () => {
  for (const ua of ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'WhatsApp/2.23.20 A', 'facebookexternalhit/1.1', 'Mozilla/5.0 (X11) HeadlessChrome/120', 'curl/8.4.0', null]) {
    assert.equal(req('/zh/', { al: 'zh-TW', ua }), null, String(ua));
    assert.equal(isBot(ua), true);
  }
  assert.equal(req('/zh/', { al: null }), null);
  assert.equal(isBot(IPHONE), false);
});

test('only pages are routed: API, calendar links, files and look-B paths pass through', () => {
  for (const p of ['/api/availability', '/c/k7hq2x9p', '/_astro/a.js', '/media/v.mp4', '/robots.txt', '/sitemap-index.xml', '/look-b/zh/']) {
    assert.equal(routable(p), false, p);
    assert.equal(req(p, { al: 'zh-TW' }), null, p);
  }
  assert.equal(routable('/zh/book/'), true);
});

test('language cookie lasts a year', () => {
  assert.equal(langCookieHeader('zh-hant', true), 'lang=zh-hant; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
});
