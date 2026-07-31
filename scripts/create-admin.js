import { randomBytes } from "node:crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

const { eq } = await import("drizzle-orm");
const { db } = await import("../src/infra/db/client.js");
const { users } = await import("../src/infra/db/schema/index.js");
const { hashPassword } = await import("../src/infra/auth/password.js");

/**
 * Creates an admin account.
 *
 * There is no sign-up route, on purpose: the only people who should be able to
 * mint an account are the ones who already have access to the deployment. This
 * is that door.
 *
 *   npm run admin:create -- --email tu@kleanchile.cl --name "Tu Nombre" --owner
 *
 * A password is generated and printed unless `--password` is given. Generating
 * it is the default because a password typed on the command line ends up in
 * shell history, and one chosen under time pressure tends to be reused.
 */

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim();
const role = process.argv.includes("--owner") ? "owner" : "staff";

if (!email || !name) {
  console.error(
    'Usage: npm run admin:create -- --email you@example.cl --name "Your Name" [--owner] [--password ...]',
  );
  process.exit(1);
}

const supplied = arg("password");
if (supplied && supplied.length < 12) {
  console.error("A supplied password must be at least 12 characters.");
  process.exit(1);
}

const password = supplied ?? randomBytes(12).toString("base64url");
const passwordHash = await hashPassword(password);

const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

if (existing) {
  // Resetting rather than refusing: "I cannot sign in" is the common reason to
  // reach for this script the second time.
  await db
    .update(users)
    .set({ passwordHash, name, role, isActive: true, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, existing.id));
  console.log(`Updated ${email} (${role}) and reset its password.`);
} else {
  await db.insert(users).values({ email, name, role, passwordHash });
  console.log(`Created ${email} (${role}).`);
}

if (!supplied) {
  console.log(`\n  Password: ${password}\n`);
  console.log("Shown once. Store it somewhere safe.");
}

process.exit(0);
