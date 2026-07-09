import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./Banner.css";

const SLIDES = [
  { id: 1, eyebrow: "SERVICIOS PROFESIONALES", title: "Limpieza que transforma espacios", description: "Soluciones de limpieza profesional para hogares, empresas e industrias.", cta: "Ver servicios", image: "/image/BannerLimpieza.png", alt: "Limpieza profesional", path: "/cleaning" },
  { id: 2, eyebrow: "ARTÍCULOS ESCOLARES", title: "Todo para el aula y oficina", description: "Papelería, útiles escolares y suministros de oficina de calidad.", cta: "Ver catálogo", image: "/image/BannerEscolar.png", alt: "Material escolar", path: "/bookshop" },
  { id: 3, eyebrow: "EQUIPOS INDUSTRIALES", title: "Maquinaria confiable para industria", description: "Equipos duraderos para producción, mantenimiento y operación industrial.", cta: "Ver equipos", image: "/image/BannerMaquinaria.png", alt: "Maquinaria industrial", path: "/machinery" },
];

const INTERVAL = 3500;

function TextEffect({ children, className, per = "word", delay = 0 }) {
  const parts = per === "char" ? children.split("") : children.split(" ");
  return (
    <motion.div className={className} initial="hidden" animate="visible" variants={{ visible: { transition: { delayChildren: delay, staggerChildren: 0.05 } } }}>
      {parts.map((part, index) => (
        <motion.span key={index} variants={{ hidden: { opacity: 0, y: 25, filter: "blur(8px)" }, visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35 } } }} style={{ display: "inline-block", whiteSpace: "pre", marginRight: per === "word" ? "0.3em" : 0 }}>
          {part}
        </motion.span>
      ))}
    </motion.div>
  );
}

export default function Banner() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx) => {
    setCurrent(idx);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[current];

  return (
    <section className="hero">
      <div className="hero__bg">
        {SLIDES.map((s, i) => (
          <img
            key={s.id}
            src={s.image}
            alt={s.alt}
            className={`hero__img ${i === current ? "active" : ""}`}
          />
        ))}
        <div className="hero__overlay" />
      </div>

      <div className="hero__content">
        <TextEffect key={`eyebrow-${slide.id}`} className="hero__eyebrow" per="char" delay={0.15}>{slide.eyebrow}</TextEffect>
        <TextEffect key={`title-${slide.id}`} className="hero__title" per="word" delay={0.45}>{slide.title}</TextEffect>
        <TextEffect key={`desc-${slide.id}`} className="hero__desc" per="word" delay={0.85}>{slide.description}</TextEffect>
        <Link to={slide.path} className="hero__cta"> {slide.cta} </Link>
      </div>

      <div className="hero__progress">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className={`progress-bar ${i === current ? "active" : i < current ? "done" : ""}`} />
        ))}
      </div>
    </section>
  );
}