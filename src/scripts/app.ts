/* Browser logic: lead forms, quote list, listing filters, cookie banner, mobile menu.
   Security notes: no innerHTML with data, saved quote list is re-validated against the known catalog,
   forms post only to our own /api/lead, and the only external link ever opened is wa.me (fallback). */

interface Ui {
  lang: string; name: string; whatsapp: string; ga4: string; catalog: Record<string, string>; empty: string; shown: string; noMatch: string;
  f: Record<string, any>; cookie: Record<string, string>;
}
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const ui: Ui = JSON.parse($('#site-data')!.textContent || '{}');
const F = ui.f;
const clean = (s: string, max: number) => s.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const waLink = (msg: string) => `https://wa.me/${ui.whatsapp}?text=${encodeURIComponent(msg)}`;
const loadedAt = Date.now();

/* ---------- Mobile menu ---------- */
const burger = $('#burger'), links = $('#links');
burger?.addEventListener('click', () => { const o = links!.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); });
links?.addEventListener('click', (e) => { if ((e.target as Element).tagName === 'A') { links.classList.remove('open'); burger?.setAttribute('aria-expanded', 'false'); } });

/* ---------- Quote list (stored only in this browser) ---------- */
type Cart = Record<string, number>;
const KEY = 'enesai_quote';
const readCart = (): Cart => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}'), out: Cart = {};
    for (const [id, q] of Object.entries(raw)) { const n = Number(q); if (Object.hasOwn(ui.catalog, id) && Number.isInteger(n) && n > 0 && n < 1000) out[id] = n; }
    return out;
  } catch { return {}; }
};
const writeCart = (c: Cart) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode */ } renderCart(); };
const drawer = $('#drawer')!, scrim = $('#scrim')!, body = $('#dBody')!, dform = $<HTMLFormElement>('#dForm')!;
const setDrawer = (open: boolean) => {
  drawer.classList.toggle('open', open); scrim.classList.toggle('open', open); drawer.setAttribute('aria-hidden', String(!open));
  if (open) $<HTMLButtonElement>('.x', drawer)?.focus();
};
function renderCart() {
  const cart = readCart(), ids = Object.keys(cart);
  $('#cartCount')!.textContent = String(ids.length);
  dform.hidden = ids.length === 0; body.replaceChildren();
  if (!ids.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = ui.empty; body.append(p); return; }
  for (const id of ids) {
    const row = document.createElement('div'); row.className = 'd-item';
    const name = document.createElement('b'); name.textContent = ui.catalog[id];
    const qty = document.createElement('div'); qty.className = 'qty';
    const mk = (label: string, d: number) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.q = id; b.dataset.d = String(d); b.setAttribute('aria-label', `${label} ${ui.catalog[id]}`); return b; };
    const n = document.createElement('span'); n.textContent = String(cart[id]);
    qty.append(mk('−', -1), n, mk('+', 1)); row.append(name, qty); body.append(row);
  }
}
document.addEventListener('click', (e) => {
  const t = (e.target as Element).closest<HTMLElement>('button,[data-open]'); if (!t) return;
  if (t.hasAttribute('data-open')) { setDrawer(true); return; }
  if (t.hasAttribute('data-close')) { setDrawer(false); return; }
  if (t.dataset.add && Object.hasOwn(ui.catalog, t.dataset.add)) { const c = readCart(); c[t.dataset.add] = Math.min((c[t.dataset.add] || 0) + 1, 999); writeCart(c); setDrawer(true); return; }
  if (t.dataset.q) { const c = readCart(), id = t.dataset.q, q = (c[id] || 0) + Number(t.dataset.d); if (q <= 0) delete c[id]; else c[id] = Math.min(q, 999); writeCart(c); }
});
scrim.addEventListener('click', () => setDrawer(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });
renderCart();

/* ---------- Lead forms → /api/lead (Cloudflare Worker). WhatsApp link shown if the service is unavailable ---------- */
function collect(form: HTMLFormElement) {
  const fd = new FormData(form), fields: Record<string, string | string[] | boolean> = {};
  for (const key of new Set([...fd.keys()])) {
    if (key === 'website' || key === 'consent') continue;
    const all = fd.getAll(key).map((v) => clean(String(v), 1500));
    if (key === 'categories') fields[key] = all;
    else if (key === 'exclusive') fields[key] = true;
    else fields[key] = clean(String(all[0] ?? ''), key === 'message' ? 1500 : 200);
  }
  return fields;
}
function whatsappText(kind: string, fields: Record<string, any>, items: string[]) {
  const lines = [`Hello ${ui.name} — ${kind} (${ui.lang})`];
  for (const [k, v] of Object.entries(fields)) if (v && v !== true) lines.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`); else if (v === true) lines.push(`${k}: yes`);
  if (items.length) lines.push('Products:', ...items);
  return lines.join('\n');
}
async function submitLead(form: HTMLFormElement) {
  const kind = form.dataset.lead!, msg = $('.form-msg', form)!, btn = $<HTMLButtonElement>('button[type=submit]', form)!;
  msg.className = 'form-msg'; msg.replaceChildren();
  if (!form.checkValidity()) { form.reportValidity(); msg.classList.add('bad'); msg.textContent = F.invalid; return; }
  const fields = collect(form);
  const cart = readCart();
  const items = kind === 'quote' ? Object.keys(cart).map((id) => `${cart[id]} × ${ui.catalog[id]}`) : form.dataset.product ? [ui.catalog[form.dataset.product] || form.dataset.product] : [];
  const original = btn.textContent; btn.disabled = true; btn.textContent = F.sending;
  const honey = (form.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '';
  try {
    const r = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, lang: ui.lang, fields, items, website: honey, t: Date.now() - loadedAt, page: location.pathname }) });
    if (r.ok) { msg.classList.add('ok'); msg.textContent = F.success; form.reset(); if (kind === 'quote') writeCart({}); }
    else if (r.status === 503 || r.status === 404) throw new Error('unavailable');
    else { msg.classList.add('bad'); msg.textContent = F.error; }
  } catch {
    // Form service not connected / offline → offer a one-tap WhatsApp message with the same content
    msg.classList.add('warn'); msg.textContent = F.fallbackNote + ' ';
    const a = document.createElement('a'); a.className = 'btn sm'; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = F.toWhatsApp;
    a.href = waLink(whatsappText(kind, fields, items)); msg.append(a);
  } finally { btn.disabled = false; btn.textContent = original; }
}
$$<HTMLFormElement>('form[data-lead]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); void submitLead(f); }));

/* ---------- Listing: filter + sort (cards are already in the HTML; this only shows/hides/reorders) ---------- */
const listing = $('[data-listing]');
if (listing) {
  const grid = $('[data-grid]', listing)!, cards = $$('.pcard', grid), empty = $('[data-empty]', listing)!;
  const sortEl = $<HTMLSelectElement>('#sort')!, stockEl = $<HTMLInputElement>('#stockOnly')!;
  const params = new URLSearchParams(location.search);
  const q = clean(params.get('q') || '', 60).toLowerCase(), wantBrand = params.get('brand');
  if (wantBrand) $$<HTMLInputElement>('input[name=brand]', listing).forEach((i) => { if (i.value === wantBrand) i.checked = true; });
  const apply = () => {
    const brands = $$<HTMLInputElement>('input[name=brand]:checked', listing).map((i) => i.value);
    const shown = cards.filter((c) => {
      const d = c.dataset;
      const ok = (!brands.length || brands.includes(d.brand!)) && (!stockEl.checked || d.stock === 'in' || d.stock === 'low') && (!q || d.search!.includes(q));
      c.hidden = !ok; return ok;
    });
    shown.sort((a, b) => sortEl.value === 'name' ? a.dataset.name!.localeCompare(b.dataset.name!) : Number(b.dataset.feat) - Number(a.dataset.feat));
    shown.forEach((c) => grid.append(c));
    empty.hidden = shown.length > 0;
    $('#count')!.textContent = `${shown.length} ${ui.shown}`;
  };
  listing.addEventListener('input', apply);
  sortEl.addEventListener('change', apply);
  $('#reset')!.addEventListener('click', () => { $$<HTMLInputElement>('input[name=brand]', listing).forEach((i) => (i.checked = false)); stockEl.checked = false; sortEl.value = 'featured'; apply(); });
  $('#fToggle')?.addEventListener('click', (ev) => { const open = $('#filters')!.classList.toggle('show'); (ev.currentTarget as HTMLElement).setAttribute('aria-expanded', String(open)); });
  apply();
}

/* ---------- Cookie banner (GDPR-ready): optional analytics only after "Accept" ---------- */
const CK = 'enesai_cookie', banner = $('#cookie');
const choice = (() => { try { return localStorage.getItem(CK); } catch { return 'no'; } })();
function enableAnalytics() {
  // GA4 is OFF until a measurement ID is set in src/data/site.json AND the CSP in public/_headers allows googletagmanager.com (see SECURITY.md).
  if (!ui.ga4 || !/^G-[A-Z0-9]{6,12}$/.test(ui.ga4)) return;
  const s = document.createElement('script'); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${ui.ga4}`; document.head.append(s);
  const w = window as any; w.dataLayer = w.dataLayer || []; w.gtag = function () { w.dataLayer.push(arguments); }; w.gtag('js', new Date()); w.gtag('config', ui.ga4, { anonymize_ip: true });
}
if (choice === 'yes') enableAnalytics();
else if (!choice && banner) banner.hidden = false;
banner?.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLElement>('[data-cookie]'); if (!b) return;
  try { localStorage.setItem(CK, b.dataset.cookie!); } catch { /* ignore */ }
  banner.hidden = true; if (b.dataset.cookie === 'yes') enableAnalytics();
});
