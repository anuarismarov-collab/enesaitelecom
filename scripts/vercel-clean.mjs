// Vercel build step: remove files that only the Cloudflare deploy uses (Vercel would serve them publicly).
import { rmSync } from 'node:fs';
rmSync('dist/_headers', { force: true });
console.log('vercel-clean: removed dist/_headers');
