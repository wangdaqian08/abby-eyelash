import type { APIRoute } from 'astro';

// GEO-STRATEGY #3 + decision D2 (training bots allowed). Tokens verified 2026-10-26 against:
// Google https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers ·
// OpenAI https://developers.openai.com/api/docs/bots · Perplexity https://docs.perplexity.ai/guides/bots ·
// Anthropic https://support.claude.com/en/articles/8896518 · Apple https://support.apple.com/en-us/119829 ·
// Common Crawl https://commoncrawl.org/ccbot · Bing https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0
// (Bing writes "bingbot"; user-agent matching is case-insensitive per RFC 9309 §2.2.1.)
const BOTS = [
  'Googlebot', 'bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Applebot', 'Applebot-Extended', 'Google-Extended', 'CCBot',
];

// A crawler obeys only its most specific group, so every named group repeats the same rules.
const group = (ua: string) => `User-agent: ${ua}\nAllow: /\nDisallow: /api/\n`;

export const GET: APIRoute = ({ site }) =>
  new Response([group('*'), ...BOTS.map(group), `Sitemap: ${new URL('/sitemap-index.xml', site)}\n`].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
