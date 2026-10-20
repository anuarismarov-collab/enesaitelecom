// Builds transparent logo files from the client's logo (a JPEG on white).
//   node scripts/make-brand-assets.mjs "<path to logo.jpg>"
// Output → public/brand/: logo-full.webp (dark), logo-full-white.webp, logo-mark.webp, logo-mark-white.webp, favicon.png, apple-touch-icon.png
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('Usage: node scripts/make-brand-assets.mjs <logo.jpg>'); process.exit(1); }
mkdirSync('public/brand', { recursive: true });
const NAVY = [11, 18, 38];

// 1) white background → transparent. alpha = darkness of each pixel; colour = brand navy (or white).
const { data, info } = await sharp(src).greyscale().raw().toBuffer({ resolveWithObject: true });
const make = (rgb) => {
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i++) {
    const a = Math.max(0, Math.min(255, Math.round(((255 - data[i]) / (255 - 22)) * 255)));
    out[i * 4] = rgb[0]; out[i * 4 + 1] = rgb[1]; out[i * 4 + 2] = rgb[2]; out[i * 4 + 3] = a < 10 ? 0 : a;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
};

// 2) crop: whole lockup, and only the "E" mark (top part)
const dark = await make(NAVY).png().toBuffer();
const white = await make([255, 255, 255]).png().toBuffer();
const trim = async (buf, region) => {
  let s = sharp(buf); if (region) s = s.extract(region);
  return sharp(await s.png().toBuffer()).trim({ threshold: 5 }).png().toBuffer();
};
const markRegion = { left: 0, top: 0, width: info.width, height: Math.round(info.height * 0.52) };   // above the wordmark
for (const [name, buf] of [['', dark], ['-white', white]]) {
  const full = await trim(buf), mark = await trim(buf, markRegion);
  await sharp(full).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 95 }).toFile(`public/brand/logo-full${name}.webp`);
  await sharp(mark).resize({ width: 320, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 95 }).toFile(`public/brand/logo-mark${name}.webp`);
}
// 3) icons: mark on white tile
const mark = await trim(dark, markRegion);
const icon = async (size, file) => sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
  .composite([{ input: await sharp(mark).resize({ width: Math.round(size * 0.62), height: Math.round(size * 0.62), fit: 'inside' }).png().toBuffer(), gravity: 'center' }]).png().toFile(file);
await icon(64, 'public/brand/favicon.png'); await icon(180, 'public/brand/apple-touch-icon.png');
console.log('Brand assets written to public/brand/');
