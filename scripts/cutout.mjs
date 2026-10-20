// Removes a plain white/near-white background from product images (flood-fill from the edges, so white parts INSIDE the product stay).
//   node scripts/cutout.mjs macbook-pro-14 apple-watch-ultra-2     (edits public/products/<id>.webp in place)
import sharp from 'sharp';

const TOL = 244;                       // min(r,g,b) above this counts as background
for (const id of process.argv.slice(2)) {
  const file = `public/products/${id}.webp`;
  const { data, info } = await sharp((await import('node:fs')).readFileSync(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info, px = (x, y) => (y * W + x) * 4;
  const bg = new Uint8Array(W * H), stack = [];
  const isBg = (x, y) => { const i = px(x, y); return data[i + 3] < 8 || Math.min(data[i], data[i + 1], data[i + 2]) >= TOL; };
  const push = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H && !bg[y * W + x] && isBg(x, y)) { bg[y * W + x] = 1; stack.push(x, y); } };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); } for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) { const y = stack.pop(), x = stack.pop(); push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  const out = Buffer.from(data);
  for (let i = 0; i < W * H; i++) if (bg[i]) out[i * 4 + 3] = 0;
  // soften the cut edge by 1px so there is no white halo
  const soft = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const alpha = await sharp(soft).extractChannel(3).blur(0.9).raw().toBuffer();
  for (let i = 0; i < W * H; i++) out[i * 4 + 3] = bg[i] ? Math.min(out[i * 4 + 3], alpha[i]) : Math.max(alpha[i], out[i * 4 + 3]);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 95 }).toFile(file);
  console.log(`${id}: background removed (${W}x${H})`);
}
