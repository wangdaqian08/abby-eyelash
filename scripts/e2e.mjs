// All browser (E2E) tests at once: the booking flow (e2e-booking.mjs) and the layout check (check-layout.mjs), each split
// into shards that run side by side, and the photo admin (e2e-admin.mjs), once. Uses the site already served at BASE (http://localhost:8788) if there is one;
// otherwise builds it, serves it in booking demo mode (`npm run serve`) and stops it afterwards. Exit code 1 if any shard fails.
// SHARDS=n sets the number of shards per test (default: half the CPU cores, at least 2). E2E_PART=p/m runs part p of m,
// so m machines can share the shards (CI does this).
import { spawn, execSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { parallel } from './parallel.mjs';

const BASE = process.env.BASE ?? 'http://localhost:8788';
const SHARDS = Number(process.env.SHARDS) || Math.max(2, Math.floor(availableParallelism() / 2));
const [P, M] = (process.env.E2E_PART ?? '1/1').split('/').map(Number);
const up = () => fetch(BASE).then((r) => r.ok, () => false);

let server;
if (!(await up())) {
  execSync('npm run build', { stdio: 'inherit' });
  server = spawn('npm', ['run', 'serve'], { stdio: 'ignore', detached: true }); // own process group, so wrangler stops with it
  const until = Date.now() + 90_000;
  while (!(await up())) {
    if (Date.now() > until) throw new Error(`site did not answer at ${BASE} within 90 s`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

const shards = (name, script) =>
  Array.from({ length: SHARDS }, (_, i) => {
    const shard = `${(P - 1) * SHARDS + i + 1}/${M * SHARDS}`; // this part's slice of all M × SHARDS shards
    return { name: `${name} ${shard}`, cmd: `node ${script}`, env: { BASE, SHARD: shard } };
  });
const started = Date.now();
const admin = P === 1 ? [{ name: 'admin', cmd: 'node scripts/e2e-admin.mjs', env: { BASE } }] : []; // the photo admin: one run, on the first machine
const failed = await parallel([...shards('booking', 'scripts/e2e-booking.mjs'), ...shards('layout', 'scripts/check-layout.mjs'), ...admin]);
if (server) process.kill(-server.pid);
console.log(`\nE2E: ${SHARDS * 2 + admin.length} runs in ${Math.round((Date.now() - started) / 1000)} s, ${failed.length ? `FAILED: ${failed.join(', ')}` : 'all passed'}`);
process.exit(failed.length ? 1 : 0);
