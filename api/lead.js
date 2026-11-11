// Vercel Function: handles the website lead forms at POST /api/lead (same logic as the Cloudflare Worker, see src/lead-core.js).
//
// Configure in Vercel → Project → Settings → Environment Variables:
//   RESEND_API_KEY (secret) + LEAD_TO (e.g. "sales@company.com") + LEAD_FROM (e.g. "Website <noreply@company.com>")  → email notification
//   Optional storage + reliable rate limit: add the free "Upstash Redis" integration (Vercel → Storage / Marketplace). It sets
//   KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) automatically → leads are also kept 90 days.
// If neither email nor storage is configured the API answers 503 and the website falls back to a WhatsApp message.
import { handleLead } from '../src/lead-core.js';

const REST_URL = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Tiny Redis-over-HTTPS client exposing the same get/put shape as a Cloudflare KV binding.
const store = () => {
  const url = REST_URL(), token = REST_TOKEN();
  if (!url || !token) return undefined;
  const call = async (cmd) => {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
    if (!r.ok) throw new Error('store');
    return (await r.json()).result;
  };
  return {
    get: (key) => call(['GET', key]),
    put: (key, value, opts = {}) => call(opts.expirationTtl ? ['SET', key, value, 'EX', String(opts.expirationTtl)] : ['SET', key, value]),
  };
};

export default {
  async fetch(request) {
    const env = { LEADS: store(), RESEND_API_KEY: process.env.RESEND_API_KEY, LEAD_TO: process.env.LEAD_TO, LEAD_FROM: process.env.LEAD_FROM };
    // Vercel sets these headers itself (a visitor cannot forge them).
    const ip = request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    return handleLead(request, env, ip);
  },
};
