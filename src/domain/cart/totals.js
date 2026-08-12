import { formatClp } from "../shared/money.js";
import { countLabel, isPriceOnRequest, PRICE_ON_REQUEST_LABEL } from "../shared/pricing.js";

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
export const formatLineTotal = (line) =>
  isPriceOnRequest(line.unitPrice) ? PRICE_ON_REQUEST_LABEL : formatClp(lineTotal(line));

/**
 * El total, que con productos a consultar deja de ser un número.
 *
 * Una línea sin precio suma cero, así que la aritmética sola diría "$12.000"
 * para un carrito de cuatro productos de los cuales dos todavía no tienen
 * precio. Eso no es un redondeo: es un total que el cliente va a leer como lo
 * que va a pagar, y no lo es.
 *
 * Por eso el total es un objeto y no un entero. `amount` sigue siendo la suma
 * —es lo que se guarda en `orders.total_clp`, y es cierto: es lo que está
 * cotizado hasta ahora— pero `label` y `note` son lo que se muestra, y dicen que
 * falta información. Cuando ninguna línea tiene precio no hay monto que mostrar
 * y el total entero es "A consultar".
 */
export function cartTotal(lines) {
  const onRequest = lines.filter((line) => isPriceOnRequest(line.unitPrice));
  const priced = lines.length - onRequest.length;

  return {
    amount: subtotal(lines),
    onRequestCount: onRequest.length,
    label: priced === 0 ? PRICE_ON_REQUEST_LABEL : formatClp(subtotal(lines)),
    /** Solo cuando hay mezcla: con todo a consultar, `label` ya lo dijo. */
    note:
      onRequest.length > 0 && priced > 0
        ? `+ ${countLabel(onRequest.length)} a consultar`
        : null,
  };
}
