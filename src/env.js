import { z } from "zod";

/**
 * Validated environment configuration.
 *
 * Everything the app needs from the outside world is declared here, so a
 * missing or malformed variable fails with a readable message instead of
 * surfacing as `undefined` three layers deep inside a request.
 *
 * Parsed lazily rather than at module load: this module is reachable from the
 * database client, and a Client Component that transitively imports it must not
 * throw over a secret that legitimately is not present in the browser bundle.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Postgres connection string. */
  DATABASE_URL: z.url(),
});

let cache = null;

export function serverConfig() {
  if (cache) return cache;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment variables:\n${detail}`);
  }

  cache = parsed.data;
  return cache;
}
