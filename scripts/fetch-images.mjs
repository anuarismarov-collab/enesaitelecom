// Finds freely-licensed product photos on Wikimedia Commons (CC0 / public domain / CC BY / CC BY-SA),
// downloads them to public/products/ and records the credit in src/data/images.json.
// Products with no match keep their drawing. Re-run any time:  node scripts/fetch-images.mjs
// Real client photos later: put the file in public/products/<id>.jpg and add {"file": "...", "own": true} for that id in images.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const UA = 'EnesaiCatalogDemo/1.0 (demo site build; contact: sales@example.com)';
const API = 'https://commons.wikimedia.org/w/api.php';
const OK_LICENSE = /^(cc0|pd|public domain|cc by(-sa)? \d)/i;

// id: [search text, tokens that MUST appear in the file title, tokens that must NOT]
const Q = {
  'iphone-15-pro': ['iPhone 15 Pro', ['iphone', '15', 'pro'], ['max', 'plus']],
  'iphone-15': ['iPhone 15', ['iphone', '15'], ['pro', 'plus', 'max']],
  'ipad-air-m2': ['iPad Air 2024', ['ipad', 'air'], []],
  'ipad-10': ['iPad 10th generation', ['ipad', '10'], []],
  'galaxy-s24-ultra': ['Samsung Galaxy S24 Ultra', ['s24', 'ultra'], []],
  'galaxy-s24': ['Samsung Galaxy S24', ['s24'], ['ultra', 'plus', '+']],
  'galaxy-tab-s9': ['Samsung Galaxy Tab S9', ['tab', 's9'], []],
  'macbook-air-m3': ['MacBook Air M3', ['macbook', 'air'], []],
  'macbook-pro-14': ['MacBook Pro 14', ['macbook', 'pro'], []],
  'hp-pavilion-15': ['HP Pavilion 15', ['pavilion'], []],
  'lenovo-legion-5': ['Lenovo Legion 5', ['legion'], []],
  'asus-rog-strix-g16': ['ASUS ROG Strix G16', ['rog', 'strix'], []],
  'ps5-slim-disc': ['PlayStation 5 Slim', ['playstation', '5', 'slim'], ['digital']],
  'ps5-slim-digital': ['PlayStation 5 Slim Digital Edition', ['playstation', '5', 'slim'], []],
  'dualsense': ['DualSense controller', ['dualsense'], ['edge']],
  'pulse-elite': ['PlayStation Pulse Elite headset', ['pulse'], []],
  'ps-portal': ['PlayStation Portal', ['portal'], []],
  'dji-mini-4-pro': ['DJI Mini 4 Pro', ['mini', '4'], []],
  'dji-osmo-pocket-3': ['DJI Osmo Pocket 3', ['pocket'], []],
  'dji-osmo-action-4': ['DJI Osmo Action 4', ['action'], []],
  'gopro-hero12': ['GoPro Hero 12 Black', ['gopro', 'hero'], []],
  'insta360-x4': ['Insta360 X4', ['insta360'], []],
  'apple-watch-s9': ['Apple Watch Series 9', ['apple', 'watch'], ['ultra']],
  'apple-watch-ultra-2': ['Apple Watch Ultra 2', ['apple', 'watch', 'ultra'], []],
  'garmin-fenix-7': ['Garmin Fenix 7', ['fenix', '7'], []],
  'garmin-forerunner-265': ['Garmin Forerunner 265', ['forerunner'], []],
  'garmin-venu-3': ['Garmin Venu 3', ['venu'], []],
  'airpods-pro-2': ['AirPods Pro 2', ['airpods', 'pro'], []],
  'dyson-v15': ['Dyson V15 Detect', ['dyson', 'v15'], []],
  'dyson-v12': ['Dyson V12 Detect Slim', ['dyson', 'v12'], []],
  'dyson-airwrap': ['Dyson Airwrap', ['airwrap'], []],
  'dyson-supersonic': ['Dyson Supersonic hair dryer', ['dyson', 'supersonic'], []],
  'dyson-purifier-cool': ['Dyson Purifier Cool', ['dyson', 'purifier'], []],
  'hp-laserjet-m141w': ['HP LaserJet Pro MFP M141', ['laserjet'], []],
  'canon-pixma-g3430': ['Canon PIXMA G3430', ['pixma'], []],
  'epson-ecotank-l3250': ['Epson EcoTank L3250', ['ecotank'], []],
  'hp-color-laserjet-m255': ['HP Color LaserJet Pro M255', ['laserjet', 'm255'], []],
  'mx-master-3s': ['Logitech MX Master 3S', ['mx', 'master'], []],
  'sony-wh-1000xm5': ['Sony WH-1000XM5', ['1000xm5'], []],
  'apple-magsafe-charger': ['MagSafe charger', ['magsafe'], []],
  'samsung-25w-charger': ['Samsung 25W charger', ['samsung', 'charger'], []],
};

const strip = (h = '') => h.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const norm = (s) => s.toLowerCase().replace(/[_\-.]/g, ' ');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync('public/products', { recursive: true });
const out = existsSync('src/data/images.json') ? JSON.parse(readFileSync('src/data/images.json', 'utf8')) : {};
const report = [];

// Reviewed by eye on 2026-10-16: only these auto-matches show the RIGHT product on a clean background.
// The other search results were shop displays, older models or scenes, so they are skipped (those products keep their drawing).
const KEEP = new Set(['iphone-15-pro', 'iphone-15', 'hp-pavilion-15', 'dualsense', 'dji-mini-4-pro', 'garmin-forerunner-265', 'garmin-venu-3', 'airpods-pro-2', 'mx-master-3s', 'apple-magsafe-charger']);
for (const [id, [search, must, avoid]] of Object.entries(Q)) {
  if (!KEEP.has(id) && !out[id]?.own) continue;
  if (out[id]?.own) { report.push(`${id}: client photo kept`); continue; }
  const url = `${API}?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(search + ' filetype:bitmap')}` +
    `&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=900&origin=*`;
  let pages = [];
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    pages = Object.values((await r.json()).query?.pages ?? {}).sort((a, b) => a.index - b.index);
  } catch (e) { report.push(`${id}: search failed (${e.message})`); continue; }

  const pick = pages.find((p) => {
    const ii = p.imageinfo?.[0]; if (!ii) return false;
    const t = norm(p.title);
    const lic = ii.extmetadata?.LicenseShortName?.value || '';
    return /jpe?g|png/.test(ii.mime) && ii.width >= 500 && OK_LICENSE.test(lic)
      && must.every((m) => t.includes(m)) && !avoid.some((a) => t.includes(a));
  });
  if (!pick) { report.push(`${id}: no free photo found — keeps drawing`); delete out[id]; await sleep(400); continue; }

  const ii = pick.imageinfo[0], md = ii.extmetadata, ext = ii.mime === 'image/png' ? 'png' : 'jpg';
  const img = await fetch(ii.thumburl || ii.url, { headers: { 'User-Agent': UA } });
  const buf = Buffer.from(await img.arrayBuffer());
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8, isPng = buf[0] === 0x89 && buf[1] === 0x50;      // verify it really is an image
  if (!img.ok || !(isJpg || isPng) || buf.length > 600_000) { report.push(`${id}: download rejected (${img.status}, ${buf.length} bytes)`); await sleep(400); continue; }
  const file = `/products/${id}.${isPng ? 'png' : 'jpg'}`;
  writeFileSync(`public${file}`, buf);
  out[id] = { file, author: strip(md?.Artist?.value) || 'Unknown', license: md?.LicenseShortName?.value, licenseUrl: md?.LicenseUrl?.value || '', source: ii.descriptionurl, title: pick.title.replace(/^File:/, '') };
  report.push(`${id}: OK  ${out[id].title}  [${out[id].license}]  ${Math.round(buf.length / 1024)} KB`);
  await sleep(400);
}
writeFileSync('src/data/images.json', JSON.stringify(out, null, 2) + '\n');
console.log(report.join('\n'));
console.log(`\n${Object.values(out).length} of ${Object.keys(Q).length} products have a photo.`);
