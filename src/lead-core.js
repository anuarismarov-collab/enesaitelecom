// Shared lead-form logic (used by the Cloudflare Worker AND the Vercel function). No platform-specific code in here.
// env: { LEADS?: {get(key), put(key, value, {expirationTtl})}, RESEND_API_KEY?, LEAD_TO?, LEAD_FROM? }
// ip: visitor IP as seen by the hosting platform (used only for the per-hour rate limit).

const KINDS = {
  general:     { required: ['name', 'email', 'message'], optional: ['company', 'phone'] },
  partnership: { required: ['name', 'company', 'email', 'phone', 'country', 'partnerType'], optional: ['role', 'volume', 'exclusive', 'exclusiveCountries', 'message'] },
  pricelist:   { required: ['name', 'company', 'email', 'country'], optional: ['phone', 'categories', 'message'] },
  product:     { required: ['name', 'company', 'email', 'country'], optional: ['phone', 'quantity', 'message'] },
  quote:       { required: ['name', 'company', 'email', 'country'], optional: ['phone', 'message'] },
};
const MAX_LEN = { default: 200, message: 1500, categories: 400, company: 120, email: 120 };
const RATE_LIMIT = 6;                 // submissions per IP per hour
const MIN_FILL_MS = 2500;             // humans need more than 2.5 s to fill a form
const LANGS = ['en', 'ru', 'ar'];

export const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,255}\.[A-Za-z]{2,}$/;

const memHits = new Map();            // fallback rate limiter (per Worker instance) when KV is not bound
async function rateLimited(env, ip) {
  const bucket = Math.floor(Date.now() / 3_600_000), key = `rl:${ip}:${bucket}`;
  if (env.LEADS) {
    const n = Number((await env.LEADS.get(key)) || 0);
    if (n >= RATE_LIMIT) return true;
    await env.LEADS.put(key, String(n + 1), { expirationTtl: 3700 });
    return false;
  }
  const n = (memHits.get(key) || 0) + 1; memHits.set(key, n);
  if (memHits.size > 5000) memHits.clear();
  return n > RATE_LIMIT;
}

function validate(body) {
  const spec = KINDS[body?.kind];
  if (!spec) return { error: 'bad_kind' };
  const src = body.fields && typeof body.fields === 'object' ? body.fields : {};
  const fields = {};
  for (const key of [...spec.required, ...spec.optional]) {
    let v = src[key];
    if (key === 'categories') v = Array.isArray(v) ? v.slice(0, 12).map((x) => clean(x, 40)).join(', ') : '';
    if (key === 'exclusive') v = v === true ? 'yes' : '';
    fields[key] = clean(v, MAX_LEN[key] ?? MAX_LEN.default);
  }
  for (const key of spec.required) if (!fields[key]) return { error: 'missing_' + key };
  if (!EMAIL.test(fields.email)) return { error: 'bad_email' };
  const items = Array.isArray(body.items) ? body.items.slice(0, 60).map((x) => clean(x, 160)).filter(Boolean) : [];
  if (body.kind === 'quote' && !items.length) return { error: 'empty_quote' };
  const lang = LANGS.includes(body.lang) ? body.lang : 'en';
  return { kind: body.kind, lang, fields, items, page: clean(body.page, 120) };
}

function emailText(lead, id) {
  const lines = [`New website lead — ${lead.kind.toUpperCase()} (${lead.lang})`, `Reference: ${id}`, `Page: ${lead.page}`, ''];
  for (const [k, v] of Object.entries(lead.fields)) if (v) lines.push(`${k}: ${v}`);
  if (lead.items.length) lines.push('', 'Products:', ...lead.items.map((i) => `  - ${i}`));
  return lines.join('\n');
}

async function sendEmail(env, lead, id) {
  if (!env.RESEND_API_KEY || !env.LEAD_TO || !env.LEAD_FROM) return null;           // not configured
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.LEAD_FROM, to: String(env.LEAD_TO).split(',').map((s) => s.trim()).filter(Boolean),
      reply_to: lead.fields.email, subject: `[Website] ${lead.kind} — ${lead.fields.company || lead.fields.name}`.slice(0, 150), text: emailText(lead, id),
    }),
  });
  return r.ok;
}

export async function handleLead(request, env, ip = 'unknown') {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'origin' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'type' }, 415);
  const raw = await request.text();
  if (raw.length > 20_000) return json({ error: 'too_large' }, 413);
  let body; try { body = JSON.parse(raw); } catch { return json({ error: 'json' }, 400); }

  // bots: honeypot filled or form submitted impossibly fast → pretend success, store nothing
  if (clean(body.website, 50) !== '' || !(Number(body.t) >= MIN_FILL_MS)) return json({ ok: true });

  if (await rateLimited(env, ip)) return json({ error: 'rate_limited' }, 429);

  const lead = validate(body);
  if (lead.error) return json({ error: lead.error }, 400);

  const id = crypto.randomUUID().slice(0, 8);
  const record = { id, ts: new Date().toISOString(), ...lead };
  let delivered = false, configured = false;
  const mail = await sendEmail(env, lead, id).catch(() => false);
  if (mail !== null) { configured = true; delivered ||= mail; }
  if (env.LEADS) {
    configured = true;
    try { await env.LEADS.put(`lead:${record.ts}:${id}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * (Number(env.LEAD_TTL_DAYS) || 90) }); delivered = true; } catch { /* handled below */ }
  }
  if (!configured) return json({ error: 'not_configured' }, 503);
  if (!delivered) return json({ error: 'delivery_failed' }, 502);
  return json({ ok: true, id });
}

