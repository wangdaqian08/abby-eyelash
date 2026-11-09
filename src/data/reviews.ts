// Client reviews shown on the home page.
// Real Google reviews only, copied with the client's wording and the name as shown on Google, `dummy: false`.
// Never emit Review / AggregateRating schema for these.

export interface Review {
  name: string;
  lang: 'en' | 'zh';
  rating: number; // 1–5
  date: string; // ISO date of the Google review
  text: string;
  dummy: boolean;
}

// Empty until Abby has real Google reviews (the made-up preview reviews were removed before launch, 2026-11-09).
// The Reviews section, its menu link and the hero rating show only when there is real data here.
export const reviews: Review[] = [];

/** Google rating shown in the hero (no review count). null = no rating shown. */
export const reviewSummary: { rating: number; dummy: boolean } | null = null;

/** D3 launch guard: a production build with LAUNCH=1 must fail while any dummy review data remains. */
export function assertNoDummyAtLaunch(items: { dummy?: boolean }[], launch: string | undefined) {
  if (launch === '1' && items.some((r) => r.dummy))
    throw new Error('Dummy reviews present — replace with real reviews or remove the section before launch');
}

assertNoDummyAtLaunch([...reviews, ...(reviewSummary ? [reviewSummary] : [])], process.env.LAUNCH);
