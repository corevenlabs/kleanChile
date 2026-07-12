"use client";

import Link from "next/link";
import { useRef } from "react";

const badgeColors = { "Más vendido": "bs-badge--blue", Oferta: "bs-badge--red", Nuevo: "bs-badge--green" };

export default function BestSellers({ data }) {
  const trackRef = useRef(null);
  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector(".bs__card");
    track.scrollBy({ left: direction === "left" ? -(card?.offsetWidth + 20 || 300) : (card?.offsetWidth + 20 || 300), behavior: "smooth" });
  };
  return <section className="bs">
    <div className="bs__header"><h2 className="bs__title">{data.title}</h2><Link href={data.linkPath} className="bs__link">{data.linkLabel}</Link></div>
    <div className="bs__wrapper">
      <button className="bs__arrow bs__arrow--left" onClick={() => scroll("left")} aria-label="Anterior">‹</button>
      <div className="bs__track" ref={trackRef}>{data.products.map((product) => <div key={product.id} className="bs__card">
        <div className="bs__card-img"><img src={product.image} alt={product.name} loading="lazy" />{product.badge && <span className={`bs__badge ${badgeColors[product.badge]}`}>{product.badge}</span>}</div>
        <div className="bs__card-info"><p className="bs__card-name">{product.name}</p><p className="bs__card-type">{product.type}</p><p className="bs__card-price">{product.price}</p></div>
      </div>)}</div>
      <button className="bs__arrow bs__arrow--right" onClick={() => scroll("right")} aria-label="Siguiente">›</button>
    </div>
  </section>;
}
