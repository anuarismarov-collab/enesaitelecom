// Generates the hero background (soft satin-like silver/navy fabric) so no stock photo or licence is needed.
//   node scripts/make-hero-bg.mjs   →  public/brand/hero-bg.webp
import sharp from 'sharp';

const W = 1920, H = 1080;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="silk" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0011 0.0034" numOctaves="3" seed="9" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -.15" result="height"/>
      <feDiffuseLighting in="height" surfaceScale="30" diffuseConstant="1.05" lighting-color="#e8eefb" result="lit">
        <feDistantLight azimuth="215" elevation="48"/>
      </feDiffuseLighting>
    </filter>
    <linearGradient id="tint" x1="0" y1="0" x2="1" y2=".7">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".92"/>
      <stop offset=".34" stop-color="#e6ecf6" stop-opacity=".55"/>
      <stop offset=".7" stop-color="#6f86b4" stop-opacity=".55"/>
      <stop offset="1" stop-color="#0b1226" stop-opacity=".78"/>
    </linearGradient>
    <radialGradient id="shine" cx=".7" cy=".38" r=".34"><stop offset="0" stop-color="#ffffff" stop-opacity=".42"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" filter="url(#silk)"/>
  <rect width="${W}" height="${H}" fill="url(#tint)"/>
  <rect width="${W}" height="${H}" fill="url(#shine)"/>
</svg>`;
await sharp(Buffer.from(svg)).blur(5).webp({ quality: 80 }).toFile('public/brand/hero-bg.webp');
console.log('hero-bg.webp written');
