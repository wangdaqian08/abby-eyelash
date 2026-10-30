// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { services } from './src/data/services.ts';

// Placeholder until the domain is registered — change SITE_URL (env) or this default only.
const site = process.env.SITE_URL ?? 'https://abby-eyelash.pages.dev';

export default defineConfig({
  site,
  output: 'static',
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en-AU', zh: 'zh-Hans' } },
      filter: (page) => !/\/404\/?$/.test(page),
      // Truthful lastmod (GEO-STRATEGY #13): service pages and the home pages (which show prices) get a real date; others omit it.
      serialize(item) {
        const slug = new URL(item.url).pathname.replace(/^\/zh(?=\/)/, '').replace(/^\/|\/$/g, '');
        // home pages list every service's prices, so they change whenever any service does
        const updated = slug === '' ? services.map((s) => s.updated).sort().at(-1) : services.find((s) => s.slug === slug)?.updated;
        return updated ? { ...item, lastmod: updated } : item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
