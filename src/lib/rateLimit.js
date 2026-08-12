import "server-only";

/**
 * A fixed-window limiter, in memory.
 *
 * It exists for one specific reason: verifying a password costs ~32 MB and a
 * deliberate slice of CPU, and the sign-in form is reachable by anyone. Without
 * a cap, a script can make the server do that work as fast as it can send
 * requests. Account lockout does not help there — it protects the account, not
 * the machine, and it triggers after the expensive part has already run.
 *
 * **The state is per-process, and the target is Vercel** — so in practice this
 * barely limits anything. Each lambda instance keeps its own counters, a burst
 * spreads across instances, and a cold start begins with an empty map. Do not
 * read the numbers below as a cap that holds.
 *
 * What actually protects each account is the per-account lockout in
 * `infra/auth/session.js`: eight failures and the row is locked for fifteen
 * minutes, in Postgres, where every instance sees it.
 *
 * What is left uncovered is the cost of guessing at *unknown* addresses: that
 * path runs scrypt against `DUMMY_HASH` on purpose — so an unknown address does
 * not answer faster than a known one and become an account oracle — and no
 * lockout applies to an account that does not exist. Roughly 32 MB and a slice
 * of CPU per request, billable, with no upper bound but Vercel's own
 * concurrency. Accepted for launch; the fix is a shared counter (Upstash,
 * Vercel KV) keyed by IP, and this module is the only thing that has to change.
 */

const buckets = new Map();

export function checkRateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  bucket.count += 1;

  // Opportunistic sweep, so a long-lived process does not accumulate a bucket
  // per address seen since boot.
  if (buckets.size > 5000) {
    for (const [id, entry] of buckets) {
      if (now >= entry.resetAt) buckets.delete(id);
    }
  }

  if (bucket.count > limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  return { allowed: true, remaining: limit - bucket.count };
}
