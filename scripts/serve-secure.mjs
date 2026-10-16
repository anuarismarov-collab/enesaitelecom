// Serves dist/ locally WITH the same security headers the real host will send (read from public/_headers),
// so the browser enforces the Content-Security-Policy while you test.   Usage: npm run preview:secure [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';

const PORT = Number(process.argv[2]) || 8766;
const ROOT = join(process.cwd(), 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };

// Parse the "/*" block of _headers
const globalHeaders = {};
let inGlobal = false;
for (const line of readFileSync(join(ROOT, '_headers'), 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!line.startsWith(' ')) { inGlobal = line.trim() === '/*'; continue; }
  if (inGlobal) { const i = line.indexOf(':'); globalHeaders[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
}

createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(ROOT, p));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end('Forbidden'); return; }   // block path traversal
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  const found = existsSync(file);
  if (!found) file = join(ROOT, '404.html');
  res.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', ...globalHeaders });
  res.end(readFileSync(file));
}).listen(PORT, '127.0.0.1', () => console.log(`Secure preview: http://localhost:${PORT}  (CSP enforced; Ctrl+C to stop)`));
