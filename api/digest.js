// Vercel Function run by Vercel Cron once a day (see "crons" in vercel.json): emails the day's leads as a spreadsheet, then clears them.
// Needs: CRON_SECRET (any long random text, set in Vercel env — Vercel Cron sends it automatically), RESEND_API_KEY, LEAD_TO, LEAD_FROM, and the Upstash Redis integration.
import { runDigest } from '../src/digest-core.js';
import { redis, storageConfigured } from '../src/upstash.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// constant-time compare so the secret cannot be guessed by timing
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

export default {
  async fetch(request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 16) return json({ error: 'not_configured' }, 503);              // never run without a proper secret
    if (!same(request.headers.get('authorization') || '', `Bearer ${secret}`)) return json({ error: 'unauthorized' }, 401);
    if (!storageConfigured()) return json({ error: 'storage_not_configured' }, 503);
    try {
      const { status, body } = await runDigest({ redis, fetch, env: process.env });
      return json(body, status);
    } catch { return json({ error: 'digest_failed' }, 500); }
  },
};
