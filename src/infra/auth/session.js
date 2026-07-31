import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { err, ok } from "../../domain/shared/result.js";
import { db } from "../db/client.js";
import { sessions, users } from "../db/schema/index.js";
import { DUMMY_HASH, verifyPassword } from "./password.js";

/**
 * Sign-in and session lookup.
 *
 * Sessions are opaque random tokens, not JWTs. A JWT would save a database read
 * per request, at the cost of not being able to revoke one — and "sign that
 * person out now" is something an owner genuinely wants the day a laptop goes
 * missing. One indexed lookup per admin request, for a panel a couple of people
 * use, is not worth optimising against that.
 *
 * The token is stored hashed, so a leaked database backup contains no usable
 * sessions, only their fingerprints. SHA-256 is right here where it would be
 * wrong for a password: the input is 32 bytes of entropy, so there is nothing
 * to brute-force and no reason to pay for a slow hash on every request.
 */

const SESSION_DAYS = 14;
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MINUTES = 15;

const fingerprint = (token) => createHash("sha256").update(token).digest("hex");

export async function signIn({ email, password, ipAddress = null, userAgent = null }) {
  const normalized = email.trim().toLowerCase();

  const user = await db.query.users.findFirst({ where: eq(users.email, normalized) });

  /*
   * The password is verified even when no such user exists, against a throwaway
   * hash. Returning early would make a request for an unknown address
   * measurably faster than one for a known address, turning this endpoint into
   * a way to enumerate who has an account.
   */
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return err({ kind: "invalid_credentials" });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return err({ kind: "locked", until: user.lockedUntil });
  }

  if (!user.isActive) return err({ kind: "account_disabled" });

  if (!(await verifyPassword(password, user.passwordHash))) {
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;

    await db
      .update(users)
      .set({
        failedLoginAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
      })
      .where(eq(users.id, user.id));

    return err({ kind: "invalid_credentials" });
  }

  // A fresh token per sign-in. Sessions on other devices survive — signing in
  // on a phone should not sign you out of the office laptop.
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId: user.id,
    tokenHash: fingerprint(token),
    ipAddress,
    userAgent,
    expiresAt,
  });

  await db
    .update(users)
    .set({ lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, user.id));

  // Opportunistic cleanup, so expired rows do not accumulate forever without a
  // dedicated job. Cheap: the expiry column is indexed.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  return ok({
    token,
    expiresAt,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

/**
 * The user behind a session token, or null.
 *
 * Expiry is checked in the query rather than after it, so an expired session
 * cannot be treated as valid by a caller that forgets to compare dates.
 * `isActive` is re-read too: disabling an account must take effect at once, not
 * whenever that person's session happens to lapse.
 */
export async function findSessionUser(token) {
  if (!token) return null;

  const row = await db.query.sessions.findFirst({
    where: and(eq(sessions.tokenHash, fingerprint(token)), gt(sessions.expiresAt, new Date())),
    with: { user: true },
  });

  if (!row?.user.isActive) return null;

  return { id: row.user.id, email: row.user.email, name: row.user.name, role: row.user.role };
}

export async function signOut(token) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, fingerprint(token)));
}

/** Whether any account exists yet, so setup can be pointed at. */
export async function hasAnyUser() {
  const [row] = await db.select({ count: sql`count(*)::int` }).from(users);
  return (row?.count ?? 0) > 0;
}
