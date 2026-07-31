import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing.
 *
 * scrypt, from Node's standard library. It is memory-hard, which is the
 * property that matters: an attacker holding a stolen hash cannot simply throw
 * GPUs at it the way they can at the SHA family, because each guess costs real
 * RAM as well as cycles.
 *
 * Argon2id would be marginally stronger, but every Node implementation of it is
 * a native module — a compiled binary in the deployment, for a panel with a
 * couple of accounts. scrypt is built in, has no install step, and is not the
 * weak link here.
 *
 * The encoded form carries its own parameters:
 *
 *   scrypt$32768$8$1$<salt-hex>$<hash-hex>
 *
 * so raising the cost later does not invalidate existing hashes — an old hash
 * still verifies with the parameters it was written with.
 */

/** 2^15 with r=8 needs roughly 32 MB per hash: expensive to guess, cheap enough to serve. */
const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

/**
 * scrypt's memory use is roughly `128 * N * r` and Node refuses to allocate
 * past its default ceiling, so the limit is raised to match the parameters
 * above rather than left to chance.
 */
const maxmem = (cost, blockSize) => 256 * cost * blockSize;

function scryptAsync(password, salt, keyLength, options) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH);

  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: maxmem(COST, BLOCK_SIZE),
  });

  return [
    "scrypt",
    String(COST),
    String(BLOCK_SIZE),
    String(PARALLELIZATION),
    salt.toString("hex"),
    derived.toString("hex"),
  ].join("$");
}

/**
 * Verifies a password against an encoded hash.
 *
 * Returns false rather than throwing on a malformed hash: a corrupt row should
 * deny access, not crash the login route and leak a stack trace.
 *
 * The comparison is `timingSafeEqual`, so how long it takes does not vary with
 * how many leading bytes matched. A plain `===` on a hex string leaks exactly
 * that, one byte at a time, to anyone able to measure response times.
 */
export async function verifyPassword(password, encoded) {
  if (!encoded) return false;

  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, costRaw, blockRaw, parallelRaw, saltHex, hashHex] = parts;

  const cost = Number.parseInt(costRaw, 10);
  const blockSize = Number.parseInt(blockRaw, 10);
  const parallelization = Number.parseInt(parallelRaw, 10);
  if (!cost || !blockSize || !parallelization || !saltHex || !hashHex) return false;

  try {
    const expected = Buffer.from(hashHex, "hex");

    const derived = await scryptAsync(
      password.normalize("NFKC"),
      Buffer.from(saltHex, "hex"),
      expected.length,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: maxmem(cost, blockSize),
      },
    );

    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * A syntactically valid hash that no password matches.
 *
 * Exists solely so the unknown-account path can pay the same cost as the known
 * one — see the comment in `session.js`.
 */
export const DUMMY_HASH = `scrypt$${String(COST)}$${String(BLOCK_SIZE)}$${String(
  PARALLELIZATION,
)}$${"00".repeat(SALT_LENGTH)}$${"00".repeat(KEY_LENGTH)}`;
