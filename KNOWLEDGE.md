# Enesai Telecom FZCO website (Astro, static + Worker) — project knowledge

**Client:** ENESAI TELECOM FZCO — B2B wholesale import/export of mobile phones & consumer electronics; founded 2022 in Dubai; DAFZA (First Floor, 5 East B, Dubai Airport Free Zone); partners in UAE + CIS; 100,000+ units/year; expanding to Middle East, Africa, Europe, North America. (Facts come ONLY from the client's brief — no invented stats/testimonials.)
**Brief (2026-10-20):** corporate B2B site, pages Home/About/Products/Partnership/Geography & Logistics/Contact/Privacy+Terms; EN+RU(+AR); 4 lead forms; WhatsApp; email/CRM notification; gated price list; cookie banner; GA4; SEO; admin panel; premium B2B look; reference design https://gold-psi-rouge.vercel.app/ (light premium, serif headlines, full-bleed textured hero, product carousel, stats band, trust sections); logo = navy "E" ribbon + ENESAI TELECOM FZCO (file in D:\Claude-Projects\telecom-site).
**Live demo:** https://nexora-trading-demo.nexora-trading-site.workers.dev (worker name still "nexora-trading-demo"; rename + custom domain later). Deploy: build → check:security → `npx wrangler deploy`.

## Status vs the brief
| Requirement | State |
|---|---|
| Pages: Home, About, Products/categories, Partnership, Geography & Logistics (map), Contact, Privacy, Terms | DONE (179 pages) |
| EN + RU + AR (RTL), hreflang, language switcher, `/` redirect by browser language | DONE — RU/AR text needs native review |
| 4 lead forms (general, partnership, price list, product) + quote list | DONE → `/api/lead` |
| WhatsApp click-to-chat + fallback when form service is down | DONE (placeholder number) |
| Form → email/CRM | Worker ready; **needs Resend key** (KV storage works now) |
| Gated price list | NOT gated: request form → sales follows up by email (decision: simpler, qualifies leads). Real gating = later phase (signed links) |
| Cookie banner / GDPR-ready; GA4 | Banner DONE; GA4 prepared but OFF (needs ID + CSP change) |
| SEO (semantic HTML, meta, JSON-LD, sitemap, clean URLs) | DONE |
| Security (CSP, rate limit, honeypot, validation) | DONE + tested — see SECURITY.md |
| Admin panel | NOT built. Today: edit JSON / spreadsheet importer (`npm run import:products`). Phase 2 option: Decap CMS (git-based) or small admin Worker — needs its own security review |
| News/insights, testimonials, company PDF | NOT built (optional in brief; testimonials only when real) |
| Real product photos / team / warehouse photos | MISSING — temporary brand images + free photos; see below |
| 1–2 h training, 30–60 days support | Not part of this build |

## Design decisions
- Palette from the logo (navy #0b1226, steel #5a6d99, silver) — the earlier orange/neo-brutalist look was dropped. Cormorant Garamond headlines + Manrope body (+ Cairo for Arabic), all self-hosted.
- Hero background generated in code (`scripts/make-hero-bg.mjs`) — no stock photo licence. Logo variants generated from the client's JPEG (`scripts/make-brand-assets.mjs`).
- No public prices (wholesale): "price on request" + quote list. Retail cart removed.
- World map built at build time from Natural Earth data (public domain) — UAE hub, CIS active, planned regions shaded.

## Images
- 19 products use manufacturer images from official brand pages (temporary, © brands, credited on /credits/), 10 use free-licence Wikimedia photos; 12 still drawings (Dyson ×5, GoPro, Insta360, Lenovo Legion, Epson, Tab S9, PS5 Digital, Samsung charger). Brand images are NOT licensed to us → replace with company/distributor photos before public launch (`public/products/<id>.jpg` + `{"own":true}` in images.json). `scripts/cutout.mjs` removes white backgrounds.
- Some brand images show newer generations than the product name.

## Gotchas
- `.lg` was once both a button size and a map-legend class (broke buttons) — legend is `.lgd`.
- CSP forbids inline style/script — use classes.
- In the git-worktree session, run simple separate shell commands (long chained ones are refused). Headless-Chrome screenshots: `node scripts/shot.mjs <url> <out.png> [w] [h]` (create the output folder first).
- Windows locks files sharp reads — read into a Buffer first.
- Firecrawl free tier rate-limits quickly.

## Open / needs from the client
Real phone/email/WhatsApp, trade licence no., working hours, domain, logo files in vector, product list + photos, partnership conditions, company presentation PDF, approved Russian/Arabic wording, legal texts, Resend/email setup, GA4 id.

## Session log
- 2026-10-17: rebrand + brand images (19) + credits.
- 2026-10-20: full B2B rebuild per client brief: new design from logo, i18n EN/RU/AR, lead-form Worker + KV (created KV namespace LEADS in owner's Cloudflare), cookie banner, world map, 179 pages, security checks + 17 worker tests pass, deployed and verified live (pages, redirect, form, headers).

## Client feedback round 2 (2026-10-29) — DONE
- **Hero**: client wording from their doc (H1 "Enesai Telecom FZCO", tagline "Global Electronics. Trusted Supply.", DAFZA-based wholesale supplier of consumer electronics and gaming consoles; CTAs "Become a Partner ↗" + "Explore Products") with an **iPhone 18 Pro Burgundy duo** (Apple Newsroom "2up" press image, `public/brand/iphone-18-pro-duo.webp`) in a dark spotlight panel: entrance + float + light-sweep animation, pointer tilt on desktop, off for reduced-motion. Image © Apple, temporary, credited on /credits/.
- **About intro** on home ("Your Partner in Global Electronics Distribution") from the same client doc.
- **Removed** the "Products & categories" carousel from home (category tiles stay).
- **New "Brands We Supply"** section (Apple, Samsung, Xiaomi, Sony, DJI, Garmin, HP): plain text names (no logos — not permitted/verified), no links, 4 cols desktop / 2 mobile, fade-in + scale-up on scroll, hover enlarge (`BrandShowcase.astro`, `sections.css`, reveal code in `app.ts`). A small note says brand names belong to their owners; no partnership implied.
- **Why Enesai**: new heading/subtitle/6 cards/CTA ("Looking for a Reliable Supply Partner?" → Contact page) from the client brief; shown on home (cards) AND as its own page `/{lang}/why-enesai/` with the requested meta title/description (`WhySection.astro`). Text in EN/RU/AR. DAFZA wording clarified as "a free-zone trade hub"; no unverified figures/claims added.
- **Contact numbers** (from the client's WhatsApp chat): landline **+971 4 580 2484** (written 045802484 → 04 580 2484), mobile/WhatsApp **+971 52 627 3180** (the number that sent the chat — CONFIRM it is meant to be public). Email still placeholder. Chat timestamps ignored on purpose.
- Client note: "other all ok" + they expect the developer to use own judgment for the final design.

## Mobile testing (added 2026-10-20)
- Headless Chrome cannot go below ~500px wide, so it hides phone problems. Use Playwright (viewport 390×844) and measure `document.documentElement.scrollWidth` vs `clientWidth` — if scrollWidth is larger, the page scrolls sideways. Found + fixed: header (langs + quote button + burger) overflowed → language switcher and price-list button now live in the mobile menu; quote button is an icon + count under 640px.
- Contact details still placeholders: phone/email/WhatsApp in `src/data/site.json` — waiting on the client's real numbers/address (the `Website-Information-Checklist.docx` in telecom-site is blank).
