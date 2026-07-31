import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverConfig } from "../../env.js";
import * as schema from "./schema/index.js";

/**
 * The database client.
 *
 * The plain `postgres` driver over TCP rather than a provider SDK, which keeps
 * the app portable: a container, a VPS, Neon or Supabase are all just a
 * different DATABASE_URL.
 *
 * Cached on globalThis so Next's dev-mode module reloading does not open a new
 * connection pool on every edit until Postgres refuses connections.
 */

const globalForDb = globalThis;

function createClient() {
  const { DATABASE_URL, NODE_ENV } = serverConfig();

  return postgres(DATABASE_URL, {
    // Serverless instances are short-lived and numerous; a large pool per
    // instance exhausts the server's connection limit rather than helping.
    max: NODE_ENV === "production" ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

const sql = globalForDb.kleanSql ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForDb.kleanSql = sql;
}

/**
 * Query logging is off by default: one page render fires several queries and
 * the output buries real stack traces. Set `DRIZZLE_LOG=1` to see them.
 */
export const db = drizzle(sql, {
  schema,
  logger: process.env.DRIZZLE_LOG === "1",
});

/** The raw driver, for the rare statement Drizzle cannot express. */
export { sql as rawSql };
