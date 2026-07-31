import Link from "next/link";
import { notFound } from "next/navigation";
import { lineTotal } from "../../../../src/domain/cart/totals.js";
import { buildOrderMessage, whatsappUrl } from "../../../../src/domain/orders/whatsappMessage.js";
import { formatClp } from "../../../../src/domain/shared/money.js";
import { getContent } from "../../../../src/infra/db/queries/content.js";
import { getOrderByToken } from "../../../../src/infra/db/queries/orders.js";

export const metadata = { title: "Tu pedido", robots: { index: false, follow: false } };

const STATUS = {
  pending: { label: "Pendiente", className: "order-page__badge--pending" },
  confirmed: { label: "Confirmado", className: "order-page__badge--confirmed" },
  cancelled: { label: "Anulado", className: "order-page__badge--cancelled" },
};

/**
 * The customer's own order page, and the WhatsApp handoff.
 *
 * Addressed by a random token rather than the order number: the number is
 * sequential, so `/pedido/KC-0043` would let anyone read the next customer's
 * order.
 *
 * The message is rebuilt here from the stored snapshots on every visit, so the
 * link still works if the customer closes WhatsApp and comes back — and it says
 * exactly what the shop's copy of the order says.
 */
export default async function Page({ params }) {
  const { token } = await params;
  const order = await getOrderByToken(token);

  if (!order) notFound();

  const content = await getContent();
  const status = STATUS[order.status] ?? STATUS.pending;

  const message = buildOrderMessage({
    orderNumber: order.number,
    lines: order.lines,
    customerName: order.customerName,
  });

  return (
    <div className="order-page">
      <span className={`order-page__badge ${status.className}`}>{status.label}</span>
      <h1>Pedido {order.number}</h1>

      <p className="order-page__lead">
        {order.status === "pending" &&
          "Envíanos el detalle por WhatsApp para confirmar disponibilidad, despacho y forma de pago."}
        {order.status === "confirmed" &&
          "Confirmamos tu pedido y ya reservamos los productos. Te contactaremos para coordinar la entrega."}
        {order.status === "cancelled" && "Este pedido fue anulado. Escríbenos si necesitas retomarlo."}
      </p>

      {order.status !== "cancelled" && (
        <a
          className="order-whatsapp"
          href={whatsappUrl(content.whatsapp.phoneNumber, message)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg aria-hidden width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.2 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.9-1c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.1.1.6-.1 1.2Z" />
          </svg>
          Enviar pedido por WhatsApp
        </a>
      )}

      <div className="order-lines">
        {order.lines.map((line) => (
          <div className="order-line" key={`${String(line.productId)}-${line.skuCode ?? line.name}`}>
            <div>
              {line.name}
              <span>
                {line.skuCode ? `SKU ${line.skuCode} · ` : ""}
                {line.quantity} × {formatClp(line.unitPrice)}
              </span>
            </div>
            <strong>{formatClp(lineTotal({ unitPrice: line.unitPrice, quantity: line.quantity }))}</strong>
          </div>
        ))}
      </div>

      <div className="order-total">
        <span>Total</span>
        <span>{formatClp(order.total)}</span>
      </div>

      <p className="order-page__lead" style={{ marginTop: 28 }}>
        Guarda este enlace para revisar el estado de tu pedido.{" "}
        <Link href="/">Volver al inicio</Link>
      </p>
    </div>
  );
}
