// Tests the daily digest (api/digest.js + src/digest-core.js) with a fake Redis and a fake Resend — no network:  node scripts/test-digest.mjs
import digest from '../api/digest.js';
import lead from '../api/lead.js';

let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${extra}`); if (!ok) fails++; };

// ---- fakes ----
const db = new Map(), ttl = new Map(), sent = []; let resendOk = true;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url) === 'https://redis.test') {
    if (init.headers.Authorization !== 'Bearer tok') return new Response('no', { status: 401 });
    const [cmd, ...a] = JSON.parse(init.body);
    if (cmd === 'GET') return Response.json({ result: db.get(a[0]) ?? null });
    if (cmd === 'SET') { db.set(a[0], a[1]); if (a[2] === 'EX') ttl.set(a[0], Number(a[3])); return Response.json({ result: 'OK' }); }
    if (cmd === 'SCAN') { const re = new RegExp('^' + a[2].replace('*', '.*')); return Response.json({ result: ['0', [...db.keys()].filter((k) => re.test(k))] }); }
    if (cmd === 'MGET') return Response.json({ result: a.map((k) => db.get(k) ?? null) });
    if (cmd === 'DEL') { let n = 0; for (const k of a) n += db.delete(k) ? 1 : 0; return Response.json({ result: n }); }
    return new Response('bad', { status: 400 });
  }
  if (String(url) === 'https://api.resend.com/emails') { if (!resendOk) return new Response('x', { status: 500 }); sent.push(JSON.parse(init.body)); return Response.json({ id: 'e1' }); }
  return realFetch(url, init);
};
const run = (auth) => digest.fetch(new Request('https://site.test/api/digest', { headers: auth ? { authorization: auth } : {} }));
const submit = (ip, fields) => lead.fetch(new Request('https://site.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-real-ip': ip }, body: JSON.stringify({ kind: 'general', lang: 'ar', t: 5000, website: '', fields, page: '/ar/contact/' }) }));

process.env.KV_REST_API_URL = 'https://redis.test'; process.env.KV_REST_API_TOKEN = 'tok'; process.env.STORE_LEADS = 'true';
process.env.RESEND_API_KEY = 're_test'; process.env.LEAD_TO = 'sales@x.test, boss@x.test'; process.env.LEAD_FROM = 'Website <noreply@x.test>';

// 1) secret is required
delete process.env.CRON_SECRET;
let r = await run('Bearer whatever'); check('no CRON_SECRET configured → 503 (never runs open)', r.status === 503, `(${r.status})`);
process.env.CRON_SECRET = 'a-long-random-secret-123456';
r = await run(); check('no Authorization header → 401', r.status === 401, `(${r.status})`);
r = await run('Bearer wrong-secret-wrong-secret'); check('wrong secret → 401', r.status === 401, `(${r.status})`);

// 2) nothing stored → no email
r = await run('Bearer a-long-random-secret-123456'); let b = await r.json(); check('no leads → 200, nothing sent', r.status === 200 && b.sent === 0 && sent.length === 0, JSON.stringify(b));

// 3) leads (incl. Arabic text and a spreadsheet-formula attack) → one email with CSV, storage emptied
await submit('1.1.1.1', { name: 'أحمد', email: 'a@b.co', message: 'مرحبا' });
await submit('2.2.2.2', { name: '=HYPERLINK("http://evil","x")', email: 'c@d.co', message: '+cmd|calc', phone: '+971 50 123 4567' });
check('leads stored with the 7-day safety expiry', [...ttl.entries()].filter(([k]) => k.startsWith('lead:')).every(([, t]) => t === 7 * 86400), `(${[...ttl.values()].join(',')})`);
sent.length = 0;
const before = [...db.keys()].filter((k) => k.startsWith('lead:')).length;
r = await run('Bearer a-long-random-secret-123456'); b = await r.json();
check('2 leads → 200, sent 2', r.status === 200 && b.sent === 2, JSON.stringify(b));
check('exactly one email, to both recipients', sent.length === 1 && sent[0].to.length === 2, JSON.stringify(sent[0]?.to));
const csv = Buffer.from(sent[0].attachments[0].content, 'base64').toString('utf8');
check('CSV starts with BOM (Arabic works in Excel) and has header + 2 rows', csv.charCodeAt(0) === 0xfeff && csv.trim().split('\r\n').length === 3);
check('Arabic text preserved', csv.includes('أحمد') && csv.includes('مرحبا'));
check('formula cells neutralised (= and +cmd get a leading quote)', csv.includes(`"'=HYPERLINK`) && csv.includes(`"'+cmd|calc"`));
check('normal phone number left intact', csv.includes('"+971 50 123 4567"'));
check('attachment named leads-YYYY-MM-DD.csv', /^leads-\d{4}-\d{2}-\d{2}\.csv$/.test(sent[0].attachments[0].filename), sent[0].attachments[0].filename);
check('storage emptied of leads after sending', [...db.keys()].filter((k) => k.startsWith('lead:')).length === 0 && before === 2);

// 4) email failure → leads kept for the next run
await submit('3.3.3.3', { name: 'Keep me', email: 'k@k.co', message: 'hi' });
resendOk = false; sent.length = 0;
r = await run('Bearer a-long-random-secret-123456'); check('email failure → 502', r.status === 502, `(${r.status})`);
check('leads are KEPT when the email fails', [...db.keys()].filter((k) => k.startsWith('lead:')).length === 1);
resendOk = true;
r = await run('Bearer a-long-random-secret-123456'); b = await r.json(); check('next run sends the kept lead and clears it', b.sent === 1 && [...db.keys()].filter((k) => k.startsWith('lead:')).length === 0, JSON.stringify(b));

console.log(fails ? `\n${fails} FAILED` : '\nAll digest tests passed.'); process.exit(fails ? 1 : 0);
