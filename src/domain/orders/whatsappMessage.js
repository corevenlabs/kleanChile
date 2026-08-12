import { cartTotal, lineTotal } from "../cart/totals.js";
import { formatClp } from "../shared/money.js";
import { countLabel, isPriceOnRequest } from "../shared/pricing.js";

/**
 * The message the customer sends to request an order.
 *
 * This text is the handoff: it is the only thing that travels from the site to
 * the shop, so it has to carry everything needed to fulfil the order without a
 * follow-up question — the reference, each SKU, each quantity, and the total.
 *
 * Written in Spanish because every customer is Chilean. Unlike identifiers and
 * code, which stay English, this is copy a person reads.
 *
 * WhatsApp renders `*text*` as bold and collapses no whitespace, so the layout
 * here is what arrives.
 */
export function buildOrderMessage({ orderNumber, lines, customerName = null }) {
  const parts = [`Hola! Quiero solicitar el pedido *${orderNumber}*.`, ""];

  for (const line of lines) {
    parts.push(`• ${line.name}`);

    /*
     * Un producto a consultar entra al mensaje con su cantidad y sin monto.
     *
     * Es la línea que hace que este pedido exista: el cliente quiso pedirlo,
     * la tienda tiene que cotizarlo, y decir "0 × $0 = $0" convertiría eso en
     * un producto regalado. Sin el "= …" el ojo de quien atiende se detiene
     * exactamente donde tiene que responder.
     */
    parts.push(
      isPriceOnRequest(line.unitPrice)
        ? `  SKU ${line.skuCode} · ${String(line.quantity)} × a consultar`
        : `  SKU ${line.skuCode} · ${String(line.quantity)} × ${formatClp(line.unitPrice)} = ${formatClp(lineTotal(line))}`,
    );
  }

  const total = cartTotal(lines);

  parts.push("");
  parts.push(`*Total: ${total.label}*`);
  if (total.onRequestCount > 0 && total.note) {
    // Repetido en palabras y no solo en el símbolo "+": este mensaje se lee en
    // una notificación del teléfono, muchas veces recortado a dos líneas.
    parts.push(`(${countLabel(total.onRequestCount)} sin precio, por cotizar)`);
  }

  if (customerName) {
    parts.push("");
    parts.push(`Nombre: ${customerName}`);
  }

  return parts.join("\n");
}

/**
 * A `wa.me` link, optionally pre-filled.
 *
 * `wa.me` wants the number in international format with no `+`, spaces or
 * dashes, which is what the schema validates the stored number to be.
 *
 * The message is percent-encoded with `encodeURIComponent`. `URLSearchParams`
 * is wrong for this: it encodes a space as `+`, and WhatsApp renders that
 * literally, so every space in the order would arrive as a plus sign.
 */
export function whatsappUrl(phoneNumber, message) {
  const base = `https://wa.me/${String(phoneNumber ?? "").replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
