// Tests the Vercel function (api/lead.js) with a fake Redis — no network, nothing deployed:  node scripts/test-vercel.mjs
import fn from '../api/lead.js';

let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${extra}`); if (!ok) fails++; };
const lead = { kind: 'general', lang: 'en', t: 5000, website: '', fields: { name: 'Test', email: 'a@b.co', message: 'hello' }, page: '/en/contact/' };
const post = (body, ip = '9.9.9.9') => fn.fetch(new Request('https://site.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-real-ip': ip }, body: JSON.stringify(body) }));

// 1) nothing configured → 503 (the website then falls back to WhatsApp)
for (const k of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'RESEND_API_KEY']) delete process.env[k];
let r = await post(lead); check('unconfigured → 503', r.status === 503, `(${r.status})`);
r = await fn.fetch(new Request('https://site.test/api/lead')); check('GET → 405', r.status === 405, `(${r.status})`);

// 2) fake Redis (Upstash REST): stored lead + per-IP rate limit
const db = new Map(), realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url) !== 'https://redis.test') return realFetch(url, init);
  if (init.headers.Authorization !== 'Bearer tok') return new Response('no', { status: 401 });
  const [cmd, key, val] = JSON.parse(init.body);
  if (cmd === 'GET') return Response.json({ result: db.get(key) ?? null });
  if (cmd === 'SET') { db.set(key, val); return Response.json({ result: 'OK' }); }
  return new Response('bad', { status: 400 });
};
process.env.KV_REST_API_URL = 'https://redis.test'; process.env.KV_REST_API_TOKEN = 'tok';
r = await post(lead); check('configured → 200 and stored', r.status === 200 && [...db.keys()].some((k) => k.startsWith('lead:')), `(${r.status})`);
let last; for (let i = 0; i < 7; i++) last = await post(lead, '7.7.7.7');
check('7th submission from one IP → 429', last.status === 429, `(${last.status})`);
r = await post(lead, '8.8.8.8'); check('another IP still allowed', r.status === 200, `(${r.status})`);
r = await fn.fetch(new Request('https://site.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.test' }, body: JSON.stringify(lead) })); check('foreign Origin → 403', r.status === 403, `(${r.status})`);

console.log(fails ? `\n${fails} FAILED` : '\nAll Vercel function tests passed.'); process.exit(fails ? 1 : 0);
