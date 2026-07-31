/**
 * The human-facing order reference.
 *
 * Read aloud over WhatsApp and written on a package, so it is short,
 * unambiguous when spoken, and sequential — "KC-0042" tells whoever is packing
 * it roughly when the order came in, which a UUID never could.
 *
 * Sequential also means guessable, which is exactly why the customer's order
 * page is addressed by a random token and not by this.
 */

const PREFIX = "KC";
const PAD = 4;

export function formatOrderNumber(sequence) {
  return `${PREFIX}-${String(sequence).padStart(PAD, "0")}`;
}

/** Reads the sequence back out, so admin search takes "KC-0042" or "42". */
export function parseOrderNumber(value) {
  const match = new RegExp(`^(?:${PREFIX}-)?(\\d+)$`, "i").exec(String(value).trim());
  if (!match?.[1]) return null;

  const sequence = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : null;
}
