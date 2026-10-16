import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// CHANGE `site` to the client's real domain before launch (used for canonical URLs + sitemap).
export default defineConfig({
  site: 'https://www.example.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Never inline CSS/JS into the HTML: lets the CSP stay strict ('self' only, no 'unsafe-inline').
    inlineStylesheets: 'never',
  },
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  vite: { build: { assetsInlineLimit: 0 } },
});
