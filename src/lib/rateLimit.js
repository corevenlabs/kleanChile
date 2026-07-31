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
 * **The state is per-process.** Behind several instances each keeps its own
 * counters, so the effective limit multiplies by the instance count. That is
 * accepted rather than solved: this deployment is a single container, and the
 * authoritative protection against guessing is the per-account lockout in
 * `infra/auth/session.js`. Move to a shared store if this ever runs wide.
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
