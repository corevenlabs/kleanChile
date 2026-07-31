"use client";

import { useEffect, useState } from "react";

export default function Testimonials({ data }) {
  const testimonials = data.items;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(3);

  useEffect(() => {
    const resize = () => setItemsPerView(window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    resize(); window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (isPaused) return undefined;
    const timer = setInterval(() => setCurrentIndex((index) => index + itemsPerView >= testimonials.length ? 0 : index + itemsPerView), 5000);
    return () => clearInterval(timer);
  }, [isPaused, itemsPerView, testimonials.length]);

  const visible = testimonials.slice(currentIndex, currentIndex + itemsPerView);
  const items = visible.length === itemsPerView ? visible : [...visible, ...testimonials.slice(0, itemsPerView - visible.length)];
  const pages = Math.ceil(testimonials.length / itemsPerView);
  const move = (direction) => setCurrentIndex((index) => {
    const next = index + direction * itemsPerView;
    if (next < 0) return Math.max(0, testimonials.length - itemsPerView);
    return next >= testimonials.length ? 0 : next;
  });

  return <section className="testimonials" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}><div className="testimonials__inner">
    <div className="testimonials__header"><span className="testimonials__label">{data.label}</span><h2 className="testimonials__title">{data.title}</h2><p className="testimonials__subtitle">{data.subtitle}</p></div>
    <div className="testimonials__slider"><button className="testimonials__arrow testimonials__arrow--prev" onClick={() => move(-1)} aria-label="Anterior">‹</button>
      <div className="testimonials__grid">{items.map((item, index) => <div className="testimonial-card" key={`${item.id}-${index}`}><div className="testimonial-card__stars">★★★★★</div><p className="testimonial-card__comentario">“{item.comentario}”</p><div className="testimonial-card__footer"><div><p className="testimonial-card__nombre">{item.nombre}</p><p className="testimonial-card__cargo">{item.cargo}</p><p className="testimonial-card__empresa">{item.empresa}</p></div><span className="testimonial-card__fecha">{item.fecha}</span></div></div>)}</div>
      <button className="testimonials__arrow testimonials__arrow--next" onClick={() => move(1)} aria-label="Siguiente">›</button></div>
    <div className="testimonials__dots">{Array.from({ length: pages }).map((_, index) => <button key={index} className={`testimonials__dot ${Math.floor(currentIndex / itemsPerView) === index ? "active" : ""}`} onClick={() => setCurrentIndex(index * itemsPerView)} aria-label={`Ir a página ${index + 1}`} aria-current={Math.floor(currentIndex / itemsPerView) === index ? "true" : undefined} />)}</div>
  </div></section>;
}
