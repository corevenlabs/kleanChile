"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatPrice, isPriceOnRequest } from "../../domain/shared/pricing";
import AddToCartForm from "./AddToCartForm";

/**
 * A product preview, without leaving the page it was opened from.
 *
 * The home page is where people browse rather than search, and sending them to
 * a full product page to read two lines and come back loses the thread of what
 * they were looking at. Everything needed to decide is here; the link to the
 * full page stays for the spec sheet.
 */
export default function ProductQuickView({ product, onClose }) {
  // Escape closes it, and the page behind must not scroll while it is open —
  // otherwise dismissing the modal returns you somewhere else in the list.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="quickview__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      onMouseDown={onClose}
    >
      <div className="quickview" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="quickview__close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className="quickview__media">
          {product.image && <img src={product.image} alt={product.name} />}
        </div>

        <div className="quickview__body">
          {product.skuCode && <p className="quickview__sku">SKU {product.skuCode}</p>}
          <h2>{product.name}</h2>
          {product.type && <p className="quickview__type">{product.type}</p>}
          <p
            className={`quickview__price ${isPriceOnRequest(product.price) ? "quickview__price--ask" : ""}`}
          >
            {formatPrice(product.price)}
          </p>
          {isPriceOnRequest(product.price) && (
            <p className="price-ask-note">
              Agrégalo al carrito y te cotizamos por WhatsApp.
            </p>
          )}

          {product.description && <p className="quickview__description">{product.description}</p>}

          <AddToCartForm
            productId={product.id}
            inStock={product.inStock}
            stockOnHand={product.stockOnHand}
          />

          <Link className="quickview__link" href={`/product/${String(product.id)}`}>
            Ver ficha completa →
          </Link>
        </div>
      </div>
    </div>
  );
}
