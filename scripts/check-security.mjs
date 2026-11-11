// Run after `npm run build`:  npm run check:security
// Scans the built site (dist/) for the mistakes that most often weaken a static site's security.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
if (!existsSync(DIST)) { console.error('No dist/ folder. Run `npm run build` first.'); process.exit(2); }

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(DIST);
const html = files.filter((f) => extname(f) === '.html');
const fails = [], passes = [], warns = [];
const check = (name, bad) => (bad.length ? fails.push(`${name}\n     ${bad.slice(0, 5).join('\n     ')}${bad.length > 5 ? `\n     …and ${bad.length - 5} more` : ''}`) : passes.push(name));

const inlineScripts = [], inlineStyles = [], styleAttrs = [], handlers = [], external = [], blank = [], forms = [];
for (const f of html) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    if (/type=["']application\/(ld\+)?json["']/i.test(attrs)) continue;   // data blocks are fine
    if (!/\bsrc=/.test(attrs) || m[2].trim()) inlineScripts.push(f);
  }
  if (/<style\b/i.test(s)) inlineStyles.push(f);
  if (/\sstyle=["']/i.test(s)) styleAttrs.push(f);
  if (/\son[a-z]+=["']/i.test(s)) handlers.push(f);
  for (const m of s.matchAll(/<(script|link|img|iframe|source)\b([^>]*)>/gi)) {
    if (m[1].toLowerCase() === 'link' && /rel=["'](canonical|alternate)["']/i.test(m[2])) continue; // metadata, not a loaded resource
    const u = m[2].match(/\b(?:src|href)=["'](?:https?:)?\/\/([^"'/]+)/i);
    if (u) external.push(`${f} → ${u[1]}`);
  }
  for (const m of s.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) if (!/rel=["'][^"']*noopener/.test(m[0])) blank.push(f);
  for (const m of s.matchAll(/<form\b[^>]*>/gi)) if (/action=["']https?:/.test(m[0])) forms.push(`${f}: ${m[0].slice(0, 80)}`);
}
check('No inline <script> (CSP script-src stays \'self\')', inlineScripts);
check('No <style> blocks (CSP style-src stays \'self\')', inlineStyles);
check('No style="" attributes', styleAttrs);
check('No inline event handlers (onclick=…)', handlers);
check('No third-party scripts/styles/images/frames (only wa.me links allowed)', external);
check('Every target="_blank" link has rel="noopener"', blank);
check('No form posts to an external URL', forms);

// Cloudflare reads dist/_headers; Vercel reads vercel.json (its build removes dist/_headers). Accept either.
const hdr = existsSync(join(DIST, '_headers')) ? readFileSync(join(DIST, '_headers'), 'utf8') : existsSync('vercel.json') ? readFileSync('vercel.json', 'utf8') : '';
const need = ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'frame-ancestors'];
check('Security headers file present with all required headers', need.filter((h) => !hdr.includes(h)).map((h) => `missing ${h}`));
check('CSP has no unsafe-inline / unsafe-eval', /unsafe-(inline|eval)/.test(hdr) ? ['CSP allows unsafe-*'] : []);

const secrets = [];
for (const f of files.filter((x) => /\.(html|js|css|json|txt|xml)$/.test(x))) {
  const s = readFileSync(f, 'utf8');
  if (/(sk_live_|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|api[_-]?key["']?\s*[:=]\s*["'][A-Za-z0-9_\-]{16,})/i.test(s)) secrets.push(f);
}
check('No secrets/keys in the built files', secrets);
check('sitemap + robots.txt exist', ['sitemap-index.xml', 'robots.txt'].filter((x) => !existsSync(join(DIST, x))).map((x) => `missing ${x}`));
if (html.some((f) => /rel="canonical" href="https:\/\/www\.example\.com/.test(readFileSync(f, 'utf8')))) warns.push('Placeholder domain www.example.com still in canonical URLs/sitemap/robots — set "site" in astro.config.mjs and public/robots.txt before launch');

console.log(`\nSecurity check on ${html.length} pages\n`);
passes.forEach((p) => console.log('  PASS  ' + p));
fails.forEach((p) => console.log('  FAIL  ' + p));
warns.forEach((p) => console.log('  WARN  ' + p));
console.log(`\n${fails.length ? `${fails.length} issue(s)` : 'All checks passed'}.`);
process.exit(fails.length ? 1 : 0);
