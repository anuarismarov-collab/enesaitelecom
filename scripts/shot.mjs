// Screenshot a page with headless Chrome/Edge:  node scripts/shot.mjs <url> <out.png> [width] [height]
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const [url, out, w = '1440', h = '900'] = process.argv.slice(2);
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const file = resolve(out);                       // absolute Windows path (backslashes)
rmSync(file, { force: true });
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, `--screenshot=${file}`, url], { encoding: 'utf8', timeout: 60000 });
console.log(existsSync(file) ? `saved ${file}` : `failed: ${(r.stderr || '').slice(-300)}`);
