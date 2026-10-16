# Nexora Trading — static product-catalog website

Electronics trading company site (Apple, Samsung, PS5, DJI/GoPro/Insta360, Garmin, Dyson, printers, laptops, accessories).
**Astro 7** static site · plain CSS · TypeScript browser script · no database, no server. All names, prices and contact details are **sample data**.

## Commands
| Command | What it does |
|---|---|
| `npm install` | install dependencies (once) |
| `npm run dev` | live-edit at http://localhost:4321 |
| `npm run build` | validate data + build the site into `dist/` (69 pages) |
| `npm run preview:secure` | serve `dist/` at http://localhost:8766 **with the real security headers** |
| `npm run check:security` | scan the built site for security mistakes |
| `npm run import:products -- --template` | export current products to `data/products.template.csv` (open in Excel) |
| `npm run import:products -- data/products.csv` | validate the spreadsheet and replace `src/data/products.json` |

## Where things are
```
src/data/site.json         company name, phone, WhatsApp, address, hours
src/data/categories.json   the 8 categories
src/data/products.json     all products (generated from the spreadsheet or edited by hand)
src/pages/                 home, shop, category/[id], brand/[slug], product/[id], wholesale, contact, privacy, 404
src/components/            Art (product drawings), ProductCard, Listing (filters), ContactForm
src/layouts/Base.astro     header, footer, enquiry drawer, SEO tags
src/scripts/app.ts         enquiry basket, filters, WhatsApp forms (the only browser JS)
src/styles/global.css      the whole design (colours at the top in :root)
public/_headers            security headers (CSP etc.) — read by Cloudflare Pages / Netlify
```
See `SECURITY.md` for the security design and the launch checklist.
