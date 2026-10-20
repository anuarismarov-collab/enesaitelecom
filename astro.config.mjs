import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// CHANGE `site` to the client's real domain before launch (used for canonical URLs, hreflang + sitemap).
export default defineConfig({
  site: 'https://www.example.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Never inline CSS/JS into the HTML: lets the CSP stay strict ('self' only, no 'unsafe-inline').
    inlineStylesheets: 'never',
  },
  i18n: { defaultLocale: 'en', locales: ['en', 'ru', 'ar'], routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false } },
  integrations: [sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', ru: 'ru', ar: 'ar' } } })],
  devToolbar: { enabled: false },
  vite: { build: { assetsInlineLimit: 0 } },
});
