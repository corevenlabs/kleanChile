"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  removeFromCartAction,
  requestOrderAction,
  setCartQuantityAction,
} from "../../actions/cart";
import { lineTotal, subtotal } from "../../domain/cart/totals";
import { formatClp } from "../../domain/shared/money";

/**
 * The cart page.
 *
 * Every control is a form posting to a Server Action, because the cart lives in
 * an `httpOnly` cookie that no script on this page can touch. That also means
 * the page works without JavaScript, which the quantity steppers of most carts
 * do not.
 */

function QuantityForm({ line }) {
  const [, formAction] = useActionState(setCartQuantityAction, { status: "idle" });

  return (
    <form action={formAction} style={{ display: "contents" }}>
      <input type="hidden" name="productId" value={line.productId} />
      <input
        className="cart-line__qty"
        type="number"
        name="quantity"
        min={0}
        max={99}
        defaultValue={line.quantity}
        aria-label={`Cantidad de ${line.name}`}
        // Submitting on change keeps the stepper feeling live; the form still
        // works with the keyboard and Enter when scripting is unavailable.
        onChange={(event) => event.currentTarget.form.requestSubmit()}
      />
    </form>
  );
}

function RemoveForm({ productId }) {
  const [, formAction] = useActionState(removeFromCartAction, { status: "idle" });

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" className="cart-line__remove">
        Quitar
      </button>
    </form>
  );
}

export default function Cart({ lines, dropped }) {
  const [state, formAction, pending] = useActionState(requestOrderAction, { status: "idle" });

  if (lines.length === 0) {
    return (
      <div className="cart-page">
        <h1 className="cart-page__title">Tu carrito</h1>
        <div className="cart-empty">
          <p>Todavía no has agregado productos.</p>
          <Link href="/cleaning">Ver catálogo</Link>
        </div>
      </div>
    );
  }

  const total = subtotal(lines);

  return (
    <div className="cart-page">
      <h1 className="cart-page__title">Tu carrito</h1>
      <p className="cart-page__lead">
        Revisa tu pedido y envíalo por WhatsApp. Te confirmaremos disponibilidad y forma de pago.
      </p>

      {dropped.length > 0 && (
        <p className="cart-line__warn">
          Quitamos {dropped.length} producto(s) que ya no están disponibles.
        </p>
      )}

      <div className="cart-layout">
        <div className="cart-lines">
          {lines.map((line) => (
            <div className="cart-line" key={line.productId}>
              <img className="cart-line__image" src={line.image} alt="" />
              <div>
                <p className="cart-line__name">{line.name}</p>
                {line.skuCode && <p className="cart-line__sku">SKU {line.skuCode}</p>}

                <div className="cart-line__controls">
                  <QuantityForm line={line} />
                  <span>× {formatClp(line.unitPrice)}</span>
                  <RemoveForm productId={line.productId} />
                  <strong className="cart-line__total">{formatClp(lineTotal(line))}</strong>
                </div>

                {line.exceedsStock && (
                  <p className="cart-line__warn">
                    Solo quedan {line.stockOnHand}. Puedes pedirlo igual y lo confirmamos contigo.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <form className="cart-summary" action={formAction}>
          <h2>Resumen</h2>

          <div className="cart-summary__row">
            <span>Productos</span>
            <span>{lines.reduce((count, line) => count + line.quantity, 0)}</span>
          </div>

          <div className="cart-summary__total">
            <span>Total</span>
            <span>{formatClp(total)}</span>
          </div>

          <label>
            Tu nombre (opcional)
            <input type="text" name="customerName" maxLength={120} placeholder="Para identificar el pedido" />
          </label>

          <button type="submit" className="cart-submit" disabled={pending}>
            {pending ? "Generando pedido…" : "Solicitar por WhatsApp"}
          </button>

          {state.status === "error" && (
            <p className="cart-line__warn" role="alert">
              {state.message}
            </p>
          )}

          <p className="cart-summary__note">
            Se creará un pedido con un número de referencia y se abrirá WhatsApp con el detalle
            listo para enviar. No se cobra nada en este paso.
          </p>
        </form>
      </div>
    </div>
  );
}
