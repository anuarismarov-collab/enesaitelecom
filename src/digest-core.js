// Daily lead digest: collect stored leads → one Excel-ready CSV → email → delete the sent leads (so storage stays empty).
// Platform-independent: all outside access goes through the `deps` argument (redis command runner + fetch for Resend).

const COLUMNS = [
  ['Time (Dubai)', 'time'], ['Reference', 'id'], ['Form', 'kind'], ['Language', 'lang'],
  ['Name', 'name'], ['Company', 'company'], ['Email', 'email'], ['Phone', 'phone'], ['Country', 'country'], ['Role', 'role'],
  ['Partner type', 'partnerType'], ['Volume', 'volume'], ['Exclusive', 'exclusive'], ['Exclusive countries', 'exclusiveCountries'],
  ['Categories', 'categories'], ['Quantity', 'quantity'], ['Message', 'message'], ['Products', 'products'], ['Page', 'page'],
];

const dubai = (iso) => { try { return new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', hour12: false }).replace(',', ''); } catch { return iso; } };

// Excel runs formulas that start with = + - @ — visitors control this text, so neutralise it (plain phone numbers like +971… are allowed).
const safe = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s) && !/^\+[\d\s()-]+$/.test(s)) s = "'" + s;
  return s;
};
const cell = (v) => `"${safe(v).replace(/"/g, '""')}"`;

export function buildCsv(leads) {
  const rows = leads.map((l) => {
    const f = { ...l.fields, id: l.id, kind: l.kind, lang: l.lang, time: dubai(l.ts), page: l.page, products: (l.items || []).join('; ') };
    return COLUMNS.map(([, key]) => cell(f[key])).join(',');
  });
  // BOM first so Excel reads Arabic/Russian text correctly
  return '﻿' + [COLUMNS.map(([h]) => cell(h)).join(','), ...rows].join('\r\n') + '\r\n';
}

async function collectKeys(redis) {
  const keys = []; let cursor = '0';
  do {
    const [next, batch] = await redis(['SCAN', cursor, 'MATCH', 'lead:*', 'COUNT', '200']);
    keys.push(...batch); cursor = String(next);
  } while (cursor !== '0' && keys.length < 5000);
  return keys;
}

/** deps: { redis(cmd), fetch, env: { RESEND_API_KEY, LEAD_TO, LEAD_FROM }, now?: Date } → { status, body } */
export async function runDigest({ redis, fetch: doFetch, env, now = new Date() }) {
  if (!env.RESEND_API_KEY || !env.LEAD_TO || !env.LEAD_FROM) return { status: 503, body: { error: 'email_not_configured' } };
  const keys = await collectKeys(redis);
  if (!keys.length) return { status: 200, body: { sent: 0 } };

  const values = [];
  for (let i = 0; i < keys.length; i += 100) values.push(...(await redis(['MGET', ...keys.slice(i, i + 100)])));
  const pairs = keys.map((k, i) => { try { return [k, JSON.parse(values[i])]; } catch { return null; } }).filter(Boolean);
  const leads = pairs.map(([, l]) => l).sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  if (!leads.length) return { status: 200, body: { sent: 0 } };

  const day = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
  const lines = leads.map((l) => `- ${dubai(l.ts).slice(11, 16)}  ${l.kind}: ${l.fields.name}${l.fields.company ? ' (' + l.fields.company + ')' : ''} — ${l.fields.email}`);
  const text = `Website leads for ${day}: ${leads.length} new.\n\n${lines.join('\n')}\n\nThe full details are in the attached spreadsheet (opens in Excel).\nThese leads have now been cleared from the website's storage; this email and the spreadsheet are your copy.`;
  const r = await doFetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.LEAD_FROM, to: String(env.LEAD_TO).split(',').map((s) => s.trim()).filter(Boolean),
      subject: `[Website] Daily leads ${day} — ${leads.length} new`, text,
      attachments: [{ filename: `leads-${day}.csv`, content: Buffer.from(buildCsv(leads), 'utf8').toString('base64') }],
    }),
  });
  if (!r.ok) return { status: 502, body: { error: 'email_failed' } };       // keep the leads: they are retried at the next run

  for (let i = 0; i < pairs.length; i += 100) await redis(['DEL', ...pairs.slice(i, i + 100).map(([k]) => k)]);
  // unreadable records (if any) are left to expire on their own
  return { status: 200, body: { sent: leads.length } };
}
