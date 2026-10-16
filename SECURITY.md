# Security & launch checklist

## Why this site is low-risk by design
It is a **static site**: after `npm run build` it is just HTML/CSS/JS files. There is no server code, database, login, admin panel, payment form or API key to attack. Orders go through WhatsApp, so no customer data is stored by the website.

## Already built in
| Protection | Where |
|---|---|
| Strict **Content-Security-Policy**: only this site's own scripts/styles/fonts/images may load; no inline code; no framing (anti-clickjacking) | `public/_headers` |
| HSTS (HTTPS only), `nosniff`, referrer + permissions policies, COOP/CORP | `public/_headers` |
| Fonts **self-hosted** (no Google request → visitors' IPs not shared, CSP stays tight) | `@fontsource-variable/*` |
| No third-party scripts, trackers, cookies or analytics | whole site |
| Browser code never uses `innerHTML` with data; saved enquiry list is re-validated on load (tamper-proof) | `src/scripts/app.ts` |
| JSON-LD/data blocks escape `<` so data can't break out of a tag | `src/layouts/Base.astro` |
| Product data validated at build time (bad data fails the build, not the live site) | `src/lib/data.ts`, `scripts/import-products.mjs` |
| `target="_blank"` links all use `rel="noopener noreferrer"` | enforced by check script |
| `security.txt` for responsible disclosure | `public/.well-known/security.txt` |
| Dependencies: 1 framework + 2 font packages, `npm audit` = 0 vulnerabilities | `package.json` |

## Run before EVERY release
```
npm audit                  # known vulnerabilities in dependencies (must be 0 high/critical)
npm run build              # also validates all product data
npm run check:security     # scans dist/ for inline code, 3rd-party loads, missing headers, secrets
npm run preview:secure     # open http://localhost:8766 and click around with the CSP enforced; DevTools console must show no CSP errors
```

## Before going live (owner/client tasks)
- [ ] Set the real domain in `astro.config.mjs` (`site`), `public/robots.txt`, `public/.well-known/security.txt` (also a real security email and a later `Expires` date)
- [ ] Host on **Cloudflare Pages** (free, global CDN, DDoS protection, reads `_headers`) or Netlify. Deploy by Git push or drag-and-drop of `dist/`
- [ ] After deploy, test the live URL: https://securityheaders.com (aim A/A+), https://observatory.mozilla.org, https://www.ssllabs.com/ssltest/
- [ ] Turn on **2-factor authentication** on: domain registrar, DNS/host account, GitHub, the company email
- [ ] Registrar: enable domain lock + auto-renew; DNS: enable DNSSEC if offered
- [ ] Replace ALL sample data: company name, licence number, address, WhatsApp number, prices, policies. Have the client approve the Privacy text
- [ ] Real product photos (WebP, ≤ 200 KB each) — then add an `image` field and `<img>` (same-origin only; the CSP already allows `'self'`)
- [ ] Remove the "sample catalog" top bar from `src/layouts/Base.astro`
- [ ] Lighthouse (Chrome DevTools) run: Performance, Accessibility, SEO ≥ 90

## When you add things later — keep it safe
- **Map embed / analytics / chat widget / contact-form service**: each needs ONE domain added to the matching CSP directive in `_headers` (`frame-src`, `script-src`, `connect-src`, `form-action`). Add only that domain, never `*` or `'unsafe-inline'`. Prefer privacy-friendly analytics (Cloudflare Web Analytics / Plausible).
- **A real contact form** (instead of WhatsApp): use a hosted form service and add **Cloudflare Turnstile** (CAPTCHA) + server-side validation there. Never put an API key or SMTP password in this repo or in browser code.
- **Online payments**: do not hand-build. Use a hosted checkout (Stripe / Network International / PayTabs) so card data never touches this site.
- **Product editing by staff**: keep the spreadsheet→JSON flow (`npm run import:products`). If an admin panel (CMS) is wanted later, treat it as a new project with login, roles and its own security review.
- Update dependencies monthly: `npm outdated` → `npm update` → run the 4 release commands above.
- Never commit `.env` files or keys (already git-ignored). If a secret is ever committed, treat it as leaked and rotate it.

## Legal / compliance notes (client must confirm with their own adviser)
- Show the trade licence number and business address (footer already has placeholders).
- UAE consumer-protection and personal-data rules apply to enquiries; the sample Privacy page must be reviewed and approved.
- Authorised-dealer claims and brand logos need written permission from the brands.
- Warranty and return wording on the site must match what the company really offers.
