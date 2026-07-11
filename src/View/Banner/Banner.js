import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./Banner.css";

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

export default function Banner({ data }) {
  const { slides, interval } = data;
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx) => {
    setCurrent(idx);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval, slides.length]);

  const slide = slides[current];

  return (
    <section className="hero">
      <div className="hero__bg">
        {slides.map((s, i) => (
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
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className={`progress-bar ${i === current ? "active" : i < current ? "done" : ""}`} />
        ))}
      </div>
    </section>
  );
}
