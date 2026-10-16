import site from '../data/site.json';
import categoriesJson from '../data/categories.json';
import productsJson from '../data/products.json';

export type StockKey = 'in' | 'low' | 'pre' | 'out';
export interface Category { id: string; name: string; blurb: string; art: string; tone: string }
export interface Product {
  id: string; name: string; brand: string; cat: string; price?: number; was?: number;
  stock: StockKey; warranty: string; art: string; tone: string; featured?: boolean;
  badge?: string; desc: string; specs: Record<string, string>;
}

import imagesJson from '../data/images.json';
export interface ProductImage { file: string; own?: boolean; kind?: 'brand' | 'free'; title?: string; author?: string; license?: string; licenseUrl?: string; source?: string }
const images = imagesJson as Record<string, ProductImage>;
/** Photo for a product, if one exists (otherwise the drawing is shown). Client's own photos: add {"file":"/products/<id>.jpg","own":true} to images.json. */
export const imageOf = (id: string): ProductImage | undefined => images[id];
export const credits = Object.entries(images).filter(([, v]) => !v.own).map(([id, v]) => ({ id, ...v }));

export { site };
export const categories = categoriesJson as Category[];
export const products = productsJson as Product[];

export const STOCK: Record<StockKey, [string, string]> = {
  in: ['In stock', 'ok'], low: ['Only a few left', 'low'], pre: ['Pre-order', 'pre'], out: ['Out of stock', 'out'],
};

/* ---- Build-time validation: a typo in the data files fails the build instead of shipping a broken page ---- */
const catIds = new Set(categories.map((c) => c.id));
const seen = new Set<string>();
for (const p of products) {
  const problems: string[] = [];
  if (!/^[a-z0-9-]+$/.test(p.id)) problems.push('id must be lowercase letters, numbers, dashes');
  if (seen.has(p.id)) problems.push('duplicate id');
  if (!catIds.has(p.cat)) problems.push(`unknown category "${p.cat}"`);
  if (!(p.stock in STOCK)) problems.push(`bad stock "${p.stock}"`);
  if (p.price !== undefined && !(Number.isFinite(p.price) && p.price > 0)) problems.push('price must be a positive number');
  if (p.was !== undefined && p.price !== undefined && p.was <= p.price) problems.push('"was" must be higher than price');
  if (problems.length) throw new Error(`products.json → ${p.id || '(no id)'}: ${problems.join('; ')}`);
  seen.add(p.id);
}

export const money = (n: number) => `${site.currency} ${n.toLocaleString('en-US')}`;
export const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const brands = [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));
export const productsOf = (cat: string) => products.filter((p) => p.cat === cat);
export const savePct = (p: Product) => (p.was && p.price ? Math.round((1 - p.price / p.was) * 100) : 0);
export const waLink = (msg: string) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;
