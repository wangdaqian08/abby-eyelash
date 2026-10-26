// Client reviews shown on the home page.
// DUMMY data for the preview only (decision D3). Replace with real Google reviews (copied with the client's
// wording, name as shown on Google) and set `dummy: false`, or remove the Reviews section, before launch.
// Never emit Review / AggregateRating schema for these.

export interface Review {
  name: string;
  lang: 'en' | 'zh';
  rating: number; // 1–5
  date: string; // ISO date of the Google review
  text: string;
  dummy: boolean;
}

export const reviews: Review[] = [
  { name: 'Sophie L.', lang: 'en', rating: 5, date: '2026-09-18', text: 'Abby took the time to work out what would suit my eyes instead of just doing the biggest set. My hybrids look soft and natural, and the refill three weeks later was quick and easy.', dummy: true },
  { name: '王小姐', lang: 'zh', rating: 5, date: '2026-09-02', text: '手绘美甲太好看了！跟 Abby 说了想要的感觉，她现场帮我调整设计，细节很精致，戴了三周都没有翘边。', dummy: true },
  { name: 'Emily R.', lang: 'en', rating: 5, date: '2026-08-21', text: 'First lash lift and I’m hooked. Abby explained every step, did a patch test beforehand and the curl has lasted beautifully.', dummy: true },
  { name: 'Chen Y.', lang: 'zh', rating: 5, date: '2026-08-07', text: '离宝活车站很近，下班过来很方便。环境干净安静，Abby 做睫毛很细心，整个过程几乎睡着了。', dummy: true },
  { name: 'Hannah K.', lang: 'en', rating: 4, date: '2026-07-15', text: 'Lovely BIAB set that has held up well with a lot of typing at work. Booking online was simple and Abby texted to confirm the same day.', dummy: true },
  { name: 'Lily Z.', lang: 'zh', rating: 5, date: '2026-06-30', text: '做了浓密款睫毛，效果自然不夸张，朋友都问在哪里做的。Abby 还很耐心地讲了护理方法，推荐！', dummy: true },
];

/** Google rating shown next to the reviews (no review count until real data exists). */
export const reviewSummary = { rating: 4.9, dummy: true }; // DUMMY

/** D3 launch guard: a production build with LAUNCH=1 must fail while any dummy review data remains. */
export function assertNoDummyAtLaunch(items: { dummy?: boolean }[], launch: string | undefined) {
  if (launch === '1' && items.some((r) => r.dummy))
    throw new Error('Dummy reviews present — replace with real reviews or remove the section before launch');
}

assertNoDummyAtLaunch([...reviews, reviewSummary], process.env.LAUNCH);
