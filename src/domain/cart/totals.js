import { formatClp } from "../shared/money.js";

/**
 * What a cart adds up to.
 *
 * Pure arithmetic over integer pesos, in one module rather than inline, because
 * the same numbers are computed in three places — the cart page, the WhatsApp
 * message, and the `orders` row that gets persisted. Three independent versions
 * of the same sum eventually disagree, and the one that gets stored is the one
 * the customer did not see.
 */

export const lineTotal = (line) => line.unitPrice * line.quantity;

export const subtotal = (lines) => lines.reduce((total, line) => total + lineTotal(line), 0);

export const itemCount = (lines) => lines.reduce((total, line) => total + line.quantity, 0);

export const isEmpty = (lines) => lines.length === 0;

/** Formatted for display, so no caller reimplements the peso format. */
export const formatLineTotal = (line) => formatClp(lineTotal(line));
