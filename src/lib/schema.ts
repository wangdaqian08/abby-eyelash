// Pure JSON-LD builders (docs/GEO-STRATEGY.md #11). Everything here must mirror visible page content.
// Never emit FAQPage, AggregateRating or Review (strategy §2) — schema.test.ts enforces it.
import { site } from '../data/site.ts';
import { headline, services, type Lang, type Service } from '../data/services.ts';
import { localePath, neutralPath } from './i18n.ts';
import { common } from '../i18n/common.ts';

type Node = Record<string, unknown>;
const BIZ_TYPE = ['BeautySalon', 'NailSalon'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const LOCALE = { en: 'en-AU', zh: 'zh-Hans' } as const;

/** Language-neutral path with a trailing slash (matches Astro's directory build + Cloudflare Pages URLs). */
export const pagePath = (pathname: string) => {
  const p = neutralPath(pathname);
  return p.endsWith('/') || /\.[a-z0-9]+$/i.test(p) ? p : p + '/';
};
export const abs = (base: string | URL, path: string) => new URL(path, base).href;
export const serviceForPath = (pathname: string): Service | undefined =>
  services.find((s) => pagePath(pathname) === `/${s.slug}/`);

/** Drops placeholder profile links (bare domain roots, generic Google Maps, example.*). */
export const isRealProfileUrl = (url: string) => {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    if (/(^|\.)example\./.test(u.hostname) || path === '') return false;
    return !(/(^|\.)google\.[a-z.]+$/.test(u.hostname) && path === '/maps' && !u.search);
  } catch {
    return false;
  }
};

export const priceRange = () => {
  const all = services.flatMap((s) => s.options.filter((o) => !o.extra && !o.addon && !o.onRequest).map((o) => o.price));
  return `$${Math.min(...all)}–$${Math.max(...all)}`;
};

const offer = (name: string, price: number, from = false, unit?: string, maxPrice?: number): Node => ({
  '@type': 'Offer',
  name,
  priceCurrency: 'AUD',
  ...(unit
    ? { price, priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency: 'AUD', unitText: unit } }
    : from
      ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: price, ...(maxPrice && { maxPrice }), priceCurrency: 'AUD' } }
      : { price }),
});

const hours = () => {
  const groups = new Map<string, string[]>();
  // A monthly day (3rd Sunday) can't be expressed as a weekly dayOfWeek, so it is left out rather than overstated.
  for (const h of site.hours.filter((x) => !x.nth)) {
    const key = `${h.open}-${h.close}`;
    groups.set(key, [...(groups.get(key) ?? []), DAYS[h.day]]);
  }
  return [...groups].map(([k, days]) => {
    const [opens, closes] = k.split('-');
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes };
  });
};

// The 3rd-Sunday opening as dated specialOpeningHoursSpecification entries for the next 6 months, computed at build.
// shortcut: dates are fixed at build time; a deploy at least every few months keeps them current.
export const specialHours = (now = Date.now()) => {
  const today = new Date(now).toISOString().slice(0, 10);
  const out: Node[] = [];
  for (const h of site.hours.filter((x) => x.nth)) {
    for (let i = 0; i < 6; i++) {
      const start = new Date(now);
      const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const date = new Date(first.getTime() + (((h.day - first.getUTCDay() + 7) % 7) + 7 * (h.nth! - 1)) * 86_400_000).toISOString().slice(0, 10);
      if (date >= today) out.push({ '@type': 'OpeningHoursSpecification', validFrom: date, validThrough: date, opens: h.open, closes: h.close });
    }
  }
  return out;
};

const providerRef = (base: string | URL) => ({ '@type': BIZ_TYPE, '@id': abs(base, '/#business'), name: site.name });

export function businessNode(base: string | URL, lang: Lang, image: string): Node {
  const sameAs = [site.google.reviewsUrl, site.social.instagram, site.social.xiaohongshu].filter(isRealProfileUrl);
  const email = site.email && !site.email.endsWith('@example.com') ? site.email : undefined;
  return {
    ...providerRef(base),
    url: abs(base, localePath(lang, '/')),
    image,
    telephone: site.phone.replace(/[^\d+]/g, ''),
    description: `${common[lang].contact.byAppointment} ${common[lang].contact.findUs}`, // same sentences as the visible contact block
    ...(email && { email }),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postcode,
      addressCountry: site.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    openingHoursSpecification: hours(),
    specialOpeningHoursSpecification: specialHours(),
    priceRange: priceRange(),
    ...(sameAs.length && { sameAs }),
    founder: { '@type': 'Person', '@id': abs(base, '/#abby'), name: site.owner },
    // Mirrors the home service cards: one "from $X" (or exact) price per service, linking to its page.
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: lang === 'zh' ? '服务项目' : 'Services',
      // An on-request service gets no price at all rather than a made-up one.
      itemListElement: services.map((s) => {
        const h = headline(s);
        return {
          ...(h.onRequest ? { '@type': 'Offer', name: s.name[lang] } : offer(s.name[lang], h.price, h.from)),
          itemOffered: { '@type': 'Service', name: s.name[lang], url: abs(base, localePath(lang, `/${s.slug}/`)) },
        };
      }),
    },
  };
}

export function serviceNode(base: string | URL, lang: Lang, s: Service): Node {
  return {
    '@type': 'Service',
    '@id': abs(base, localePath(lang, `/${s.slug}/`)) + '#service',
    name: s.name[lang],
    serviceType: s.name.en,
    description: s.summary[lang],
    url: abs(base, localePath(lang, `/${s.slug}/`)),
    provider: providerRef(base),
    areaServed: {
      '@type': 'Place',
      name: `${site.address.locality} ${site.address.region} ${site.address.postcode}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: site.address.locality,
        addressRegion: site.address.region,
        postalCode: site.address.postcode,
        addressCountry: site.address.country,
      },
    },
    // On-request designs keep an Offer with no price, so the per-nail add-on isn't read as the service price.
    offers: s.options.map((o) =>
      o.onRequest ? { '@type': 'Offer', name: o.name[lang] } : offer(o.name[lang], o.price, !!o.from, o.unit?.en, o.maxPrice),
    ),
  };
}

export function breadcrumbNode(base: string | URL, lang: Lang, url: string, name: string): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': url + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: lang === 'zh' ? '首页' : 'Home', item: abs(base, localePath(lang, '/')) },
      { '@type': 'ListItem', position: 2, name, item: url },
    ],
  };
}

export interface GraphInput {
  site: string | URL;
  lang: Lang;
  pathname: string;
  title: string;
  image: string; // absolute
  updated?: string;
  extra?: Node[];
}

export function buildGraph({ site: base, lang, pathname, title, image, updated, extra = [] }: GraphInput) {
  const path = pagePath(pathname);
  const url = abs(base, localePath(lang, path));
  const service = serviceForPath(pathname);
  const nodes: Node[] = [
    {
      '@type': 'WebSite',
      '@id': abs(base, '/#website'),
      url: abs(base, '/'),
      name: site.name,
      inLanguage: Object.values(LOCALE),
      publisher: { '@id': abs(base, '/#business') },
    },
  ];
  let crumb: Node | undefined;
  if (path === '/') nodes.push(businessNode(base, lang, image));
  if (service) {
    nodes.push(serviceNode(base, lang, service));
    crumb = breadcrumbNode(base, lang, url, service.name[lang]);
  }
  // Home pages show every service's prices, so their date is the newest service date (matches sitemap lastmod).
  const modified = service?.updated ?? updated ?? (pagePath(pathname) === '/' ? services.map((s) => s.updated).sort().at(-1) : undefined);
  nodes.push({
    '@type': 'WebPage',
    '@id': url + '#webpage',
    url,
    name: title,
    inLanguage: LOCALE[lang],
    isPartOf: { '@id': abs(base, '/#website') },
    ...(path === '/' && { about: { '@id': abs(base, '/#business') } }),
    ...(service && { mainEntity: { '@id': url + '#service' } }),
    ...(crumb && { breadcrumb: { '@id': crumb['@id'] } }),
    ...(modified && { dateModified: modified }),
  });
  if (crumb) nodes.push(crumb);
  return { '@context': 'https://schema.org', '@graph': [...nodes, ...extra] };
}
