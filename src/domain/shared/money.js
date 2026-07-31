/**
 * Chilean peso amounts.
 *
 * CLP is a zero-decimal currency — there is no centavo in circulation — so an
 * amount is a whole number of pesos, held as an integer. Never a float: the
 * only reason to reach for one would be a fraction that cannot be paid.
 *
 * These live in `domain/` and touch nothing but their arguments, so a price is
 * formatted and parsed the same way on the server and in an admin form.
 */

/** 12000 → "$12.000". The separator is a period in es-CL, not a comma. */
export function formatClp(pesos) {
  const amount = Number.isFinite(pesos) ? Math.round(pesos) : 0;
  return `$${amount.toLocaleString("es-CL")}`;
}

/**
 * "$2.990", "2.990", " 2990 " → 2990. Anything unparseable → null.
 *
 * Every non-digit is discarded rather than the string being handed to
 * `Number`, because the period in "2.990" is a thousands separator here and
 * `Number("2.990")` would read it as a decimal point and return 2.99 — a
 * three-thousand-peso product silently priced at three pesos.
 */
export function parseClp(input) {
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input) : null;
  }
  if (typeof input !== "string") return null;

  const negative = input.trim().startsWith("-");
  const digits = input.replace(/\D/g, "");
  if (digits === "") return null;

  const value = Number.parseInt(digits, 10);
  return negative ? -value : value;
}
