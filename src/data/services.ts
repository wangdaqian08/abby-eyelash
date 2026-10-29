// Service menu, shared by home cards, service pages, JSON-LD and the booking flow/API.
// Names and grouping live here; prices and durations live in prices.csv.
import { prices } from './prices.generated.ts';

export type Lang = 'en' | 'zh';
type L10n = Record<Lang, string>;

export interface ServiceOption {
  id: string;
  name: L10n;
  minutes: number;
  price: number;
  from?: boolean; // "from $X"
  maxPrice?: number; // price range "$X–$Y"
  pct?: number; // price is this % of the service's cheapest full option (lash infill)
  extra?: boolean; // add-on, infill or removal: left out of the service's headline price
  group?: L10n; // consecutive options with the same group are listed under one heading
}

export interface Service {
  id: string;
  slug: string; // service page path segment
  name: L10n;
  /** One-line card summary (home page). */
  summary: L10n;
  /** ISO date of the last real change to this service's prices (drives "Prices updated", dateModified, lastmod). */
  updated: string;
  options: ServiceOption[];
}

type Draft = Omit<Service, 'updated' | 'options'> & { options: Pick<ServiceOption, 'id' | 'name' | 'extra' | 'group'>[] };

const FULL_SET = { en: 'Full sets', zh: '全套' };
const BOTTOM = { en: 'Bottom lashes', zh: '下睫毛' };
const INFILL = { en: 'Infill', zh: '回补' };
const REMOVAL = { en: 'Removal', zh: '卸睫毛' };

// Prices, durations and "updated" dates come from src/data/prices.csv (Abby edits that table, see docs/PRICES.md).
const drafts: Draft[] = [
  {
    id: 'lash-extensions',
    summary: { en: 'Japanese classic and hybrid sets, natural or full, individually applied by Abby.', zh: '日式单根与开花/轻盈款，自然或浓密，Abby 逐根嫁接。' },
    slug: 'eyelash-extensions-burwood',
    name: { en: 'Eyelash Extensions', zh: '嫁接睫毛' },
    options: [
      { id: 'classic-natural', name: { en: 'Japanese classic – natural', zh: '日式单根 · 自然' }, group: FULL_SET },
      { id: 'classic-full', name: { en: 'Japanese classic – full', zh: '日式单根 · 浓密' }, group: FULL_SET },
      { id: 'hybrid-natural', name: { en: 'Hybrid – natural', zh: '开花 / 轻盈 · 自然' }, group: FULL_SET },
      { id: 'hybrid-full', name: { en: 'Hybrid – full', zh: '开花 / 轻盈 · 浓密' }, group: FULL_SET },
      { id: 'styled', name: { en: 'Styled set', zh: '造型款' }, group: FULL_SET },
      { id: 'bottom-natural', name: { en: 'Bottom lashes – natural', zh: '下睫毛 · 自然' }, extra: true, group: BOTTOM },
      { id: 'bottom-full', name: { en: 'Bottom lashes – full', zh: '下睫毛 · 浓密' }, extra: true, group: BOTTOM },
      { id: 'infill-2w', name: { en: 'Infill – within 2 weeks', zh: '回补 · 2 周内' }, extra: true, group: INFILL },
      { id: 'infill-3w', name: { en: 'Infill – within 3 weeks', zh: '回补 · 3 周内' }, extra: true, group: INFILL },
      { id: 'infill-4w', name: { en: 'Infill – within 4 weeks', zh: '回补 · 4 周内' }, extra: true, group: INFILL },
      { id: 'removal', name: { en: 'Lash removal', zh: '卸睫毛' }, extra: true, group: REMOVAL },
    ],
  },
  {
    id: 'lash-lift',
    summary: { en: 'Lift and tint your natural lashes — no extensions, results last 6–8 weeks.', zh: '提升并染色自然睫毛，无需嫁接，效果约 6–8 周。' },
    slug: 'lash-lift-burwood',
    name: { en: 'Lash Lift', zh: '睫毛翘睫' },
    options: [{ id: 'lift-tint', name: { en: 'Lash lift & tint', zh: '翘睫 + 染色' } }],
  },
  {
    id: 'handcrafted-nails',
    summary: { en: 'Hand-painted custom nail art, designed with you and painted by Abby.', zh: '与你一起设计、由 Abby 亲手绘制的定制美甲。' },
    slug: 'handcrafted-nails-burwood',
    name: { en: 'Handcrafted Nails', zh: '手绘定制美甲' },
    options: [
      { id: 'nail-art', name: { en: 'Hand-painted custom nail art', zh: '手绘定制款' } },
    ],
  },
  {
    id: 'nail-polish',
    summary: { en: 'Gel and regular polish with careful cuticle prep and shaping.', zh: '光疗与普通甲油，细致修护甲缘与修型。' },
    slug: 'nail-polish-burwood',
    name: { en: 'Nail Polish', zh: '美甲上色' },
    options: [
      { id: 'gel', name: { en: 'Gel manicure', zh: '光疗甲油' } },
      { id: 'regular', name: { en: 'Regular polish', zh: '普通甲油' } },
    ],
  },
  {
    id: 'nail-extensions',
    summary: { en: 'BIAB and Gel-X for strength and length that still looks natural.', zh: 'BIAB 与 Gel-X，坚固延长，依然自然。' },
    slug: 'nail-extensions-burwood',
    name: { en: 'Nail Extensions', zh: '延长甲' },
    options: [
      { id: 'biab', name: { en: 'BIAB', zh: 'BIAB 加固甲' } },
      { id: 'gel-x', name: { en: 'Gel-X', zh: 'Gel-X 延长甲' } },
      { id: 'infill', name: { en: 'Infill', zh: '补甲' } },
    ],
  },
];

/** Merges prices.csv into the drafts; a "50%" row is a share of the service's cheapest full option. */
function withPrices(d: Draft): Service {
  const rows = d.options.map((o) => {
    const p = prices[`${d.id}/${o.id}`];
    if (!p) throw new Error(`src/data/prices.csv has no row for ${d.id}/${o.id}`);
    return { ...o, ...p };
  });
  const base = Math.min(...rows.filter((o) => !o.extra && o.price !== undefined).map((o) => o.price!));
  return {
    ...d,
    updated: rows.map((o) => o.updated).sort().at(-1)!, // latest 更新日期 of this service's rows
    options: rows.map(({ updated, ...o }) => (o.pct ? { ...o, price: Math.round((base * o.pct) / 100), from: true } : { ...o, price: o.price! })),
  };
}

export const services: Service[] = drafts.map(withPrices);

const unknown = Object.keys(prices).filter((k) => !services.some((s) => s.options.some((o) => `${s.id}/${o.id}` === k)));
if (unknown.length) throw new Error(`src/data/prices.csv has rows no service uses: ${unknown.join(', ')}`);

/** Headline "from" price for cards and the catalog: the cheapest main option. */
export const fromPrice = (s: Service) => Math.min(...s.options.filter((o) => !o.extra).map((o) => o.price));

/** The group heading to show before option `i`, if a new group starts there. */
export const groupAt = (options: ServiceOption[], i: number) =>
  options[i].group && options[i].group !== options[i - 1]?.group ? options[i].group : undefined;

export const findOption = (serviceId: string, optionId: string) =>
  services.find((s) => s.id === serviceId)?.options.find((o) => o.id === optionId);
