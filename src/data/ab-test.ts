// A/B test of the two looks. A = this build (main). B = the liquid-glass build, served from its own deployment.
// Same URLs and the same text in both, so search and AI crawlers see one page; only the styling differs.
// bPercent: share of NEW visitors put in B (0 = test off, everyone gets A). `npm run check:go-live` blocks launch while it is 0.
export const abTest = {
  bPercent: 0,
  // Branch deployment of feat/liquid-glass-ui. It must be built with the production SITE_URL (canonicals, GA4 host).
  bOrigin: 'https://feat-liquid-glass-ui.abby-eyelash.pages.dev',
  cookie: 'style',
  maxAgeDays: 30,
};
