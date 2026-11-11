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
- 2026-11-09: client round 3 — new logo (Tunnel.pdf → PyMuPDF render → `scripts/make-brand-assets.mjs`); auto-scrolling flagship strip under the hero (`FlagshipStrip.astro`, ids list inside it); catalog hidden via `site.json → showCatalog:false` (no catalog/brand/product pages built, no menu/footer/home links, 35 pages); contact = "Office #136, First Floor, 5 East B…" + admin@enesaitelecom.com (site.json, dict EN/RU/AR, JSON-LD, security.txt); full outside-in security audit (see SECURITY.md); demo set to noindex.
  - ASSUMPTIONS to confirm with client: (a) "hide this page" = the Products catalog + home "Product range" section; (b) Office #136 is placed IN FRONT of the existing building address.
  - TO RE-ENABLE catalog: set `showCatalog` true in site.json, rebuild, deploy. AT LAUNCH: remove `X-Robots-Tag` in public/_headers, restore robots.txt, set real domain in astro.config.mjs.

## Client feedback round 2 (2026-10-29) — DONE
- **Hero**: client wording from their doc (H1 "Enesai Telecom FZCO", tagline "Global Electronics. Trusted Supply.", DAFZA-based wholesale supplier of consumer electronics and gaming consoles; CTAs "Become a Partner ↗" + "Explore Products") with an **iPhone 18 Pro Burgundy duo** (Apple Newsroom "2up" press image, `public/brand/iphone-18-pro-duo.webp`) in a dark spotlight panel: entrance + float + light-sweep animation, pointer tilt on desktop, off for reduced-motion. Image © Apple, temporary, credited on /credits/.
- **About intro** on home ("Your Partner in Global Electronics Distribution") from the same client doc.
- **Removed** the "Products & categories" carousel from home (category tiles stay).
- **New "Brands We Supply"** section (Apple, Samsung, Xiaomi, Sony, DJI, Garmin, HP): no links, 4 cols desktop / 2 mobile, fade-in + scale-up on scroll, hover enlarge (`BrandShowcase.astro`, `sections.css`, reveal code in `app.ts`). Started as plain text (client brief: logos only if permitted); on the owner's request (2026-10-29) now shows each brand's **logo** as a single-colour navy vector from the `simple-icons` set (dev dependency, drawn inline, no external requests). Disclaimer under it: logos are trademarks shown for identification only, no partnership implied. **Client must confirm permission to show brand logos** (some brands, e.g. Apple/Samsung, restrict logo use by resellers). Safe fallback: set `SHOW_LOGOS = false` in `BrandShowcase.astro` → plain names again.
- **Why Enesai**: new heading/subtitle/6 cards/CTA ("Looking for a Reliable Supply Partner?" → Contact page) from the client brief; shown on home (cards) AND as its own page `/{lang}/why-enesai/` with the requested meta title/description (`WhySection.astro`). Text in EN/RU/AR. DAFZA wording clarified as "a free-zone trade hub"; no unverified figures/claims added.
- **Contact numbers** (from the client's WhatsApp chat): landline **+971 4 580 2484** (written 045802484 → 04 580 2484), mobile/WhatsApp **+971 52 627 3180** (the number that sent the chat — CONFIRM it is meant to be public). Email still placeholder. Chat timestamps ignored on purpose.
- Client note: "other all ok" + they expect the developer to use own judgment for the final design.

## Review pass (2026-10-29) — fonts, logo fidelity, unverified claims
- **Fonts**: headings Cormorant Garamond (elegant serif, chosen to match the client's reference site), body Manrope, Arabic Cairo; all self-hosted. NOTE the real logo wordmark is a modern geometric sans — the serif headlines are a deliberate premium choice, not a logo match. Alternative if the client prefers a closer match: switch headings to a geometric sans (one-line change of `--f-head` in `global.css`).
- **Header now uses the client's real logo** (symbol + their own ENESAI / TELECOM / FZCO lettering, `public/brand/logo-horizontal*.webp`, built by `scripts/make-brand-assets.mjs`) instead of re-typed text. Header collapses to the burger menu below 1260px (Russian labels are long).
- **Removed unverified claims from product cards/pages**: stock status, warranty, "Condition: Brand new, sealed", retail badges (Hot/Deal/Best seller…), and the "available now" filter. Availability is "on request". Data still in `products.json` if the client later supplies real values.
- Still to fix before public launch: remove the "Draft website for client review" top bar (`common.sampleBar` in `dict.ts` + `Base.astro`), real email/licence, real domain, approved RU/AR text, own photos (brand/Apple images and logos are temporary and need permission).

## Peer review vs real Dubai wholesale-electronics sites (2026-11-02)
Compared with Ebizz Fz LLC (ebizz.ae), Kadorf marketplace listings (Metreon FZCO, Eastside Electronics FZCO), ATC's published supplier-verification checklist. Verdict: **design is fine and above the typical level in this niche — no redesign needed**; the gaps are CONTENT/TRUST, mostly needing client facts.
- Buyers vet suppliers by: verifiable physical address, trade licence + registry lookup, company age (<2 yrs = red flag; Enesai is 2022 → ok), written brand authorisation (never claim without proof), sample invoice with serial ranges, regional SKU/warranty, written RMA/return policy, Incoterms in writing, payment terms, certificate of origin/packing list, regional references.
- Peers show: full company-details block (legal name, licence, address, phones, WhatsApp, Telegram, email, hours, named CEO + LinkedIn, trade-platform membership), per-brand/category "X wholesale" landing pages, current stock/offer lists with quantities, sourcing markets, "who we work with".
- Recommended (priority): 1) Company-details block with licence no./TRN/hours/named contact; 2) "How ordering works" (inquiry → quote → pro-forma → payment → serial list → shipment/Incoterms) + "Documents available on request" — text must be confirmed by client; 3) Telegram + LinkedIn contact (CIS buyers use Telegram); 4) brand + category wholesale landing pages with SEO text; 5) weekly "current offers / stock list" page from a spreadsheet (real data only); 6) procurement FAQs (Incoterms, warranty/regional variants, returns, payment); 7) professional Russian copy (CIS is the core market); 8) list the company on GSM Exchange/Kadorf/Alibaba + Google Business Profile + LinkedIn page.
- Caution: "We source … from leading global brands" may imply direct brand sourcing — client should confirm or soften; never show brand-authorisation claims without letters.

## Peer-review recommendations — implemented 2026-11-03 (live, 230 pages)
- **How we work** page `/{lang}/how-we-work/` (EN/RU/AR): 6-step ordering process, "documents available on request", company-details block, buyer FAQ (Incoterms, product version/warranty, defects, payment, shipping; FAQPage schema), CTA. ALL WORDING IS DRAFT — the client must confirm each process/document/term is true for them. Linked from the footer.
- **Company details** are fed from `src/data/site.json`; **empty fields are hidden** (no placeholders on the public site). Now empty: `email`, `licence`, `licenceAuthority`, `taxNo`, `contactName`, `contactRole`, `telegram` (full https://t.me/… URL), `linkedin` (company page URL). Fill them when the client supplies → they appear automatically in footer, contact page, company-details block and schema.
- **Brand landing pages** `/{lang}/brands/{brand}/` (14 brands) + **category intro text** (template `landing.catIntro` in `dict.ts`) for search; product pages link to their brand page. Neutral wording, trademark/no-affiliation note, no authorisation claim. Brand tiles on the home page stay non-clickable (client brief).
- **Offers page** `/{lang}/offers/` driven by `src/data/offers.json` (`[{"product":"…","qty":"300","note":"…"}]`, real data only). Empty now → `noindex`, not in sitemap, not in the menu; add a menu link once real data exists.
- Fixes: Arabic page titles no longer repeat the company name; email hidden everywhere while empty.
- Still open: real email/licence/TRN/contact person/Telegram/LinkedIn, client approval of the draft process + FAQ text, professional Russian copy, offers data, listings on GSM Exchange/Kadorf/Alibaba + Google Business Profile.

## Mobile testing (added 2026-10-20)
- Headless Chrome cannot go below ~500px wide, so it hides phone problems. Use Playwright (viewport 390×844) and measure `document.documentElement.scrollWidth` vs `clientWidth` — if scrollWidth is larger, the page scrolls sideways. Found + fixed: header (langs + quote button + burger) overflowed → language switcher and price-list button now live in the mobile menu; quote button is an icon + count under 640px.
- Contact details still placeholders: phone/email/WhatsApp in `src/data/site.json` — waiting on the client's real numbers/address (the `Website-Information-Checklist.docx` in telecom-site is blank).

## Vercel port (2026-11-11)
Client wants it in their GitHub (anuarismarov-collab/enesaitelecom) + THEIR Vercel. Added: `vercel.json` (headers, language redirect, trailing slash, build cleanup), `api/lead.js` (Vercel Function, Upstash Redis via REST instead of KV), shared `src/lead-core.js`, `scripts/test-vercel.mjs`, `scripts/vercel-clean.mjs`. Cloudflare demo still works (worker imports the same core). `astro.config.mjs` site = SITE_URL → VERCEL_PROJECT_PRODUCTION_URL → demo URL.

## Go live (2026-11-11)
Domain: https://www.enesaitelecom.ae (apex enesaitelecom.ae redirects to www; DNS at Tasjeel, A + CNAME → Vercel, MX dallah.tasjeel.ae untouched — it is the client's mail). Branch `go-live`: removed the draft top bar, removed X-Robots-Tag from vercel.json, robots.txt = Allow + Sitemap (www). Vercel env SITE_URL = https://www.enesaitelecom.ae. Auto-renew of the domain is the client's job. Contact email stays admin@enesaitelecom.com (client decision). Still open: Resend env vars (RESEND_API_KEY, LEAD_TO, LEAD_FROM) + Upstash Redis integration; Russian/Arabic native review; legal text review; client's own product photos.

- 2026-11-11 (digest): api/digest.js + src/digest-core.js + src/upstash.js; cron 0 14 * * * UTC; needs CRON_SECRET env; leads TTL 7 days on Vercel and deleted after the digest email so storage stays empty.

- 2026-11-11 (email-only): owner wants an email only when a real lead arrives. Daily digest cron removed, STORE_LEADS defaults false (no lead data kept). Digest code stays for later.

- 2026-11-11 (client round 4): flagship strip REMOVED from home (component FlagshipStrip.astro kept, unused); trademark note under brands smaller; language buttons EN/RU/AR now always visible in the header (also on phones; removed from burger menu); WhatsApp number -> 971555014955 (site.json only); hero 2nd button -> #brands. OPEN: client note 1.jpeg "place iPhone Duo picture here" had no marked area - asked for the exact spot.

- 2026-11-11 (duo-banner): client note 1 "place iPhone Duo picture here" had no marked area -> added a large iPhone Duo banner band (.duo-band) under the hero where the flagship strip was. Unconfirmed reading; if the client meant another spot, move/remove the <section class="duo-band"> in src/pages/[lang]/index.astro.

- 2026-11-11 (duo image): banner now uses the client's own foldable iPhone Duo photo (D:\Claude-Projects	elecom-site\iphone duo image.jpg, 823px) enhanced by scripts/make-duo-image.mjs -> public/brand/iphone-duo-banner.webp (trim + 2.2x upscale + sharpen); light panel with multiply blend; neutral alt text per language. Hero still uses the burgundy 18 Pro duo (client round 2) - ask if the hero should change too.

- 2026-11-11 (hero duo): client sent the Nero-upscaled foldable iPhone Duo photo -> now the HERO picture (public/brand/iphone-duo-hero.webp, white card, scripts/make-duo-image.mjs trims/resizes); the extra banner section under the hero was removed at the client request ("dont need this section"). Old burgundy duo file iphone-18-pro-duo.webp still in public/brand (unused). Alt text neutral per language.

- 2026-11-11 (hero duo bg): client wants the duo photo on the site background (no white card) -> photo cut out (scripts/cutout.mjs now takes a path + HALO=n edge cleanup; run: node scripts/make-duo-image.mjs <jpg> then HALO=2 node scripts/cutout.mjs public/brand/iphone-duo-hero.webp), card/shine removed, soft drop-shadow instead.

- 2026-11-11 (mobile polish): header language buttons 35x36 px, cookie notice compact (138px in RU), footer links + copyright clear of the WhatsApp float, logo 30px under 380px width. Live mobile audit (390px): no horizontal scroll, nothing wider than the screen.
