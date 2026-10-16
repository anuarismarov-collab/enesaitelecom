// Spreadsheet → website.
//   1. node scripts/import-products.mjs --template        writes data/products.template.csv (current products, open in Excel)
//   2. Edit in Excel, then File → Save As → "CSV UTF-8"
//   3. node scripts/import-products.mjs data/products.csv  validates and rewrites src/data/products.json
// Columns: id,name,brand,category,price,was,stock,warranty,art,tone,featured,badge,description,specs
// specs format:  Key: value | Key: value        stock: in | low | pre | out        featured: yes/no
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const JSON_PATH = 'src/data/products.json';
const cats = JSON.parse(readFileSync('src/data/categories.json', 'utf8')).map((c) => c.id);
const COLS = ['id', 'name', 'brand', 'category', 'price', 'was', 'stock', 'warranty', 'art', 'tone', 'featured', 'badge', 'description', 'specs'];
const ARTS = ['console', 'controller', 'laptop', 'phone', 'tablet', 'vacuum', 'dryer', 'headset', 'earbuds', 'watch', 'camera', 'drone', 'printer', 'mouse', 'plug'];
const TONES = ['peach', 'lime', 'blue', 'sand', 'lilac'];

const esc = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const arg = process.argv[2];
if (!arg) { console.log('Usage:\n  node scripts/import-products.mjs --template\n  node scripts/import-products.mjs data/products.csv'); process.exit(0); }

if (arg === '--template') {
  const list = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const lines = [COLS.join(',')].concat(list.map((p) => [p.id, p.name, p.brand, p.cat, p.price, p.was, p.stock, p.warranty, p.art, p.tone, p.featured ? 'yes' : 'no', p.badge, p.desc,
    Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join(' | ')].map(esc).join(',')));
  mkdirSync('data', { recursive: true });
  writeFileSync('data/products.template.csv', '﻿' + lines.join('\r\n') + '\r\n', 'utf8');
  console.log(`Wrote data/products.template.csv (${list.length} products). Open it in Excel.`); process.exit(0);
}

const [head, ...rows] = parseCsv(readFileSync(arg, 'utf8'));
const idx = Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), i]));
const missing = COLS.filter((c) => !(c in idx));
if (missing.length) { console.error(`Missing columns: ${missing.join(', ')}`); process.exit(1); }

const errors = [], out = [], seen = new Set();
rows.forEach((r, n) => {
  const g = (c) => (r[idx[c]] ?? '').trim(), line = n + 2, bad = (m) => errors.push(`Row ${line} (${g('id') || 'no id'}): ${m}`);
  const price = g('price') ? Number(g('price')) : undefined, was = g('was') ? Number(g('was')) : undefined;
  if (!/^[a-z0-9-]+$/.test(g('id'))) bad('id must be lowercase letters, numbers and dashes');
  if (seen.has(g('id'))) bad('duplicate id'); seen.add(g('id'));
  if (!g('name')) bad('name is empty'); if (!g('brand')) bad('brand is empty');
  if (!cats.includes(g('category'))) bad(`category must be one of: ${cats.join(', ')}`);
  if (price !== undefined && !(price > 0)) bad('price must be a positive number (or empty = "ask for price")');
  if (was !== undefined && (!(was > 0) || (price !== undefined && was <= price))) bad('"was" must be higher than price');
  if (!['in', 'low', 'pre', 'out'].includes(g('stock'))) bad('stock must be in, low, pre or out');
  if (!ARTS.includes(g('art'))) bad(`art must be one of: ${ARTS.join(', ')}`);
  if (!TONES.includes(g('tone'))) bad(`tone must be one of: ${TONES.join(', ')}`);
  const specs = {};
  for (const part of g('specs').split('|').map((s) => s.trim()).filter(Boolean)) { const i = part.indexOf(':'); if (i < 1) bad(`spec "${part}" needs "Key: value"`); else specs[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  const p = { id: g('id'), name: g('name'), brand: g('brand'), cat: g('category'), ...(price ? { price } : {}), ...(was ? { was } : {}), stock: g('stock'), warranty: g('warranty') || '1 year', art: g('art'), tone: g('tone') };
  if (/^(yes|true|1)$/i.test(g('featured'))) p.featured = true;
  if (g('badge')) p.badge = g('badge');
  out.push({ ...p, desc: g('description'), specs });
});
if (errors.length) { console.error(`\n${errors.length} problem(s) — nothing was changed:\n  ` + errors.join('\n  ')); process.exit(1); }
writeFileSync(JSON_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`OK — ${out.length} products written to ${JSON_PATH}. Now run: npm run build`);
