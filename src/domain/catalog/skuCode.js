/**
 * SKU codes.
 *
 * The code is what a customer quotes over WhatsApp and what whoever picks the
 * order reads off a shelf, so it has to survive being typed by hand.
 *
 *   KC0000427
 *   ││└──┬──┘│
 *   ││   │   └─ check digit
 *   ││   └───── sequence, allocated by Postgres
 *   └┴───────── KleanChile
 *
 * Deliberately opaque. A descriptive code — `LIM-DET-IND` — reads beautifully
 * until a product is renamed or moves category, at which point it is either a
 * lie or has to be rewritten, and rewriting it breaks every past order that
 * quoted it. A code identifies a thing; the columns describe it.
 */

const PREFIX = "KC";
const PAD = 6;

/**
 * Damm's quasigroup — the operation table behind the check digit.
 *
 * A check digit earns its place here precisely because the code is opaque. A
 * mistyped descriptive code is usually nonsense that fails loudly; a mistyped
 * `KC0000427` is a perfectly valid code for a different product, and the wrong
 * item gets picked. Damm catches every single-digit error and every
 * transposition of adjacent digits, which covers essentially every mistake a
 * human makes copying one of these into a message.
 *
 * Chosen over Luhn, which misses the 09 ↔ 90 transposition, and over Verhoeff,
 * which needs three tables for the same strength.
 */
const DAMM = [
  [0, 3, 1, 7, 5, 9, 8, 6, 4, 2],
  [7, 0, 9, 2, 1, 5, 4, 8, 6, 3],
  [4, 2, 0, 6, 8, 7, 1, 3, 5, 9],
  [1, 7, 5, 0, 9, 8, 3, 4, 2, 6],
  [6, 1, 2, 3, 0, 4, 5, 9, 7, 8],
  [3, 6, 7, 4, 2, 0, 9, 5, 8, 1],
  [5, 8, 6, 9, 7, 2, 0, 1, 3, 4],
  [8, 9, 4, 5, 3, 6, 2, 0, 1, 7],
  [9, 4, 3, 8, 6, 1, 7, 2, 0, 5],
  [2, 5, 8, 1, 4, 3, 6, 7, 9, 0],
];

/**
 * Folds a digit string through the table.
 *
 * Returns the check digit for a bare payload, and 0 for a payload that already
 * carries a correct one — which is what makes validating the same operation as
 * generating. Returns -1 for anything non-numeric.
 */
function damm(digits) {
  let interim = 0;

  for (const character of digits) {
    // An out-of-range index lands on `undefined` rather than a digit, so a
    // non-numeric character falls out here without a separate check.
    const next = DAMM[interim]?.[character.codePointAt(0) - 48];
    if (next === undefined) return -1;
    interim = next;
  }

  return interim;
}

/**
 * Builds the code for a sequence value.
 *
 * The sequence comes from Postgres. Nothing in the application may invent one:
 * two products created in the same instant would otherwise read the same
 * "next" number and collide on the unique index.
 *
 * Six digits is a million products. Should that run out the code simply grows a
 * digit rather than throwing — an untidy code beats a failure at product
 * creation.
 */
export function formatSkuCode(sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error(`SKU sequence must be a positive integer, got ${String(sequence)}`);
  }

  const body = String(sequence).padStart(PAD, "0");
  return `${PREFIX}${body}${String(damm(body))}`;
}

const SHAPE = new RegExp(`^${PREFIX}(\\d{${String(PAD + 1)},})$`, "i");

/** Whether a string is a well-formed code of ours, check digit included. */
export function isValidSkuCode(value) {
  const match = SHAPE.exec(String(value).trim());
  return match?.[1] !== undefined && damm(match[1]) === 0;
}

/**
 * Reads the sequence back out of a code, or null if it is not one of ours.
 *
 * Rejects codes whose check digit disagrees, so admin search returns nothing
 * for a typo rather than the wrong product.
 */
export function parseSkuCode(value) {
  const match = SHAPE.exec(String(value).trim());
  const body = match?.[1];
  if (body === undefined || damm(body) !== 0) return null;

  const sequence = Number.parseInt(body.slice(0, -1), 10);
  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : null;
}
