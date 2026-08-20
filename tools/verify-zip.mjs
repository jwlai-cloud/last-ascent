/*
 * Runs the submission the way the competition says it will be run.
 *
 * From the official Design Guidance, "Test it the way we will run it":
 *
 *   1. Re-run your build.
 *   2. Unzip your submission into a clean folder.
 *   3. Serve it with a local web server.
 *   4. Open it in a private or incognito window, so nothing is cached.
 *   5. Turn your internet off.
 *   6. Play a full session in portrait.
 *
 * This automates all six. Note step 3 in particular: the guidance explicitly
 * warns against opening index.html by double-clicking, "because that can pass
 * when your build is still pulling files from the internet, and it can also
 * fail on a build that is perfectly fine". An earlier version of this script
 * did exactly that. It is a file:// origin, which is neither how a judge runs
 * it nor a reliable signal in either direction.
 *
 * Step 5 is done by blocking every request that does not go to the local
 * server, which is stronger than unplugging a machine: it is deterministic, it
 * names the offending URL, and it works in CI.
 *
 * Usage: npm run test:zip   (run npm run package first)
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const zip = resolve(root, 'last-ascent.zip');
const PORT = process.env.ZIP_PORT || 4188;

if (!existsSync(zip)) {
  console.error('\n✗ last-ascent.zip is missing. Run `npm run package` first.\n');
  process.exit(1);
}

// 2. Unzip into a clean folder.
const dir = mkdtempSync(join(tmpdir(), 'last-ascent-zip-'));
execFileSync('unzip', ['-q', zip, '-d', dir]);

// 3. Serve it with a local web server.
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
  { cwd: dir, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

const origin = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 100; i++) {
  try { if ((await fetch(`${origin}/index.html`)).ok) break; } catch { /* not up yet */ }
  await new Promise(r => setTimeout(r, 100));
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
// 4. A fresh context is a private window: no storage, no cache, no best score
//    carried in from another run.
const context = await browser.newContext({ viewport: { width: 430, height: 860 }, hasTouch: true });

// 5. "Turn your internet off." Anything not served by the local server is
//    refused, and the URL is recorded.
const offNetwork = [];
await context.route('**/*', route => {
  const url = route.request().url();
  if (url.startsWith(origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
  offNetwork.push(url);
  return route.abort();
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));

await page.goto(`${origin}/index.html`);
await page.waitForFunction(() => window.ascent, null, { timeout: 15000 });
check('the unzipped build boots from a local server with the internet off', true);

// 6. Play a full session in portrait: start, build by real taps, reach the
//    cloud line, flower, and confirm the banked score survives into a new run.
await page.click('#modalButton');
await page.waitForTimeout(1200);
const opening = await page.evaluate(() => window.ascent.getState());
check('a run starts and sugar accrues', opening.running && opening.sugar > 30,
  `${opening.climate} run, ${opening.sugar.toFixed(1)} sugar`);

// Stem before leaf: leaves are one per segment, so at height 1 the LEAF
// button is correctly disabled until there is somewhere to put one.
for (const id of ['#buyRoot', '#buyStem', '#buyLeaf']) await page.click(id);
const tapped = await page.evaluate(() => window.ascent.getState());
check('build buttons respond to real taps',
  tapped.roots === 2 && tapped.height === 2 && tapped.leaves === 2,
  `${tapped.roots} roots, height ${tapped.height}, ${tapped.leaves} leaves`);

const won = await page.evaluate(() => {
  const b = window.ascent;
  b.setSugar(1e6);
  while (b.getState().height < b.getState().goal) b.buy('stem');
  return b.getState();
});
check('the cloud line is reachable and unlocks the flower',
  won.reached && won.running && !won.over, `height ${won.height}`);

await page.click('#flower');
const banked = await page.evaluate(() => window.ascent.getState());
check('flowering banks the run and ends it', banked.over === 'flowered' && banked.banked === won.height,
  `banked ${banked.banked}`);

await page.click('#modalButton');
const again = await page.evaluate(() => window.ascent.getState());
check('a second run starts and remembers the score', again.running && again.height === 1 && again.best === banked.banked,
  `best ${again.best}`);

check('portrait frame never scrolled', await page.evaluate(
  () => document.documentElement.scrollHeight <= window.innerHeight));

// The whole point of steps 3–5.
check('nothing was requested from outside the zip', offNetwork.length === 0, offNetwork.join(', '));
check('no runtime errors', errors.length === 0, errors.join(' | '));

await browser.close();
rmSync(dir, { recursive: true, force: true });

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} zip checks passed`);
process.exit(failed ? 1 : 0);
