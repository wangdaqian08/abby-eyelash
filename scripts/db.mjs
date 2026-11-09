// node scripts/db.mjs up       → start the local PostgreSQL (Docker) and apply migrations. Never fails the site start:
//                                 without Docker the site still runs, and booking messages go out without the calendar link.
// node scripts/db.mjs migrate  → apply db/migrations/*.sql to DATABASE_URL (default: the local database). Fails loudly.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import postgres from 'postgres';

export const LOCAL_URL = 'postgres://abby_app:abby_dev@127.0.0.1:5434/postgres';
const dir = new URL('../db/migrations/', import.meta.url);

async function migrate(url = process.env.DATABASE_URL || LOCAL_URL) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`CREATE TABLE IF NOT EXISTS abby.schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const done = new Set((await sql`SELECT version FROM abby.schema_migrations`).map((r) => r.version));
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(file)) continue;
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(new URL(file, dir), 'utf8'));
        await tx`INSERT INTO abby.schema_migrations (version) VALUES (${file})`;
      });
      console.log(`db: applied ${file}`);
    }
  } finally {
    await sql.end();
  }
}

const cmd = process.argv[2];
if (cmd === 'migrate') await migrate();
else if (cmd === 'up') {
  try {
    execSync('docker compose up -d --wait postgres', { stdio: 'inherit' });
    await migrate(LOCAL_URL);
  } catch (err) {
    console.warn(`\n⚠ db: local PostgreSQL is not available (${err.message.split('\n')[0]}).`);
    console.warn('  The site still starts. Booking messages go out without the 📅 calendar link. Start Docker Desktop to get it.\n');
  }
} else {
  console.error('usage: node scripts/db.mjs up|migrate');
  process.exit(1);
}
