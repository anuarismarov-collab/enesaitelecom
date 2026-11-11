// Cloudflare Worker: serves the static site and handles lead forms at POST /api/lead.
//
// Delivery (configure in the Cloudflare dashboard or with `wrangler secret put`):
//   RESEND_API_KEY  (secret)  + LEAD_TO (e.g. "sales@company.com")  + LEAD_FROM (e.g. "Website <noreply@company.com>")  → email notification
//   LEADS           (KV binding, see wrangler.jsonc)                                                                      → leads also stored for 90 days
// If neither email nor KV is configured the API answers 503 and the website falls back to a WhatsApp message.
//
// Protection: same-origin check, JSON-only, 20 KB limit, strict field allow-list + length limits, honeypot field,
// minimum fill time, per-IP rate limit (KV when available), no HTML in emails, no secrets ever sent to the browser.

import { handleLead, json } from './lead-core.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/lead') return handleLead(request, env, request.headers.get('CF-Connecting-IP') || 'unknown');
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    if (url.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) {
      const al = (request.headers.get('Accept-Language') || '').toLowerCase();
      const lang = al.startsWith('ru') ? 'ru' : al.startsWith('ar') ? 'ar' : 'en';
      return new Response(null, { status: 302, headers: { Location: `/${lang}/`, Vary: 'Accept-Language', 'Cache-Control': 'no-store' } });
    }
    return env.ASSETS.fetch(request);
  },
};
