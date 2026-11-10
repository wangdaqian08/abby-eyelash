// Runs shell commands side by side and fails if any of them fails. Each output line is prefixed with its command's name.
// CLI: node scripts/parallel.mjs "npm run test:unit" "npm run test:e2e"
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** jobs: [{ name, cmd, env? }] → resolves to the names of the jobs that failed. */
export async function parallel(jobs) {
  const codes = await Promise.all(
    jobs.map(
      ({ name, cmd, env }) =>
        new Promise((done) => {
          const child = spawn(cmd, { shell: true, env: { ...process.env, ...env } });
          for (const stream of [child.stdout, child.stderr]) {
            let rest = '';
            stream.on('data', (d) => {
              const lines = (rest + d).split('\n');
              rest = lines.pop();
              for (const l of lines) console.log(`[${name}] ${l}`);
            });
            stream.on('end', () => rest && console.log(`[${name}] ${rest}`));
          }
          child.on('close', (code) => done(code));
        }),
    ),
  );
  return jobs.filter((_, i) => codes[i] !== 0).map((j) => j.name);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failed = await parallel(process.argv.slice(2).map((cmd) => ({ name: cmd.replace(/^npm run /, ''), cmd })));
  if (failed.length) console.error(`\nFAILED: ${failed.join(', ')}`);
  process.exit(failed.length ? 1 : 0);
}
