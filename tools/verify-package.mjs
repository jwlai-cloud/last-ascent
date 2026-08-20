/*
 * Runs the full smoke suite against dist/ — the packaged build, not the
 * development tree.
 *
 * This exists because the two are different files. Inlining rewrites index.html,
 * and a smoke test that only ever sees src/ would happily pass while the thing
 * actually submitted was broken. Playability is 25% of the score and the
 * packaged zip is what a judge opens.
 *
 * Usage: npm run test:package
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const PORT = process.env.VERIFY_PORT || 4189;

if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('\n✗ dist/index.html is missing. Run `npm run package` first.\n');
  process.exit(1);
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
  { cwd: dist, stdio: 'ignore' });

const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

// Poll rather than sleep a fixed amount: the server is usually up in well under
// a second, and a fixed wait is either flaky or wasted time.
const url = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 100; i++) {
  try {
    const res = await fetch(url);
    if (res.ok) break;
  } catch { /* not listening yet */ }
  await new Promise(r => setTimeout(r, 100));
}

console.log(`Running the smoke suite against the packaged build on ${url}\n`);
const test = spawnSync('node', [resolve(root, 'tests/smoke.mjs')],
  { cwd: root, stdio: 'inherit', env: { ...process.env, PORT: String(PORT) } });

stop();
process.exit(test.status ?? 1);
