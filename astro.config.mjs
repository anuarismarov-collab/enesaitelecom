import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// Keep the "current offers" page out of the sitemap while it has no real offers (it is also noindex then).
const hasOffers = JSON.parse(readFileSync(new URL('./src/data/offers.json', import.meta.url), 'utf8')).length > 0;

// CHANGE `site` to the client's real domain before launch (used for canonical URLs, hreflang + sitemap).
export default defineConfig({
  site: 'https://nexora-trading-demo.nexora-trading-site.workers.dev',   // demo address; switch to the client's real domain at launch
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Never inline CSS/JS into the HTML: lets the CSP stay strict ('self' only, no 'unsafe-inline').
    inlineStylesheets: 'never',
  },
  i18n: { defaultLocale: 'en', locales: ['en', 'ru', 'ar'], routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false } },
  integrations: [sitemap({
    i18n: { defaultLocale: 'en', locales: { en: 'en', ru: 'ru', ar: 'ar' } },
    filter: (page) => hasOffers || !page.includes('/offers/'),
  })],
  devToolbar: { enabled: false },
  vite: { build: { assetsInlineLimit: 0 } },
});
