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
      // Truthful lastmod (GEO-STRATEGY #13): only service pages have a real "updated" date; others omit it.
      serialize(item) {
        const slug = new URL(item.url).pathname.replace(/^\/zh(?=\/)/, '').replace(/^\/|\/$/g, '');
        const updated = services.find((s) => s.slug === slug)?.updated;
        return updated ? { ...item, lastmod: updated } : item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
