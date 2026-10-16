# Nexora Trading site (Astro, static) — project knowledge

**What:** production-style rebuild of the electronics trading company website. Replaces the plain-JS prototype in `D:\Claude-Projects\telecom-site` (kept as reference; older looks in `telecom-site-v1-dark`, `telecom-site-v2-plans`).
**Client products (from client message 2026-10-16):** Apple (iPhone, iPad, MacBook, AirPods, Apple Watch), Samsung phones & tablets, PS5 + accessories, DJI/GoPro/Insta360 cameras, Garmin smartwatches, Dyson, office printers, laptops/gaming/accessories.
**Stack & why:** Astro 7 (same as Orb site) = real HTML page per product (SEO + schema.org), zero server = tiny attack surface. Plain CSS, one small TS script. Fonts self-hosted so CSP is strict (`'self'` only). Host: Cloudflare Pages/Netlify (reads `public/_headers`).
**Design decision:** softened the loud neo-brutalist prototype into a clean premium-retail look (warm white, ink, orange accent, soft shadows) because Apple/Dyson/Garmin/printer buyers incl. offices expect a calmer, trustworthy style.
**Ordering:** enquiry basket (localStorage, re-validated) → WhatsApp message. No payments, no data stored.
**Products maintained by:** spreadsheet → `npm run import:products` (validates, fails safe). Sample data = 41 products.
**Security gate:** `npm audit` + `npm run check:security` + `npm run preview:secure` (CSP enforced). Details in SECURITY.md.
**Gotchas:** (1) CSP forbids inline `style=`/`<script>` — use CSS classes, never inline. (2) Any new external service needs its domain added to `_headers`. (3) In a git-worktree session, run simple separate shell commands (long chained commands are refused). (4) `site` URL in astro.config.mjs/robots.txt is `www.example.com` until launch. (5) Port 8080 on this PC belongs to another project; this one previews on 8766.
**Open / needs client:** real name+logo+colours, product list + photos (Excel/CSV), WhatsApp number, address/licence/hours, retail vs wholesale terms, show prices?, Arabic version?, domain, privacy/returns wording, brand-authorisation letters. Questionnaire: `D:\Claude-Projects\telecom-site\Website-Information-Checklist.pdf` (update with the client's product list: printers, DJI etc. already covered).

## Deployment (Cloudflare Workers static assets)
- Live demo: https://nexora-trading-demo.nexora-trading-site.workers.dev (deployed 2026-10-16 via `npx wrangler deploy`, config in `wrangler.jsonc`; owner is logged in to wrangler on this PC).
- Update the live site: `npx astro build` → `node scripts/check-security.mjs` → `npx wrangler deploy`.
- First deploy of a new workers.dev address takes ~1–3 min before HTTPS works (SSL handshake errors until then).
- Demo still has placeholder canonical URLs (example.com) — before a real launch set `site` + robots.txt, and consider noindex for the demo.

## Company & images (2026-10-17)
- Client: **ENESAI TELECOM FZCO**, First Floor, 5 East B, Dubai Airport Free Zone, Dubai, UAE (in `src/data/site.json`; phone/email/WhatsApp/licence still placeholders). Worker/URL name still "nexora-trading-demo" (kept so a shared link doesn't break; rename later if wanted).
- Photos: `scripts/fetch-images.mjs` pulls only freely-licensed photos from Wikimedia Commons; credits in `src/data/images.json`, shown on product pages + `/credits/`. Only 10 of 41 products have a photo (the rest were shop displays/wrong models and were rejected after eye review); others keep the drawing. NOT copied from brand/shop websites (copyright).
- When the client supplies photos: save as `public/products/<id>.jpg` (≤200 KB) and set `"<id>": {"file":"/products/<id>.jpg","own":true}` in images.json — credit text then disappears automatically.
- Option if the owner accepts the rights risk: brand press/media-kit images (Apple Newsroom, Sony, Samsung, DJI, Dyson) — not used, licence unverified.

## Brand product images (added 2026-10-17, on the owner's instruction)
- 19 products use the manufacturer's OWN official product-page image (Apple, Samsung, Sony/PlayStation, ASUS, DJI, Garmin, HP, Canon) — a TEMPORARY placeholder. Credited "© brand" on the product page and /credits/. Pipeline: `scripts/brand-images.mjs fetch` then `apply id,id` (resizes to WebP ≤900px with sharp; always eyeball the candidate sheet first — some og:images are logos/banners). Firecrawl found the official pages; its free tier rate-limited, so remaining pages were read with plain requests / the browser.
- 10 more products use free-licence Wikimedia photos. Total 29 of 41 have images.
- Still drawings (12): Dyson ×5 (site gives no clean image), GoPro Hero12, Insta360 X4, Lenovo Legion 5, Epson L3250, Galaxy Tab S9, PS5 Digital (only the disc-model image found), Samsung 25W charger.
- RIGHTS: brand marketing images are not licensed to us. OK for a private client demo; before public launch the company must supply its own photos / distributor-approved images, or confirm it is an authorised dealer with image rights. Replace by adding public/products/<id>.jpg and `{"file":..., "own": true}` in src/data/images.json.
- Some brand images show newer generations than the product name (e.g. iPad Air page is M4, MacBook Air page M5): visually near-identical, but the real client catalog should use exact images.

## Session log
- 2026-10-17 (later): added brand images (19) via official product pages; credits page split brand vs free; redeployed; live check OK.
- 2026-10-17: renamed to ENESAI TELECOM FZCO + real address; added photo pipeline + credits page; 70 pages; redeployed; live checks OK.
- 2026-10-16 (later): deployed demo to Cloudflare; verified 200 on key pages, CSP/HSTS headers live, 404 page works.
- 2026-10-16: scaffolded Astro project, 69 pages, 41 sample products, CSV importer, security checker + secure preview server; verified in browser under enforced CSP (home, category+brand filter, product, basket) — no console errors; npm audit 0.
