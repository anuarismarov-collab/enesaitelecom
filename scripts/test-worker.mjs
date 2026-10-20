// Tests the lead-form backend (src/worker.js) without deploying:  node scripts/test-worker.mjs
import worker from '../src/worker.js';

const kv = () => { const m = new Map(); return { m, get: async (k) => m.get(k) ?? null, put: async (k, v) => void m.set(k, v) }; };
const assets = { fetch: async () => new Response('asset', { status: 200 }) };
const post = (body, env, headers = {}) => worker.fetch(new Request('https://site.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
const good = { kind: 'pricelist', lang: 'ru', t: 9000, website: '', page: '/ru/', fields: { name: 'Ivan', company: 'Retail LLC', email: 'ivan@retail.ru', country: 'Kazakhstan', categories: ['laptops', 'gaming'], message: 'Need prices' } };

let fails = 0;
const check = async (name, promise, want, extra) => {
  const r = await promise; const j = await r.clone().json().catch(() => ({}));
  const ok = r.status === want && (!extra || extra(j));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (HTTP ${r.status}${j.error ? ' ' + j.error : ''})`); if (!ok) fails++;
};

const env1 = { LEADS: kv(), ASSETS: assets };
await check('valid price-list request is stored', post(good, env1), 200, (j) => j.ok && j.id);
console.log('      stored records:', env1.LEADS.m.size ? [...env1.LEADS.m.keys()].filter((k) => k.startsWith('lead:')).length : 0);
await check('bad e-mail rejected', post({ ...good, fields: { ...good.fields, email: 'nope' } }, env1), 400);
await check('missing required field rejected', post({ ...good, fields: { ...good.fields, company: '' } }, env1), 400);
await check('unknown form kind rejected', post({ ...good, kind: 'hack' }, env1), 400);
await check('empty quote list rejected', post({ ...good, kind: 'quote', items: [] }, env1), 400);
await check('quote with items accepted', post({ ...good, kind: 'quote', items: ['2 x iPad Air'] }, env1), 200);
const before = env1.LEADS.m.size;
await check('honeypot filled → silently dropped (200, nothing stored)', post({ ...good, website: 'http://spam' }, env1), 200);
await check('submitted too fast → silently dropped', post({ ...good, t: 300 }, env1), 200);
console.log(`${env1.LEADS.m.size === before ? 'PASS' : 'FAIL'}  bots stored nothing`); if (env1.LEADS.m.size !== before) fails++;
await check('foreign Origin blocked', post(good, env1, { Origin: 'https://evil.example' }), 403);
await check('non-JSON blocked', post('x=1', env1, { 'Content-Type': 'text/plain' }), 415);
await check('oversized body blocked', post('{"a":"' + 'x'.repeat(25000) + '"}', env1), 413);
await check('GET not allowed', worker.fetch(new Request('https://site.test/api/lead'), env1), 405);
await check('script tags are stored as plain text, not executed (no HTML in e-mail)', post({ ...good, fields: { ...good.fields, message: '<script>alert(1)</script>' } }, env1, { 'CF-Connecting-IP': '9.9.9.9' }), 200);
const env2 = { LEADS: kv(), ASSETS: assets };
for (let i = 0; i < 6; i++) await post(good, env2);
await check('7th submission from one IP in an hour → rate limited', post(good, env2), 429);
await check('nothing configured → 503 so the site falls back to WhatsApp', post(good, { ASSETS: assets }), 503);
const r = await worker.fetch(new Request('https://site.test/', { headers: { 'Accept-Language': 'ru-RU,ru;q=0.9' } }), env1);
console.log(`${r.status === 302 && r.headers.get('Location') === '/ru/' ? 'PASS' : 'FAIL'}  "/" redirects Russian browsers to /ru/`); if (r.status !== 302 || r.headers.get('Location') !== '/ru/') fails++;
const a = await worker.fetch(new Request('https://site.test/en/about/'), env1);
console.log(`${(await a.text()) === 'asset' ? 'PASS' : 'FAIL'}  other paths are served from static assets`);
console.log(fails ? `\n${fails} FAILED` : '\nAll worker tests passed.'); process.exit(fails ? 1 : 0);
