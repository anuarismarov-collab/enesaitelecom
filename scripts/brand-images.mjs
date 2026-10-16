// TEMPORARY brand product images, taken from each manufacturer's own official product page (found with Firecrawl).
// These are the brands' marketing images — fine for a demo/placeholder; the company should replace them with its own
// photos or supplier-approved images before launch (see SECURITY.md / KNOWLEDGE.md).
//   node scripts/brand-images.mjs fetch            read og:image of each page, download candidates to .stage/ and write .stage/sheet.html
//   node scripts/brand-images.mjs apply id,id,...  resize chosen candidates (sharp → WebP ≤ 900px) into public/products + record credit
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import sharp from 'sharp';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const STAGE = '.stage';
// id → official page (or a direct official image URL, marked with "img:")
const SRC = {
  'ipad-air-m2': 'img:https://www.apple.com/v/ipad-air/ah/images/overview/contrast/product-tile/ipad_air__bbsxw9xstope_large.png',
  'ipad-10': 'img:https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-model-unselect-gallery-1-202503?wid=1200&hei=1200&fmt=jpeg&qlt=90',
  'macbook-air-m3': 'img:https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/macbook-air-size-unselect-202601-gallery-1?wid=1200&hei=1200&fmt=jpeg&qlt=90',
  'macbook-pro-14': 'img:https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/refurb-mbp14-m3-max-pro-spaceblack-202402?wid=1144&hei=1144&fmt=jpeg&qlt=90',
  'apple-watch-ultra-2': 'img:https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/refurb-49-ultra-black-titanium-ocean-black?wid=1144&hei=1144&fmt=jpeg&qlt=90',
  'apple-watch-s9': 'https://www.apple.com/shop/product/fr9a3lw/a/Refurbished-Apple-Watch-Series-9-GPS-45mm-Midnight-Aluminum-Case-with-M-L-Midnight-Sport-Band',
  'galaxy-s24-ultra': 'img:https://images.samsung.com/is/image/samsung/assets/us/2501/pcd/smartphones/galaxy-s24-ultra/galaxy-S24-ultra-ft02-kv_DT.jpg?$1440_N_JPG$',
  'galaxy-s24': 'https://www.samsung.com/us/smartphones/galaxy-s24/',
  'galaxy-tab-s9': 'https://www.samsung.com/levant/tablets/galaxy-tab-s/galaxy-tab-s9-plus-wi-fi-graphite-256gb-sm-x810nzaamea/',
  'samsung-25w-charger': 'https://www.samsung.com/us/mobile-accessories/25w-pd-power-adapter-with-usb-c-cable-black-sku-ep-t2510xbegus/',
  'ps5-slim-disc': 'https://www.playstation.com/en-us/ps5/',
  'ps5-slim-digital': 'https://www.playstation.com/en-us/ps5/',
  'pulse-elite': 'https://www.playstation.com/en-us/accessories/pulse-elite-wireless-headset/',
  'ps-portal': 'https://www.playstation.com/en-us/accessories/playstation-portal-remote-player/',
  'sony-wh-1000xm5': 'https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b',
  'lenovo-legion-5': 'https://www.lenovo.com/us/en/legion/',
  'asus-rog-strix-g16': 'https://rog.asus.com/laptops/rog-strix/rog-strix-g16-2026/',
  'dji-osmo-pocket-3': 'https://www.dji.com/mobile/osmo-pocket-3',
  'dji-osmo-action-4': 'https://www.dji.com/mobile/osmo-action-4',
  'gopro-hero12': 'https://gopro.com/en/is/shop/cameras/hero12-black/CHDHX-121-master.html',
  'insta360-x4': 'https://www.insta360.com/product/insta360-x4',
  'garmin-fenix-7': 'https://www.garmin.com/en-US/p/735520/',
  'dyson-v15': 'https://www.dyson.com/vacuum-cleaners/cordless/v15',
  'dyson-v12': 'https://www.dyson.com/vacuum-cleaners/cordless/v12/detect-slim-yellow',
  'dyson-airwrap': 'https://www.dyson.com/hair-care/dyson-airwrap-styler-complete',
  'dyson-supersonic': 'https://www.dyson.com/hair-care/hair-dryers/supersonic',
  'dyson-purifier-cool': 'https://www.dyson.com/air-treatment/air-purifiers/purifying-tower-fans',
  'hp-laserjet-m141w': 'https://www.hp.com/hk-en/shop/hp-laserjet-mfp-m141w-printer-7md74a.html',
  'hp-color-laserjet-m255': 'https://www.hp.com/us-en/shop/pdp/hp-color-laserjet-pro-m255dw',
  'canon-pixma-g3430': 'https://www.canon-europe.com/printers/pixma-g3430/',
  ...JSON.parse(existsSync('.stage/extra.json') ? readFileSync('.stage/extra.json', 'utf8') : '{}'),
};
const decode = (s) => s.replace(/&amp;/g, '&');
const isImg = (b) => (b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50) || (b.slice(0, 4).toString() === 'RIFF') || (b.slice(4, 8).toString() === 'ftyp');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const get = (url, ref) => fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,image/avif,image/webp,image/*,*/*', ...(ref ? { Referer: ref } : {}) }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
mkdirSync(STAGE, { recursive: true });
const mode = process.argv[2];

if (mode === 'fetch') {
  const meta = {}; let html = '<!doctype html><meta charset=utf-8><title>brand</title><body><table border=1 cellpadding=3><tr>', n = 0;
  for (const [id, src] of Object.entries(SRC)) {
    let imgUrl = src.startsWith('img:') ? src.slice(4) : null, why = '';
    try {
      if (!imgUrl) {
        const page = await (await get(src)).text();
        const m = page.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i)
          || page.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
        if (m) imgUrl = new URL(decode(m[1]), src).href; else why = 'no og:image';
      }
      if (imgUrl) {
        const r = await get(imgUrl, src.startsWith('img:') ? null : src), buf = Buffer.from(await r.arrayBuffer());
        if (!r.ok || !isImg(buf)) why = `download failed (${r.status})`;
        else { writeFileSync(`${STAGE}/${id}.bin`, buf); meta[id] = { page: src.startsWith('img:') ? null : src, image: imgUrl, bytes: buf.length }; }
      }
    } catch (e) { why = e.message; }
    console.log(`${id}: ${meta[id] ? 'OK ' + Math.round(meta[id].bytes / 1024) + ' KB' : 'MISSING — ' + why}`);
    if (meta[id]) {
      const png = await sharp(`${STAGE}/${id}.bin`).resize({ width: 400 }).jpeg({ quality: 70 }).toBuffer(); writeFileSync(`${STAGE}/${id}.preview.jpg`, png);
      html += `<td valign=top width=210><img src="${id}.preview.jpg" width=200 alt=""><br><small><b>${esc(id)}</b></small></td>`; if (++n % 6 === 0) html += '</tr><tr>';
    }
  }
  writeFileSync(`${STAGE}/meta.json`, JSON.stringify(meta, null, 2)); writeFileSync(`${STAGE}/sheet.html`, html + '</tr></table>');
  console.log(`\n${n} candidates → ${STAGE}/sheet.html`);
}

if (mode === 'apply') {
  const meta = JSON.parse(readFileSync(`${STAGE}/meta.json`, 'utf8'));
  const images = JSON.parse(readFileSync('src/data/images.json', 'utf8'));
  const products = JSON.parse(readFileSync('src/data/products.json', 'utf8'));
  for (const id of process.argv[3].split(',')) {
    const m = meta[id], p = products.find((x) => x.id === id);
    if (!m || !p) { console.log(`${id}: not available`); continue; }
    const out = await sharp(`${STAGE}/${id}.bin`).resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    writeFileSync(`public/products/${id}.webp`, out);
    images[id] = { file: `/products/${id}.webp`, kind: 'brand', author: p.brand, license: 'Official manufacturer image', source: m.page || m.image, title: p.name };
    console.log(`${id}: applied (${Math.round(out.length / 1024)} KB) from ${p.brand}`);
  }
  writeFileSync('src/data/images.json', JSON.stringify(images, null, 2) + '\n');
}
