import { formatClp } from "./money.js";

/**
 * Productos sin precio publicado.
 *
 * Parte del catálogo se vende cotizando: el precio depende del volumen, del
 * despacho o de un convenio, y la tienda prefiere que el cliente escriba antes
 * de que se comprometa un número. Eso se dice con **precio cero**, y no con una
 * columna nueva, por una razón concreta: el precio ya viaja por el importador,
 * por la semilla, por el editor y por `order_items`, y agregar un booleano
 * significaría sostener dos campos que pueden contradecirse — una fila con
 * `price = 12000` y `on_request = true` no tiene respuesta correcta.
 *
 * Cero no es un precio que esta tienda pueda cobrar. No hay producto gratis en
 * un catálogo institucional, así que el valor está libre para significar algo, y
 * significa "pregúntanos".
 *
 * El módulo es puro y vive en `domain/` porque la misma regla la aplican la
 * vitrina, el carrito, el mensaje de WhatsApp, el panel y los datos
 * estructurados. Una segunda definición de "esto no tiene precio" es una que
 * tarde o temprano discrepa.
 */

/** Lo que se muestra donde iría el monto. */
export const PRICE_ON_REQUEST_LABEL = "A consultar";

/**
 * Cero, negativo o basura → sin precio publicado.
 *
 * El negativo no debería existir (hay un `check` en la tabla) y `null` tampoco
 * (la columna es `not null`), pero los dos llegarían acá como un monto y
 * `formatClp` los pintaría como "$0" o "$-5" en la vitrina. Tratarlos como
 * "consultar" convierte un dato imposible en una conversación, que es la peor
 * salida posible menos una.
 */
export function isPriceOnRequest(pesos) {
  const amount = Number(pesos);
  return !Number.isFinite(amount) || amount <= 0;
}

/** 12000 → "$12.000"; 0 → "A consultar". */
export function formatPrice(pesos) {
  return isPriceOnRequest(pesos) ? PRICE_ON_REQUEST_LABEL : formatClp(pesos);
}

/** "2 productos", "1 producto" — para no repetir el plural en cada vista. */
export function countLabel(count) {
  return `${String(count)} producto${count === 1 ? "" : "s"}`;
}
