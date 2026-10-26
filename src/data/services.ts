// Service menu — PLACEHOLDER prices (AUD) until the owner supplies real ones (docs/SPEC.md §5).
// Shared by home cards, service pages, JSON-LD and the booking flow/API.

export type Lang = 'en' | 'zh';
type L10n = Record<Lang, string>;

export interface ServiceOption {
  id: string;
  name: L10n;
  minutes: number;
  price: number;
  from?: boolean; // "from $X"
}

export interface Service {
  id: string;
  slug: string; // service page path segment
  name: L10n;
  /** One-line card summary (home page). */
  summary: L10n;
  /** ISO date of the last real change to this service's prices/content (drives "Prices updated", dateModified, lastmod). */
  updated: string;
  options: ServiceOption[];
}

export const services: Service[] = [
  {
    id: 'lash-extensions',
    summary: { en: 'Classic, hybrid and volume sets, individually applied for a soft, natural finish.', zh: '经典、混合与浓密款，逐根嫁接，自然柔和。' },
    updated: '2026-10-26',
    slug: 'eyelash-extensions-burwood',
    name: { en: 'Eyelash Extensions', zh: '嫁接睫毛' },
    options: [
      { id: 'classic', name: { en: 'Classic full set', zh: '经典单根全套' }, minutes: 120, price: 120 },
      { id: 'hybrid', name: { en: 'Hybrid full set', zh: '混合款全套' }, minutes: 120, price: 140 },
      { id: 'volume', name: { en: 'Volume full set', zh: '浓密款全套' }, minutes: 150, price: 160 },
      { id: 'refill', name: { en: 'Refill', zh: '补睫毛' }, minutes: 60, price: 65, from: true },
    ],
  },
  {
    id: 'lash-lift',
    summary: { en: 'Lift and tint your natural lashes — no extensions, results last 6–8 weeks.', zh: '提升并染色自然睫毛，无需嫁接，效果约 6–8 周。' },
    updated: '2026-10-26',
    slug: 'lash-lift-burwood',
    name: { en: 'Lash Lift', zh: '睫毛翘睫' },
    options: [{ id: 'lift-tint', name: { en: 'Lash lift & tint', zh: '翘睫 + 染色' }, minutes: 60, price: 90 }],
  },
  {
    id: 'handcrafted-nails',
    summary: { en: 'Hand-painted custom nail art, designed with you and painted by Abby.', zh: '与你一起设计、由 Abby 亲手绘制的定制美甲。' },
    updated: '2026-10-26',
    slug: 'handcrafted-nails-burwood',
    name: { en: 'Handcrafted Nails', zh: '手绘定制美甲' },
    options: [
      { id: 'nail-art', name: { en: 'Hand-painted custom nail art', zh: '手绘定制款' }, minutes: 90, price: 80, from: true },
    ],
  },
  {
    id: 'nail-polish',
    summary: { en: 'Gel and regular polish with careful cuticle prep and shaping.', zh: '光疗与普通甲油，细致修护甲缘与修型。' },
    updated: '2026-10-26',
    slug: 'nail-polish-burwood',
    name: { en: 'Nail Polish', zh: '美甲上色' },
    options: [
      { id: 'gel', name: { en: 'Gel manicure', zh: '光疗甲油' }, minutes: 45, price: 50 },
      { id: 'regular', name: { en: 'Regular polish', zh: '普通甲油' }, minutes: 30, price: 35 },
    ],
  },
  {
    id: 'nail-extensions',
    summary: { en: 'BIAB and Gel-X for strength and length that still looks natural.', zh: 'BIAB 与 Gel-X，坚固延长，依然自然。' },
    updated: '2026-10-26',
    slug: 'nail-extensions-burwood',
    name: { en: 'Nail Extensions', zh: '延长甲' },
    options: [
      { id: 'biab', name: { en: 'BIAB', zh: 'BIAB 加固甲' }, minutes: 90, price: 85 },
      { id: 'gel-x', name: { en: 'Gel-X', zh: 'Gel-X 延长甲' }, minutes: 90, price: 95 },
      { id: 'infill', name: { en: 'Infill', zh: '补甲' }, minutes: 60, price: 65 },
    ],
  },
];

export const findOption = (serviceId: string, optionId: string) =>
  services.find((s) => s.id === serviceId)?.options.find((o) => o.id === optionId);
