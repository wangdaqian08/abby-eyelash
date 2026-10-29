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
  addon?: boolean; // only bookable on top of a main option; add-ons sharing a group are either/or
  max?: number; // add-on charged per unit (e.g. per nail), up to max units
  noAddons?: boolean; // main option that takes no add-ons (e.g. removal on its own)
  unit?: L10n; // per-unit price label, e.g. "nail" → "$6 / nail"
  wasPrice?: number; // original price shown struck through (sale)
  onRequest?: boolean; // custom price quoted by Abby; `price` is 0
  priceKey?: string; // prices.csv row when one option is shared by several services
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

type Draft = Omit<Service, 'updated' | 'options'> & {
  options: Pick<ServiceOption, 'id' | 'name' | 'extra' | 'group' | 'addon' | 'max' | 'noAddons' | 'unit' | 'priceKey'>[];
};

const FULL_SET = { en: 'Full sets', zh: '全套' };
const BOTTOM = { en: 'Bottom lashes', zh: '下睫毛' };
const INFILL = { en: 'Infill', zh: '回补' };
const REMOVAL = { en: 'Removal', zh: '卸睫毛' };
// Nail extensions: one per-nail add-on offered with every nail design, priced once in prices.csv.
const EXTENSION = {
  id: 'extension',
  name: { en: 'Extensions', zh: '延长' }, // price/time show "/ nail" via unit
  addon: true,
  max: 10,
  unit: { en: 'nail', zh: '只' },
  priceKey: 'nail-extensions/extension',
};

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
      { id: 'bottom-natural', name: { en: 'Bottom lashes – natural', zh: '下睫毛 · 自然' }, extra: true, group: BOTTOM, addon: true },
      { id: 'bottom-full', name: { en: 'Bottom lashes – full', zh: '下睫毛 · 浓密' }, extra: true, group: BOTTOM, addon: true },
      { id: 'infill-2w', name: { en: 'Infill – within 2 weeks', zh: '回补 · 2 周内' }, extra: true, group: INFILL },
      { id: 'infill-3w', name: { en: 'Infill – within 3 weeks', zh: '回补 · 3 周内' }, extra: true, group: INFILL },
      { id: 'infill-4w', name: { en: 'Infill – within 4 weeks', zh: '回补 · 4 周内' }, extra: true, group: INFILL },
      { id: 'removal', name: { en: 'Lash removal', zh: '卸睫毛' }, extra: true, group: REMOVAL, noAddons: true },
    ],
  },
  {
    id: 'lash-lift',
    summary: { en: 'A keratin lift that curls your natural lashes — no extensions, results last 6–8 weeks.', zh: '角蛋白翘睫，让自然睫毛卷翘上扬，无需嫁接，效果约 6–8 周。' },
    slug: 'lash-lift-burwood',
    name: { en: 'Lash Lift', zh: '睫毛翘睫' },
    options: [{ id: 'keratin-lift', name: { en: 'Keratin lash lift', zh: '角蛋白翘睫' } }],
  },
  {
    id: 'powder-brows',
    summary: { en: 'Semi-permanent powder brows: a soft, filled-in look that lasts, with one free touch-up within 3 months.', zh: '半永久雾眉，柔和自然的粉雾感，3 个月内免费补色一次。' },
    slug: 'powder-brows-burwood',
    name: { en: 'Powder Brows', zh: '半永久眉 · 雾眉' },
    options: [{ id: 'powder', name: { en: 'Powder brows', zh: '雾眉' } }],
  },
  {
    id: 'gel-nails',
    summary: { en: 'Gel nails in solid colour, cat-eye, aurora or French, with builder gel included.', zh: '凝胶美甲：单色、猫眼、极光、法式，已含 Gel 建构。' },
    slug: 'gel-nails-burwood',
    name: { en: 'Gel Nails', zh: '凝胶美甲' },
    options: [
      { id: 'solid', name: { en: 'Solid colour', zh: '单色' } },
      { id: 'cat-eye', name: { en: 'Cat-eye', zh: '猫眼' } },
      { id: 'aurora', name: { en: 'Aurora', zh: '极光' } },
      { id: 'french', name: { en: 'French', zh: '法式' } },
      EXTENSION,
    ],
  },
  {
    id: 'handcrafted-nails',
    summary: { en: 'Hand-painted nail art designed with you and painted by Abby; priced per design.', zh: '和你一起设计、由 Abby 亲手绘制的手绘造型，按款式报价。' },
    slug: 'handcrafted-nails-burwood',
    name: { en: 'Hand-painted Nail Art', zh: '手绘造型' },
    options: [{ id: 'nail-art', name: { en: 'Custom design', zh: '定制款' } }, EXTENSION],
  },
  {
    id: 'nail-extensions',
    summary: { en: 'Nail tip extensions, $6 per nail, added to any gel or hand-painted set.', zh: '甲片延长，每只 $6，可加在任何凝胶或手绘款上。' },
    slug: 'nail-extensions-burwood',
    name: { en: 'Nail Extensions', zh: '延长甲' },
    // Add-on only: booked on top of a gel or hand-painted set (see bookableWith()).
    options: [EXTENSION],
  },
];

/** Merges prices.csv into the drafts; a "50%" row is a share of the service's cheapest full option. */
function withPrices(d: Draft): Service {
  const rows = d.options.map((o) => {
    const p = prices[o.priceKey ?? `${d.id}/${o.id}`];
    if (!p) throw new Error(`src/data/prices.csv has no row for ${o.priceKey ?? `${d.id}/${o.id}`}`);
    return { ...o, ...p };
  });
  const base = Math.min(...rows.filter((o) => !o.extra && !o.addon && o.price !== undefined).map((o) => o.price!));
  return {
    ...d,
    updated: rows.map((o) => o.updated).sort().at(-1)!, // latest 更新日期 of this service's rows
    options: rows.map(({ updated, ...o }) => (o.pct ? { ...o, price: Math.round((base * o.pct) / 100), from: true } : { ...o, price: o.price ?? 0 })),
  };
}

export const services: Service[] = drafts.map(withPrices);

const unknown = Object.keys(prices).filter((k) => !services.some((s) => s.options.some((o) => (o.priceKey ?? `${s.id}/${o.id}`) === k)));
if (unknown.length) throw new Error(`src/data/prices.csv has rows no service uses: ${unknown.join(', ')}`);

/** Headline "from" price for cards and the catalog: the cheapest priced main option (undefined if all are on request). */
export const fromPrice = (s: Service) => {
  const p = s.options.filter((o) => !o.extra && !o.onRequest && (!o.addon || !mainOptions(s).length)).map((o) => o.price);
  return p.length ? Math.min(...p) : undefined;
};
/** The one-line headline for a service card / catalog entry: cheapest priced main option, duration range of the main options. */
export function headline(s: Service) {
  const main = mainOptions(s).length ? mainOptions(s).filter((o) => !o.extra) : s.options;
  const price = fromPrice(s);
  const mins = main.map((o) => o.minutes);
  const only = main.length === 1 ? main[0] : undefined;
  return {
    price: price ?? 0,
    onRequest: price === undefined,
    from: main.length > 1 || !!only?.from,
    unit: only?.unit,
    wasPrice: only?.wasPrice,
    minutes: only?.unit ? undefined : ([Math.min(...mins), Math.max(...mins)] as const),
  };
}

type Priced = Pick<ServiceOption, 'price' | 'from' | 'unit' | 'onRequest'>;
/** "$80" · "from $130" · "$6 / nail" · "Price on request" (zh: "$130 起" · "$6 / 只" · "定制价，需咨询"). */
export const priceText = (o: Priced, lang: Lang) => {
  if (o.onRequest) return lang === 'zh' ? '定制价，需咨询' : 'Price on request';
  const p = o.from ? (lang === 'zh' ? `$${o.price} 起` : `from $${o.price}`) : `$${o.price}`;
  return o.unit ? `${p} / ${o.unit[lang]}` : p;
};

/** Services you can start a booking with (an add-on-only service like nail extensions is booked on top of another). */
export const bookable = () => services.filter((s) => mainOptions(s).length);
/** Where to book an add-on-only service: the first service that offers its add-on. */
export const bookableWith = (s: Service) =>
  mainOptions(s).length ? s : bookable().find((b) => b.options.some((o) => s.options.some((x) => x.addon && x.id === o.id)))!;

/** The group heading to show before option `i`, if a new group starts there. */
export const groupAt = (options: ServiceOption[], i: number) =>
  options[i].group && options[i].group !== options[i - 1]?.group ? options[i].group : undefined;

export const findOption = (serviceId: string, optionId: string) =>
  services.find((s) => s.id === serviceId)?.options.find((o) => o.id === optionId && !o.addon);

export type Addons = Record<string, number>; // add-on id → units
export const mainOptions = (s: Service) => s.options.filter((o) => !o.addon);
export const addonOptions = (s: Service) => s.options.filter((o) => o.addon);

/** "bottom-full:1,extension:4" ↔ { 'bottom-full': 1, extension: 4 } (sorted, so equal choices give equal keys). */
export const addonsParam = (a: Addons) =>
  Object.entries(a).filter(([, n]) => n > 0).sort(([x], [y]) => x.localeCompare(y)).map(([id, n]) => `${id}:${n}`).join(',');
export const parseAddons = (s: string): Addons | null => {
  const out: Addons = {};
  for (const part of s ? s.split(',') : []) {
    const m = part.match(/^([a-z0-9-]{1,40}):(\d{1,2})$/);
    if (!m || m[1] in out) return null;
    out[m[1]] = +m[2];
  }
  return out;
};

/**
 * Validated total for a booking: main option + add-ons. Null when the combination isn't bookable
 * (unknown ids, add-on booked alone, two add-ons from one either/or group, units out of range).
 * Shared by the booking UI and both booking APIs, so price and duration can't disagree.
 */
export function quote(serviceId: string, optionId: string, addons: Addons) {
  const s = services.find((x) => x.id === serviceId);
  const option = s && findOption(serviceId, optionId);
  if (!s || !option) return null;
  const extras: { option: ServiceOption; units: number }[] = [];
  for (const [id, units] of Object.entries(addons)) {
    const o = s.options.find((x) => x.id === id && x.addon);
    if (!o || option.noAddons || !Number.isInteger(units) || units < 1 || units > (o.max ?? 1)) return null;
    if (o.group && extras.some((e) => e.option.group === o.group)) return null;
    extras.push({ option: o, units });
  }
  return {
    service: s,
    option,
    extras,
    minutes: option.minutes + extras.reduce((n, e) => n + e.option.minutes * e.units, 0),
    price: option.price + extras.reduce((n, e) => n + e.option.price * e.units, 0), // on request: add-ons only
    from: !!option.from || extras.some((e) => e.option.from),
    onRequest: !!option.onRequest,
  };
}

/** Every total duration a booking can have (cache keys are per duration, so a booking purges all of them). */
export function allDurations() {
  const out = new Set<number>();
  for (const s of bookable()) {
    // per either/or group: none or one option; per-unit add-on: 0..max units
    let sums = [0];
    const groups = new Map<unknown, ServiceOption[]>();
    for (const o of addonOptions(s)) groups.set(o.group ?? o.id, [...(groups.get(o.group ?? o.id) ?? []), o]);
    for (const opts of groups.values()) {
      const adds = [0, ...opts.flatMap((o) => Array.from({ length: o.max ?? 1 }, (_, i) => o.minutes * (i + 1)))];
      sums = [...new Set(sums.flatMap((a) => adds.map((b) => a + b)))];
    }
    for (const o of mainOptions(s)) for (const n of o.noAddons ? [0] : sums) out.add(o.minutes + n);
  }
  return [...out];
}
