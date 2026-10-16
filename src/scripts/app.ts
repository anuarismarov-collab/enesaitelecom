/* Browser logic: enquiry basket, listing filters, WhatsApp forms, mobile menu.
   Security notes: no innerHTML with data, saved basket is re-validated against the known catalog,
   only wa.me links are ever opened, and nothing is sent to any server. */

interface SiteData { name: string; whatsapp: string; currency: string; catalog: Record<string, { name: string; price: number | null }> }
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

const data: SiteData = JSON.parse($('#site-data')!.textContent || '{}');
const money = (n: number) => `${data.currency} ${n.toLocaleString('en-US')}`;
const waLink = (msg: string) => `https://wa.me/${data.whatsapp}?text=${encodeURIComponent(msg)}`;
const clean = (s: string, max: number) => s.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const openWa = (msg: string) => window.open(waLink(msg), '_blank', 'noopener,noreferrer');

/* ---------- Mobile menu ---------- */
const burger = $('#burger'), links = $('#links');
burger?.addEventListener('click', () => {
  const open = links!.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
});

/* ---------- Enquiry basket (stored only in this browser) ---------- */
type Cart = Record<string, number>;
const KEY = 'nx_enq';
const readCart = (): Cart => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const out: Cart = {};
    for (const [id, q] of Object.entries(raw)) {
      const n = Number(q);
      if (Object.hasOwn(data.catalog, id) && Number.isInteger(n) && n > 0 && n < 100) out[id] = n; // drop anything unknown/tampered
    }
    return out;
  } catch { return {}; }
};
const writeCart = (c: Cart) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode */ } render(); };

const drawer = $('#drawer')!, scrim = $('#scrim')!, body = $('#dBody')!, form = $<HTMLFormElement>('#dForm')!;
const setDrawer = (open: boolean) => {
  drawer.classList.toggle('open', open); scrim.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  if (open) $<HTMLButtonElement>('.x', drawer)?.focus();
};

function render() {
  const cart = readCart(), ids = Object.keys(cart);
  $('#cartCount')!.textContent = String(ids.reduce((a, id) => a + cart[id], 0));
  form.hidden = ids.length === 0;
  body.replaceChildren();
  if (!ids.length) {
    const p = document.createElement('p'); p.className = 'empty';
    p.textContent = 'Your list is empty. Tap “Add to enquiry” on any product.'; body.append(p); return;
  }
  for (const id of ids) {
    const item = data.catalog[id];
    const row = document.createElement('div'); row.className = 'd-item';
    const info = document.createElement('div');
    const name = document.createElement('b'); name.textContent = item.name;
    const price = document.createElement('small'); price.textContent = item.price ? money(item.price) : 'Ask for price';
    const qty = document.createElement('div'); qty.className = 'qty';
    const mk = (label: string, d: number, aria: string) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', `${aria} ${item.name}`);
      b.dataset.q = id; b.dataset.d = String(d); return b;
    };
    const n = document.createElement('span'); n.textContent = String(cart[id]);
    qty.append(mk('−', -1, 'Fewer'), n, mk('+', 1, 'More'));
    info.append(name, price, qty); row.append(info); body.append(row);
  }
}

document.addEventListener('click', (e) => {
  const t = (e.target as Element).closest<HTMLElement>('button,[data-open]');
  if (!t) return;
  if (t.hasAttribute('data-open')) { setDrawer(true); return; }
  if (t.hasAttribute('data-close')) { setDrawer(false); return; }
  if (t.dataset.add && Object.hasOwn(data.catalog, t.dataset.add)) {
    const c = readCart(); c[t.dataset.add] = Math.min((c[t.dataset.add] || 0) + 1, 99); writeCart(c); setDrawer(true); return;
  }
  if (t.dataset.q) {
    const c = readCart(), id = t.dataset.q, q = (c[id] || 0) + Number(t.dataset.d);
    if (q <= 0) delete c[id]; else c[id] = Math.min(q, 99);
    writeCart(c);
  }
});
scrim.addEventListener('click', () => setDrawer(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const cart = readCart();
  const lines = Object.keys(cart).map((id) => `• ${cart[id]} × ${data.catalog[id].name}${data.catalog[id].price ? ` (${money(data.catalog[id].price!)})` : ''}`);
  openWa(`Hello ${data.name}, I would like to enquire about:\n${lines.join('\n')}\n\nName: ${clean($<HTMLInputElement>('#dName')!.value, 60)}\nPhone: ${clean($<HTMLInputElement>('#dPhone')!.value, 20)}`);
});
render();

/* ---------- Contact / wholesale forms → WhatsApp message ---------- */
$$<HTMLFormElement>('form[data-wa-form]').forEach((f) => f.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = (n: string) => clean((f.elements.namedItem(n) as HTMLInputElement).value, n === 'msg' ? 600 : 60);
  openWa(`Hello ${data.name}, ${f.dataset.intro || ''}\n\n${v('msg')}\n\nName: ${v('name')}\nPhone: ${v('phone')}`);
}));

/* ---------- Listing: filter + sort (cards are already in the HTML; this only shows/hides/reorders) ---------- */
const listing = $('[data-listing]');
if (listing) {
  const grid = $('[data-grid]', listing)!, cards = $$('.pcard', grid), empty = $('[data-empty]', listing)!;
  const priceEl = $<HTMLInputElement>('#price')!, sortEl = $<HTMLSelectElement>('#sort')!, stockEl = $<HTMLInputElement>('#stockOnly')!;
  const params = new URLSearchParams(location.search);
  const q = clean(params.get('q') || '', 60).toLowerCase();
  const wantBrand = params.get('brand');
  if (wantBrand) $$<HTMLInputElement>('input[name=brand]', listing).forEach((i) => { if (i.value === wantBrand) i.checked = true; });
  if (q) { const h = $('h1'); if (h) h.textContent = `Results for “${q}”`; }

  const apply = () => {
    const brands = $$<HTMLInputElement>('input[name=brand]:checked', listing).map((i) => i.value);
    const max = Number(priceEl.value);
    $('#pMax')!.textContent = money(max);
    const shown = cards.filter((c) => {
      const d = c.dataset;
      const ok = (!brands.length || brands.includes(d.brand!)) && Number(d.price) <= max
        && (!stockEl.checked || d.stock === 'in' || d.stock === 'low') && (!q || d.search!.includes(q));
      c.hidden = !ok; return ok;
    });
    const s = sortEl.value, by = (c: HTMLElement) => c.dataset;
    shown.sort((a, b) => s === 'low' ? Number(by(a).price) - Number(by(b).price)
      : s === 'high' ? Number(by(b).price) - Number(by(a).price)
      : s === 'name' ? by(a).name!.localeCompare(by(b).name!)
      : Number(by(b).feat) - Number(by(a).feat));
    shown.forEach((c) => grid.append(c));
    empty.hidden = shown.length > 0;
    $('#count')!.textContent = `${shown.length} product${shown.length === 1 ? '' : 's'}`;
  };
  listing.addEventListener('input', apply);
  sortEl.addEventListener('change', apply);
  $('#reset')!.addEventListener('click', () => {
    $$<HTMLInputElement>('input[name=brand]', listing).forEach((i) => (i.checked = false));
    priceEl.value = priceEl.dataset.max!; stockEl.checked = false; sortEl.value = 'featured'; apply();
  });
  $('#fToggle')?.addEventListener('click', (ev) => {
    const open = $('#filters')!.classList.toggle('show');
    (ev.currentTarget as HTMLElement).setAttribute('aria-expanded', String(open));
  });
  apply();
}
