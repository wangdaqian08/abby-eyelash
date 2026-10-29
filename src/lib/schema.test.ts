import test from 'node:test';
import assert from 'node:assert/strict';
import { fromPrice, services } from '../data/services.ts';
import { buildGraph, isRealProfileUrl, pagePath, priceRange } from './schema.ts';

const SITE = 'https://example.org';
const IMG = SITE + '/og-default.jpg';
const graph = (pathname: string, lang: 'en' | 'zh' = 'en') =>
  buildGraph({ site: SITE, lang, pathname, title: 't', image: IMG })['@graph'] as Record<string, any>[];
const byType = (g: Record<string, any>[], t: string) =>
  g.filter((n) => (Array.isArray(n['@type']) ? n['@type'] : [n['@type']]).includes(t));
const BANNED = /"(FAQPage|AggregateRating|Review)"|"(aggregateRating|review)":/;

const allPaths = ['/', '/zh/', '/book/', '/zh/book/', ...services.flatMap((s) => [`/${s.slug}/`, `/zh/${s.slug}/`])];

test('every page has WebSite + WebPage and never banned types', () => {
  for (const p of allPaths) {
    const g = graph(p, p.startsWith('/zh') ? 'zh' : 'en');
    assert.equal(byType(g, 'WebSite').length, 1, p);
    assert.equal(byType(g, 'WebPage').length, 1, p);
    assert.doesNotMatch(JSON.stringify(g), BANNED, p);
  }
});

test('home: business node with required props and catalog mirroring services.ts', () => {
  for (const [p, lang] of [['/', 'en'], ['/zh/', 'zh']] as const) {
    const [biz] = byType(graph(p, lang), 'BeautySalon');
    assert.deepEqual(biz['@type'], ['BeautySalon', 'NailSalon']);
    assert.equal(biz['@id'], SITE + '/#business');
    for (const k of ['name', 'url', 'image', 'telephone', 'address', 'geo', 'openingHoursSpecification', 'priceRange', 'founder'])
      assert.ok(biz[k], `${p} missing ${k}`);
    assert.match(biz.telephone, /^\+\d{8,15}$/);
    assert.equal(biz.address.postalCode, '2134');
    assert.equal(biz.openingHoursSpecification.flatMap((h: any) => h.dayOfWeek).length, 7);
    const items = biz.hasOfferCatalog.itemListElement;
    assert.equal(items.length, services.length);
    services.forEach((s, i) => {
      assert.equal(items[i].price ?? items[i].priceSpecification.minPrice, fromPrice(s));
      assert.equal(items[i].itemOffered.name, s.name[lang]);
    });
  }
  assert.ok(!byType(graph('/book/'), 'BeautySalon').length, 'business node only on home');
});

test('service pages: Service offers equal services.ts prices, breadcrumb, dateModified', () => {
  for (const s of services) {
    const g = graph(`/zh/${s.slug}/`, 'zh');
    const [svc] = byType(g, 'Service');
    assert.equal(svc.provider['@id'], SITE + '/#business');
    assert.equal(svc.areaServed.name, 'Burwood NSW 2134');
    assert.equal(svc.offers.length, s.options.length);
    s.options.forEach((o, i) => {
      const off = svc.offers[i];
      assert.equal(off.priceCurrency, 'AUD');
      if (o.from) assert.equal(off.priceSpecification.minPrice, o.price);
      else assert.equal(off.price, o.price);
    });
    assert.equal(byType(g, 'BreadcrumbList')[0].itemListElement[1].item, `${SITE}/zh/${s.slug}/`);
    assert.equal(byType(g, 'WebPage')[0].dateModified, s.updated);
  }
});

test('/book has no BreadcrumbList (none is visible there); extra nodes are appended', () => {
  assert.equal(byType(graph('/book'), 'BreadcrumbList').length, 0);
  const g = buildGraph({ site: SITE, lang: 'en', pathname: '/book/', title: 't', image: IMG, extra: [{ '@type': 'Thing' }] });
  assert.equal(g['@graph'].at(-1)!['@type'], 'Thing');
});

test('helpers', () => {
  assert.equal(pagePath('/zh/book'), '/book/');
  assert.equal(pagePath('/zh'), '/');
  assert.equal(priceRange(), '$35–$140');
  assert.equal(isRealProfileUrl('https://www.instagram.com/'), false);
  assert.equal(isRealProfileUrl('https://www.google.com/maps'), false);
  assert.equal(isRealProfileUrl('https://www.instagram.com/abbyeyelash'), true);
  assert.equal(isRealProfileUrl('https://maps.app.goo.gl/abc123'), true);
});
