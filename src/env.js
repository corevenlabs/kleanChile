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

  /*
   * Object storage, optional **as a group**.
   *
   * Optional because `npm run dev` has to work with nothing but a database, and
   * because a VPS with a volume is a legitimate way to run this — see
   * `docs/DEPLOY.md`. Validated as a group by `storageConfig()` below, so the
   * failure mode is "R2 is half-configured", named, rather than a signature
   * error from inside the AWS SDK.
   */
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  NEXT_PUBLIC_CDN_URL: z.url().optional(),
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

const R2_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "NEXT_PUBLIC_CDN_URL",
];

/**
 * The object-storage settings, or `null` when storage is not configured.
 *
 * All five or none. Half-configured storage is the dangerous state: uploads
 * would appear to work and then fail on the first presign, or worse, succeed
 * into a bucket whose public URL nobody set — so the images would be stored and
 * unreachable. Naming the missing keys turns that into a message.
 */
export function storageConfig() {
  const cfg = serverConfig();
  const missing = R2_KEYS.filter((key) => !cfg[key]);

  if (missing.length === R2_KEYS.length) return null;
  if (missing.length > 0) {
    throw new Error(
      `El almacenamiento de objetos está a medio configurar. Falta: ${missing.join(", ")}. ` +
        "Define las cinco variables o ninguna.",
    );
  }

  return {
    accountId: cfg.R2_ACCOUNT_ID,
    accessKeyId: cfg.R2_ACCESS_KEY_ID,
    secretAccessKey: cfg.R2_SECRET_ACCESS_KEY,
    bucket: cfg.R2_BUCKET,
    cdnUrl: cfg.NEXT_PUBLIC_CDN_URL,
  };
}

/** Whether uploads go to R2 (true) or to the local disk (false). */
export function storageConfigured() {
  return storageConfig() !== null;
}
