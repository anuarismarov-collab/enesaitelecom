# Security & launch checklist — Enesai Telecom FZCO website

## Architecture (why the attack surface is small)
- **Static site** (Astro) served from Cloudflare's global CDN: no database, no admin login, no server code on page views.
- **One small Worker** (`src/worker.js`) handles only `POST /api/lead` (the lead forms) and the `/` language redirect.
- Form data goes to **Cloudflare KV** (90 days) and, when configured, to **email** (Resend). No payments, no accounts.

## Built in
| Protection | Where |
|---|---|
| Strict **Content-Security-Policy** (own scripts/styles/fonts/images only; no inline code; no framing) + HSTS, nosniff, referrer/permissions policies | `public/_headers` |
| Fonts self-hosted; **no third-party scripts, trackers or cookies** by default | whole site |
| Form API: same-origin check, JSON only, 20 KB limit, field allow-list + length limits, e-mail validation, **honeypot**, minimum fill time, **per-IP rate limit (6/hour)**, plain-text e-mails (no HTML injection), no secrets in browser code | `src/worker.js` — **17 automated tests**: `node scripts/test-worker.mjs` |
| Browser code never uses `innerHTML` with data; saved quote list re-validated on load | `src/scripts/app.ts` |
| **Cookie banner** — optional analytics (GA4) stay OFF until the visitor accepts | `src/scripts/app.ts` |
| Build-time data validation (bad product data fails the build) | `src/lib/data.ts` |
| `rel="noopener"` on external links, `security.txt` | enforced by `scripts/check-security.mjs` |
| Dependencies: `npm audit` = 0 vulnerabilities | `package.json` |

## Run before EVERY release
```
npm audit                    # must show 0 high/critical
node scripts/test-worker.mjs # form backend tests
npm run build                # validates data, builds 179 pages
npm run check:security       # scans dist/ (inline code, 3rd-party loads, headers, secrets)
npm run preview:secure       # http://localhost:8766 with the real CSP enforced — console must show no CSP errors
npx wrangler deploy          # publish
```

## To switch on for the client (owner tasks)
- [ ] **Email delivery**: create a free Resend account, verify the company domain, then in Cloudflare → Workers → `nexora-trading-demo` → Settings → Variables and Secrets add `RESEND_API_KEY` (**secret**), `LEAD_TO` (sales mailbox), `LEAD_FROM` (e.g. `Website <noreply@company.com>`). Until then leads are only in KV (Cloudflare dashboard → Storage & databases → KV → LEADS).
- [ ] **Real domain**: set `site` in `astro.config.mjs`, `Sitemap:` in `public/robots.txt`, `security.txt` contact; add the custom domain in Cloudflare (SSL is automatic). Turn on DNSSEC + registrar lock.
- [ ] **2-factor login** on Cloudflare, the domain registrar, GitHub and the company mailbox.
- [ ] **Google Analytics 4**: put the `G-XXXXXXXXXX` id in `src/data/site.json` (`ga4`) AND add `https://www.googletagmanager.com` to `script-src`/`connect-src` and `https://*.google-analytics.com` to `connect-src`/`img-src` in `public/_headers`. It then loads only after "Accept" on the cookie banner.
- [ ] **Stronger spam protection** (recommended once real traffic arrives): add Cloudflare Turnstile — widget script domain `https://challenges.cloudflare.com` in `script-src` + `frame-src`, and verify the token in `src/worker.js` with a `TURNSTILE_SECRET`.
- [ ] **Map embed** (Contact page): add the Google Maps domain to `frame-src` in `public/_headers`.
- [ ] Replace sample content: product list/photos, WhatsApp number, phone, email, licence number, hours; **client must approve all wording** (English master; Russian and Arabic need a native-speaker review).
- [ ] Privacy Policy and Terms are **drafts** — have the company's legal adviser approve (UAE data law + GDPR if serving Europe).
- [ ] Brand product images are temporary (see `KNOWLEDGE.md`); use the company's own photos before public launch.
- [ ] Test headers on the live URL: https://securityheaders.com, https://observatory.mozilla.org

## Keep it safe later
- Each new external service = add ONLY its domain to the matching CSP directive. Never `*` or `'unsafe-inline'`.
- Never put API keys in this repo or browser code — Worker secrets only. If a secret is ever committed, rotate it.
- Online payments: use a hosted checkout, never build card forms.
- Update dependencies monthly; rerun the release checks.

## Outside-in audit — 2026-11-09 (live demo URL) — all clear
Method: scripted probes of the live site + browser console/network check (script kept out of repo; re-run by hand before launch).
- **URL/path exposure**: 40 sensitive paths (`.git`, `.env`, `.wrangler`, `wrangler.jsonc`, `package.json`, `src/worker.js`, `_headers`, `KNOWLEDGE.md`, `SECURITY.md`, `/admin`, `/api/admin`, path-traversal tricks, `*.map`…) → all 404/400, never file content. No directory listings. Hidden catalog URLs (`/en/products/`, `/en/product/…`, `/en/brands/…`) → 404.
- **API**: only `POST /api/lead` exists. GET/PUT/DELETE/PATCH/OPTIONS → 405; foreign Origin → 403; non-JSON → 415; bad JSON → 400; >20 KB → 413; no CORS headers; errors are short codes only (no stack traces).
- **Console/network**: 0 console messages; only same-origin static requests; no third-party hosts; no cookies set; page `#site-data` JSON holds only UI text + WhatsApp number (catalog list now emptied while the catalog is hidden); JS bundle has no `console.log`, source maps or key-like strings.
- **Headers on every response** (pages, assets, 404, robots, security.txt): CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP/CORP; no `X-Powered-By`.
- **Fixed during audit**: canonical URLs pointed to placeholder `www.example.com` (now the demo address); `security.txt` contact was a placeholder (now admin@enesaitelecom.com); stale orange scaffold `favicon.svg` removed; demo is now `noindex` (X-Robots-Tag + robots.txt Disallow) so search engines don't list it.
- **Dependencies**: `npm audit` 0 vulnerabilities. 17 worker tests + `check-security` pass.
- **Open (owner)**: KV holds one real-looking test lead from 2026-10-21 (auto-expires ~Jan 2027) — delete it in Cloudflare → KV → LEADS if unwanted. Resend email not configured. At launch: remove `X-Robots-Tag` line in `public/_headers`, restore `robots.txt`, set real domain.
