"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Picture from "../media/Picture";
import { formatPrice, isPriceOnRequest } from "../../domain/shared/pricing";
import ProductQuickView from "../cart/ProductQuickView";

/** Píxeles por segundo — la cinta de marcas recorre más o menos lo mismo. */
const SPEED = 40;
/** Cuánto espera después de que alguien la tocó o usó una flecha. */
const RESUME_AFTER_MS = 4000;

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
 *
 * It drifts on its own like the brands band, but by moving the track's real
 * scroll position rather than a CSS transform — so the arrows and a finger
 * swipe keep working on the same strip. The list is rendered twice and the
 * position wraps by one copy's width, which is what makes the loop seamless.
 * It stops while the pointer is over it, while a card has focus, while the
 * preview is open and for a few seconds after anyone scrolls it by hand.
 */
export default function BestSellers({ data, products = [] }) {
  const trackRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const pausedUntil = useRef(0);
  const hovering = useRef(false);
  const looping = products.length > 1;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !looping || preview) return undefined;

    let frame;
    let last = performance.now();
    let position = track.scrollLeft;

    const tick = (now) => {
      // Topado para que volver a una pestaña oculta no dé un salto de golpe.
      const elapsed = Math.min(now - last, 250);
      last = now;

      // Alguien la movió (flecha, dedo, rueda): seguir desde donde la dejó.
      if (Math.abs(track.scrollLeft - position) > 2) {
        position = track.scrollLeft;
        pausedUntil.current = now + RESUME_AFTER_MS;
      }

      const busy = hovering.current || track.contains(document.activeElement) || now < pausedUntil.current;
      if (!busy) {
        const loop = track.querySelector("[data-copy='1']")?.offsetLeft - track.querySelector(".bs__card")?.offsetLeft;
        position += (SPEED * elapsed) / 1000;
        if (loop > 0 && position >= loop) position -= loop;
        track.scrollLeft = position;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [looping, preview]);

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector(".bs__card");
    pausedUntil.current = performance.now() + RESUME_AFTER_MS;
    track.scrollBy({ left: direction === "left" ? -(card?.offsetWidth + 20 || 300) : (card?.offsetWidth + 20 || 300), behavior: "smooth" });
  };

  const badgeFor = (product, index) =>
    index === 0 && product.unitsSold > 0 ? "Más vendido" : null;

  return <section className="bs">
    <div className="bs__header"><h2 className="bs__title">{data.title}</h2><Link href={data.linkPath} className="bs__link">{data.linkLabel}</Link></div>
    <div className="bs__wrapper">
      <button className="bs__arrow bs__arrow--left" onClick={() => scroll("left")} aria-label="Anterior">‹</button>
      <div
        className="bs__track"
        ref={trackRef}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") hovering.current = true; }}
        onPointerLeave={() => { hovering.current = false; }}
        onPointerDown={() => { pausedUntil.current = performance.now() + RESUME_AFTER_MS; }}
      >{(looping ? [0, 1] : [0]).flatMap((copy) => products.map((product, index) => {
        const badge = badgeFor(product, index);
        // La segunda copia solo existe para que la vuelta no se note: fuera del
        // orden de tabulación y de lo que lee un lector de pantalla.
        const clone = copy === 1;
        return <div
          key={`${copy}-${product.id}`}
          data-copy={index === 0 ? copy : undefined}
          className="bs__card bs__card--clickable"
          role="button"
          tabIndex={clone ? -1 : 0}
          aria-hidden={clone || undefined}
          aria-label={`Ver ${product.name}`}
          onClick={() => setPreview(product)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPreview(product); } }}
        >
          <div className="bs__card-img"><Picture src={product.image} alt={product.name} sizes="(max-width: 720px) 60vw, 260px" />{badge && <span className={`bs__badge ${badgeColors[badge]}`}>{badge}</span>}</div>
          <div className="bs__card-info"><p className="bs__card-name">{product.name}</p><p className="bs__card-type">{product.type}</p><p className={`bs__card-price ${isPriceOnRequest(product.price) ? "bs__card-price--ask" : ""}`}>{formatPrice(product.price)}</p></div>
        </div>;
      }))}</div>
      <button className="bs__arrow bs__arrow--right" onClick={() => scroll("right")} aria-label="Siguiente">›</button>
    </div>

    {preview && <ProductQuickView product={preview} onClose={() => setPreview(null)} />}
  </section>;
}
