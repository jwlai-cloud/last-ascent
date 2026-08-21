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

// 6. Play a full session in portrait: start, tap a real button, climb to the
//    summit, and confirm the banked score survives into a second run.
await page.click('#modalButton');
await page.waitForTimeout(1200);
const opening = await page.evaluate(() => window.ascent.getState());
/* The climber does not rise on his own any more — that is the whole redesign —
 * so the live check is that the world falls away and a real key press climbs. */
check('the world falls away on its own', opening.running && opening.storm > -5,
  `sight line ${opening.storm.toFixed(2)}, gap ${opening.stormGap.toFixed(1)}`);
{
  // Wait until he is actually standing, or the press lands mid-fall.
  await page.waitForFunction(() => window.ascent.getState().grounded, null, { timeout: 5000 });
  // Clear the level above, so this tests the input rather than the level design.
  await page.evaluate(() => {
    const a = window.ascent, s = a.getState();
    a.setCell(s.lane, Math.floor(s.floor) + 1, null);
  });
  const before = await page.evaluate(() => window.ascent.getState().floor);
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => window.ascent.getState().floor);
  check('a real space press climbs a level', after > before, `floor ${before.toFixed(2)} -> ${after.toFixed(2)}`);
}

/* Pause before tapping: the live loop keeps climbing between the click and the
 * read, and a hazard can consume the shield before it is checked. */
await page.evaluate(() => { window.ascent.mute(true); window.ascent.pause(true); window.ascent.setEnergy(40); });
await page.click('#buyShield');
const tapped = await page.evaluate(() => window.ascent.getState());
check('a spend button responds to a real tap', tapped.shield === true && tapped.spent >= tapped.cost.shield,
  `shield ${tapped.shield}, spent ${tapped.spent}`);

/* The game is hard on purpose — a careful climber summits about three runs in
 * five — so pinning one seed asserts luck. Try a few and require that the
 * summit is reachable at all in the packaged build. */
const won = await page.evaluate(() => {
  const a = window.ascent;
  const play = seed => {
    a.start(seed); a.pause(true); a.mute(true);
    let n = 0;
    while (a.getState().running && a.getState().floorInt < a.getState().summit && n < 40000) {
      const s = a.getState();
      const up = Math.ceil(s.floor + 0.001);
      const safe = [0, 1, 2].filter(l => !['gap', 'hazard'].includes(a.cellAt(l, up)));
      const rich = safe.filter(l => ['energy', 'cache'].includes(a.cellAt(l, up)));
      const want = rich[0] ?? (safe.includes(s.lane) ? s.lane : (safe[0] ?? s.lane));
      if (want !== s.lane) a.moveLane(Math.sign(want - s.lane));
      if (s.grounded) a.jump();
      if (s.health <= 2 && s.energy >= s.cost.shield && !s.shield) a.buy('shield');
      else if (s.stormGap < 1.6 && s.energy >= s.cost.surge) a.buy('surge');
      a.step(0.05); n++;
    }
    return a.getState();
  };
  let best = null;
  for (const seed of [1, 7, 13, 21, 33, 41]) {
    const r = play(seed);
    if (!best || r.floorInt > best.floorInt) best = { ...r, seed };
    if (r.over === 'summit') return { ...r, seed };
  }
  return best;
});
check('the summit is reachable in the packaged build',
  won.over === 'summit' && won.floorInt >= won.summit,
  `best of six seeds: seed ${won.seed} reached ${won.floorInt}/${won.summit}, banked ${won.banked}`);

await page.click('#modalButton');
const again = await page.evaluate(() => window.ascent.getState());
check('a second run starts and remembers the score',
  again.running && again.floorInt === 0 && again.best === won.banked, `best ${again.best}`);

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
