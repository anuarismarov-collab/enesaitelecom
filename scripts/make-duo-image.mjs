// Enhances the client's iPhone Duo photo (823 px, white background) for the website banner.
//   node scripts/make-duo-image.mjs "<path to image>" [out-name]   →  public/brand/<out-name>.webp  (default iphone-duo-hero)
// Steps: trim the white margins; small photos (<1400 px) are upscaled 2.2x + sharpened, already-upscaled ones are only resized to 1500 px; save as WebP.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('Usage: node scripts/make-duo-image.mjs <image>'); process.exit(1); }
const name = process.argv[3] || 'iphone-duo-hero';
const input = readFileSync(src);                      // read into memory first (Windows file locks)
const trimmed = await sharp(input).trim({ threshold: 14, background: '#ffffff' }).toBuffer();
const m = await sharp(trimmed).metadata();
const pad = Math.round(Math.max(m.width, m.height) * 0.04);
const big = (await sharp(input).metadata()).width >= 1400;   // already upscaled by an AI upscaler → do not process twice
let p = sharp(trimmed).extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' });
p = big ? p.resize({ width: 1500, withoutEnlargement: true, kernel: 'lanczos3' })
  : p.resize({ width: Math.round((m.width + pad * 2) * 2.2), kernel: 'lanczos3' }).modulate({ saturation: 1.06 }).linear(1.04, -4).sharpen({ sigma: 1.1, m1: 0.8, m2: 2.2 });
const out = await p.webp({ quality: 92, effort: 5 }).toFile(`public/brand/${name}.webp`);
console.log(`trimmed ${m.width}x${m.height} → ${out.width}x${out.height}, ${Math.round(out.size / 1024)} KB`);
