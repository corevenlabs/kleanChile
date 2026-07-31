"use client";

import { useActionState } from "react";
import Link from "next/link";
import { addToCartAction } from "../../actions/cart";

/**
 * The add button.
 *
 * A real `<form>` posting to a Server Action rather than a click handler, so it
 * works before this page's JavaScript has finished loading. `useActionState`
 * layers pending state and the confirmation on top once hydration happens, so
 * the enhanced version is strictly additive rather than a prerequisite.
 */
export default function AddToCartForm({ productId, inStock, stockOnHand, showQuantity = true }) {
  const [state, formAction, pending] = useActionState(addToCartAction, { status: "idle" });

  return (
    <form action={formAction} className="add-to-cart">
      <input type="hidden" name="productId" value={productId} />

      <div className="add-to-cart__row">
        {showQuantity && (
          <input
            className="add-to-cart__qty"
            type="number"
            name="quantity"
            defaultValue={1}
            min={1}
            max={99}
            aria-label="Cantidad"
            disabled={!inStock}
          />
        )}
        <button type="submit" className="add-to-cart__button" disabled={!inStock || pending}>
          {!inStock ? "Sin stock" : pending ? "Agregando…" : "Agregar al carrito"}
        </button>
      </div>

      {inStock && stockOnHand <= 5 && (
        <p className="stock-note">Quedan {stockOnHand} unidades.</p>
      )}
      {!inStock && (
        <p className="stock-note stock-note--out">
          Sin stock por ahora. Escríbenos y te avisamos cuando llegue.
        </p>
      )}

      {/*
        Announced politely so the confirmation reaches a screen reader, which
        otherwise gets no signal that anything happened. It stays until the next
        submission rather than fading: this message carries the only link to the
        cart from here, and one that disappears before it is read is worse than
        one that lingers.
      */}
      <p aria-live="polite" className="add-to-cart__feedback">
        {state.status === "ok" && (
          <span className="add-to-cart__ok">
            ✓ Agregado. <Link href="/carrito">Ver carrito</Link>
          </span>
        )}
        {state.status === "error" && (
          <span className="add-to-cart__error">{state.message}</span>
        )}
      </p>
    </form>
  );
}
