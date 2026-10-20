# Enesai Telecom FZCO — corporate B2B wholesale website

Astro 7 static site (EN / RU / AR) + one Cloudflare Worker for the lead forms. Design from the client's logo (navy + silver) in the style of the approved reference site. All product data, photos, contact details and legal text are **drafts/samples** until the client supplies and approves real content.

## Commands
| Command | What it does |
|---|---|
| `npm install` | install dependencies |
| `npm run dev` | live-edit at http://localhost:4321 |
| `npm run build` | validate data + build 179 pages into `dist/` |
| `npm run preview:secure` | serve `dist/` at http://localhost:8766 with the real security headers |
| `npm run check:security` | scan the built site for security mistakes |
| `node scripts/test-worker.mjs` | test the form backend |
| `npx wrangler dev --local` | run site + Worker + KV locally (http://localhost:8787) |
| `npx wrangler deploy` | publish to Cloudflare |
| `npm run import:products -- --template` / `-- data/products.csv` | export / re-import the product list as a spreadsheet |

## Where things are
```
src/i18n/dict.ts            ALL text in English, Russian, Arabic
src/data/site.json          company details (phone, email, WhatsApp, address, GA4 id)
src/data/products.json      product list (+ categories.json, images.json)
src/pages/[lang]/           home, about, products, product, partnership, logistics, contact, privacy, terms, credits
src/components/             LeadForm (4 form types), WorldMap, ProductCard, Listing, PageHead…
src/layouts/Base.astro      header, footer, quote list drawer, cookie banner, SEO tags
src/scripts/app.ts          forms, quote list, filters, cookie banner (only browser JS)
src/worker.js               POST /api/lead + language redirect (Cloudflare Worker)
src/styles/global.css       the whole design (colours at the top, RTL-aware)
public/_headers             security headers (CSP…)    public/brand/  logo + hero background
scripts/                    brand/hero generators, product importer, image tools, security + worker tests
```
See `SECURITY.md` (security + launch checklist) and `KNOWLEDGE.md` (decisions, gaps, next steps).
