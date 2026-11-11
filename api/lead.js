// Vercel Function: handles the website lead forms at POST /api/lead (same logic as the Cloudflare Worker, see src/lead-core.js).
//
// Configure in Vercel → Project → Settings → Environment Variables:
//   RESEND_API_KEY (secret) + LEAD_TO (e.g. "sales@company.com") + LEAD_FROM (e.g. "Website <noreply@company.com>")  → email notification
//   Optional storage + reliable rate limit: add the free "Upstash Redis" integration (Vercel → Storage / Marketplace). It sets
//   KV_REST_API_URL + KV_REST_API_TOKEN automatically. By default it is used ONLY for the hourly spam counter - no lead is stored (email-only).
//   To also keep leads and use the daily digest (api/digest.js + a "crons" entry in vercel.json): set STORE_LEADS=true (expiry LEAD_TTL_DAYS, default 7).
// If neither email nor storage is configured the API answers 503 and the website falls back to a WhatsApp message.
import { handleLead } from '../src/lead-core.js';
import { leadStore } from '../src/upstash.js';

export default {
  async fetch(request) {
    const env = { LEADS: leadStore(), RESEND_API_KEY: process.env.RESEND_API_KEY, LEAD_TO: process.env.LEAD_TO, LEAD_FROM: process.env.LEAD_FROM, LEAD_TTL_DAYS: process.env.LEAD_TTL_DAYS || '7', STORE_LEADS: process.env.STORE_LEADS || 'false' };
    // Vercel sets these headers itself (a visitor cannot forge them).
    const ip = request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    return handleLead(request, env, ip);
  },
};
