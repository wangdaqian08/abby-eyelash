import test from 'node:test';
import assert from 'node:assert/strict';
import { headline, services } from '../data/services.ts';
import { buildGraph, isRealProfileUrl, pagePath, priceRange, specialHours } from './schema.ts';

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
    assert.equal(biz.openingHoursSpecification.flatMap((h: any) => h.dayOfWeek).length, 6); // monthly Sunday isn't a weekly day
    const items = biz.hasOfferCatalog.itemListElement;
    assert.equal(items.length, services.length);
    services.forEach((s, i) => {
      const h = headline(s);
      if (h.onRequest) assert.ok(!('price' in items[i]) && !items[i].priceSpecification, `${s.id}: on-request has no price`);
      else assert.equal(items[i].price ?? items[i].priceSpecification.minPrice, h.price);
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
    const priced = s.options.filter((o) => !o.onRequest); // on-request options carry no offer
    assert.equal(svc.offers.length, priced.length);
    priced.forEach((o, i) => {
      const off = svc.offers[i];
      assert.equal(off.priceCurrency, 'AUD');
      if (o.unit) assert.equal(off.priceSpecification.unitText, o.unit.en);
      else if (o.from) assert.equal(off.priceSpecification.minPrice, o.price);
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
  assert.equal(priceRange(), '$70–$480'); // add-ons, removal and on-request designs excluded
  assert.equal(isRealProfileUrl('https://www.instagram.com/'), false);
  assert.equal(isRealProfileUrl('https://www.google.com/maps'), false);
  assert.equal(isRealProfileUrl('https://www.instagram.com/abbyeyelash'), true);
  assert.equal(isRealProfileUrl('https://maps.app.goo.gl/abc123'), true);
});

test('specialHours lists the coming 3rd Sundays with their hours', () => {
  const days = specialHours(Date.parse('2026-11-01T00:00:00Z')).map((h: any) => `${h.validFrom}/${h.opens}-${h.closes}`);
  assert.deepEqual(days.slice(0, 3), ['2026-11-15/09:00-20:00', '2026-12-20/09:00-20:00', '2027-01-17/09:00-20:00']);
  assert.ok(specialHours(Date.parse('2026-11-16T00:00:00Z')).every((h: any) => h.validFrom > '2026-11-15'), 'past dates dropped');
});
