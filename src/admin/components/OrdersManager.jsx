"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrderAction, confirmOrderAction } from "../../actions/order";
import { formatClp } from "../../domain/shared/money";
import Icon from "./Icon";

/**
 * The orders table.
 *
 * Confirming is the action that moves stock, so it asks first and says what it
 * will do. A shortfall comes back naming the products and counts rather than a
 * bare failure — whoever presses this is usually on WhatsApp with the customer
 * and needs to be able to say which line is the problem.
 */

const STATUS_LABEL = { pending: "Pendiente", confirmed: "Confirmado", cancelled: "Anulado" };

const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" });

export default function OrdersManager({ orders }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [pending, startTransition] = useTransition();

  const run = (work) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await work();
      setFeedback({ tone: result.status, message: result.message });
      if (result.status === "ok") router.refresh();
    });
  };

  const confirm = (order) => {
    const detail = order.lines
      .map((line) => `${String(line.quantity)} × ${line.name}`)
      .join("\n");

    if (window.confirm(`Confirmar ${order.number} y descontar del stock:\n\n${detail}`)) {
      run(() => confirmOrderAction(order.id));
    }
  };

  const cancel = (order) => {
    const note = window.prompt(`Anular ${order.number}. Motivo (opcional):`, "");
    if (note === null) return;
    run(() => cancelOrderAction(order.id, note));
  };

  return (
    <>
      {feedback && (
        <p className="admin-saved" role={feedback.tone === "error" ? "alert" : undefined}>
          {feedback.message}
        </p>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Fragment key={order.id}>
                <tr>
                  <td>
                    <strong>{order.number}</strong>
                  </td>
                  <td>{order.customerName ?? "—"}</td>
                  <td>
                    {/*
                      Despliega las líneas del pedido. Salía como botón nativo y
                      con las flechas ▴/▾ tipografiadas, que cambian de forma
                      según la fuente del equipo — parecía un select a medio
                      estilar. Ahora usa el mismo ícono que el resto del panel.
                    */}
                    <button
                      type="button"
                      className={`admin-disclosure ${expanded === order.id ? "admin-disclosure--open" : ""}`}
                      aria-expanded={expanded === order.id}
                      onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    >
                      {order.itemCount} {order.itemCount === 1 ? "ítem" : "ítems"}
                      <Icon name="chevron" size={13} />
                    </button>
                  </td>
                  <td>
                    <strong>{formatClp(order.total)}</strong>
                  </td>
                  <td>
                    <span className="admin-chip">{STATUS_LABEL[order.status]}</span>
                  </td>
                  <td>{dateFormat.format(order.createdAt)}</td>
                  <td>
                    <div className="admin-row-actions">
                      {order.status === "pending" && (
                        <button type="button" disabled={pending} onClick={() => confirm(order)}>
                          Confirmar
                        </button>
                      )}
                      {order.status !== "cancelled" && (
                        <button
                          type="button"
                          className="danger"
                          disabled={pending}
                          onClick={() => cancel(order)}
                        >
                          Anular
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {expanded === order.id && (
                  <tr>
                    <td colSpan={7} className="admin-order-detail">
                      {order.lines.map((line) => (
                        <div key={`${line.skuCode ?? ""}-${line.name}`} className="admin-product">
                          <div>
                            <strong>{line.name}</strong>
                            <small>
                              SKU {line.skuCode ?? "—"} · {line.quantity} ×{" "}
                              {formatClp(line.unitPrice)}
                            </small>
                          </div>
                        </div>
                      ))}
                      {order.notes && <p className="admin-note">{order.notes}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="admin-empty">Todavía no hay pedidos.</div>}
      </div>
    </>
  );
}
