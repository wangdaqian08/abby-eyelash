// A/B test of the two looks, both in this one build: A = the normal pages, B = liquid glass (pages under /look-b/,
// served at the normal URLs by functions/_middleware.ts; components pick their markup with lookOf in src/lib/ab-test.ts).
// Same URLs and the same text in both, so search and AI crawlers see one page; only look and layout differ.
// bPercent: share of NEW visitors put in B (0 = test off, everyone gets A). `npm run check:go-live` blocks launch while it is 0.
export const abTest = {
  bPercent: 0,
  cookie: 'style',
  maxAgeDays: 30,
};
