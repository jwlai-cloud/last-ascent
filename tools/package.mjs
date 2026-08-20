/*
 * Packaging step. Produces the file that is actually submitted.
 *
 * The competition binds the *submitted* index.html, not the development tree:
 *
 *   "Your submitted index.html must contain all of your own game code, in
 *    readable, unminified form"
 *   "Libraries such as Three.js must be included in the .zip inside a folder
 *    named vendor, and referenced with relative paths"
 *
 * So this inlines our own CSS and JS and leaves vendor/ alone. It deliberately
 * does not minify, reformat or strip comments from our code — readable is a
 * requirement, and the comments are where the tuned constants explain
 * themselves.
 *
 * Usage: npm run package
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const zip = resolve(root, 'last-ascent.zip');
const MAX_ZIP_BYTES = 35 * 1024 * 1024;

const read = p => readFileSync(resolve(root, p), 'utf8');
const fail = msg => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

// ── inline our own code, and only our own ────────────────────────────────────
let html = read('index.html');
const css = read('src/ascent.css');
const js = read('src/ascent.js');

const linkTag = '<link rel="stylesheet" href="./src/ascent.css">';
const scriptTag = '<script src="./src/ascent.js"></script>';
if (!html.includes(linkTag)) fail(`index.html no longer contains ${linkTag} — packaging cannot find the stylesheet to inline.`);
if (!html.includes(scriptTag)) fail(`index.html no longer contains ${scriptTag} — packaging cannot find the game to inline.`);

html = html
  .replace(linkTag, `<style>\n${css}\n    </style>`)
  .replace(scriptTag, `<script>\n${js}\n    </script>`);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'index.html'), html);
cpSync(resolve(root, 'vendor'), resolve(dist, 'vendor'), { recursive: true });

// ── validate against the rules before anything is zipped ─────────────────────
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/* One external request fails the whole submission, so this looks for absolute
 * URLs in the markup rather than trusting that nobody added one. The vendored
 * Three.js is exempt: its licence header and deprecation notice carry URLs in
 * comments, which are never fetched. */
const urls = [...html.matchAll(/(?:src|href)\s*=\s*["'](https?:)?\/\/[^"']+/gi)].map(m => m[0]);
check('index.html makes no external request', urls.length === 0, urls.join(', '));
check('our own code is inlined', html.includes('const config = {') && html.includes('.game-shell{'));
check('our own code is not minified', html.split('\n').length > 800, `${html.split('\n').length} lines`);
check('three.js stays external and relative', html.includes('src="./vendor/three.min.js"'));
check('src/ is not referenced from the packaged file', !html.includes('./src/'));

if (checks.some(c => !c.ok)) fail('packaging produced a build that would fail validation');

// ── zip, with index.html at the top level ────────────────────────────────────
rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-q', zip, 'index.html', 'vendor'], { cwd: dist });

const listed = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n');
const bytes = statSync(zip).size;
check('index.html is at the top level of the zip', listed.includes('index.html'), listed.join(' '));
check(`zip is within the 35MB cap`, bytes <= MAX_ZIP_BYTES, `${(bytes / 1024 / 1024).toFixed(2)}MB`);

if (checks.some(c => !c.ok)) fail('the zip would fail validation');

console.log(`\n${checks.length}/${checks.length} packaging checks passed`);
console.log(`dist/  ${(statSync(resolve(dist, 'index.html')).size / 1024).toFixed(1)}KB index.html`);
console.log(`zip    ${(bytes / 1024).toFixed(1)}KB  →  ${zip}`);
console.log(`\nNow run the smoke test against the packaged build:  npm run test:package`);
