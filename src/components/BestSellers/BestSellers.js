"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import Picture from "../media/Picture";
import { formatClp } from "../../domain/shared/money";
import ProductQuickView from "../cart/ProductQuickView";

const badgeColors = { "Más vendido": "bs-badge--blue", Oferta: "bs-badge--red", Nuevo: "bs-badge--green" };

/**
 * The best-sellers rail.
 *
 * `data` is the editable heading and link; `products` is derived from actual
 * sales, so nothing here is curated. Clicking a card opens a preview rather
 * than navigating — see `ProductQuickView`.
 *
 * Only the leader is badged, and only once it has really sold something. A
 * "Más vendido" label on a shop that has sold nothing is just decoration.
 */
export default function BestSellers({ data, products = [] }) {
  const trackRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector(".bs__card");
    track.scrollBy({ left: direction === "left" ? -(card?.offsetWidth + 20 || 300) : (card?.offsetWidth + 20 || 300), behavior: "smooth" });
  };

  const badgeFor = (product, index) =>
    index === 0 && product.unitsSold > 0 ? "Más vendido" : null;

  return <section className="bs">
    <div className="bs__header"><h2 className="bs__title">{data.title}</h2><Link href={data.linkPath} className="bs__link">{data.linkLabel}</Link></div>
    <div className="bs__wrapper">
      <button className="bs__arrow bs__arrow--left" onClick={() => scroll("left")} aria-label="Anterior">‹</button>
      <div className="bs__track" ref={trackRef}>{products.map((product, index) => {
        const badge = badgeFor(product, index);
        return <div
          key={product.id}
          className="bs__card bs__card--clickable"
          role="button"
          tabIndex={0}
          aria-label={`Ver ${product.name}`}
          onClick={() => setPreview(product)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPreview(product); } }}
        >
          <div className="bs__card-img"><Picture src={product.image} alt={product.name} sizes="(max-width: 720px) 60vw, 260px" />{badge && <span className={`bs__badge ${badgeColors[badge]}`}>{badge}</span>}</div>
          <div className="bs__card-info"><p className="bs__card-name">{product.name}</p><p className="bs__card-type">{product.type}</p><p className="bs__card-price">{formatClp(product.price)}</p></div>
        </div>;
      })}</div>
      <button className="bs__arrow bs__arrow--right" onClick={() => scroll("right")} aria-label="Siguiente">›</button>
    </div>

    {preview && <ProductQuickView product={preview} onClose={() => setPreview(null)} />}
  </section>;
}
