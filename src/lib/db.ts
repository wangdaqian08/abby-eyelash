// PostgreSQL for the short calendar links (schema `abby`). Production: Cloudflare Hyperdrive binding `HYPERDRIVE`
// (phase 2, to the Sydney VPS). Local: DATABASE_URL to the Docker database (package.json). Neither set → no links.
// The `postgres` driver needs Node APIs: compatibility date 2026-08-04 or later, or the `nodejs_compat` flag. Without them the
// whole Functions bundle fails to start (every page), so a lazy import does not help (tested 2026-11-09).
import postgres from 'postgres';
import { newCode, type CalendarRequest } from './booking-message.ts';

export interface DbEnv {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
}

export const KEEP_HOURS = 24;
export const dbUrl = (env: DbEnv) => env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';

async function withSql<T>(env: DbEnv, fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  // One short-lived connection per request (Workers can't share sockets between requests). Fail fast so the
  // customer's message still goes out, without the link.
  const sql = postgres(dbUrl(env), { max: 1, fetch_types: false, connect_timeout: 3, idle_timeout: 1 });
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

/** Stores a request, returns its new code. Also deletes requests older than KEEP_HOURS (no cron needed). */
export const saveRequest = (env: DbEnv, r: CalendarRequest) =>
  withSql(env, async (sql) => {
    await sql`DELETE FROM abby.booking_request WHERE created_at < now() - make_interval(hours => ${KEEP_HOURS})`;
    for (let i = 0; i < 3; i++) {
      const code = newCode();
      const rows = await sql`
        INSERT INTO abby.booking_request (code, items, date, time, name, phone, photos)
        VALUES (${code}, ${r.items}, ${r.date}, ${r.time}, ${r.name}, ${r.phone}, ${r.photos})
        ON CONFLICT (code) DO NOTHING RETURNING code`;
      if (rows.length) return code;
    }
    throw new Error('booking_request: no free code after 3 tries');
  });

/** The request behind a code, or null when unknown or older than KEEP_HOURS. */
export const findRequest = (env: DbEnv, code: string) =>
  withSql(env, async (sql) => {
    const [row] = await sql<{ items: string; date: string; time: string; name: string; phone: string; photos: boolean }[]>`
      SELECT items, to_char(date, 'YYYY-MM-DD') AS date, time, name, phone, photos FROM abby.booking_request
      WHERE code = ${code} AND created_at >= now() - make_interval(hours => ${KEEP_HOURS})`;
    return (row ?? null) as CalendarRequest | null;
  });
