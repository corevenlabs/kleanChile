"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

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
  const [playing, setPlaying] = useState(true);

  const goTo = useCallback((idx) => {
    setCurrent(idx);
    /*
     * Choosing a slide stops the rotation.
     *
     * Otherwise the carousel takes the page back three seconds later, which is
     * the specific behaviour that makes auto-advancing heroes hostile: the one
     * user who expressed an interest is the one who gets overruled.
     */
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || slides.length < 2) return undefined;

    /*
     * WCAG 2.2.2: content that moves on its own for more than five seconds
     * needs a way to stop it. There is a pause button below, and reduced-motion
     * users never start — for someone with a vestibular disorder a rotating
     * full-bleed image is not decoration, and the CSS `prefers-reduced-motion`
     * block cannot stop a `setInterval`.
     */
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return undefined;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval, slides.length, playing]);

  const slide = slides[current];

  return (
    <section className="hero" aria-roledescription="carrusel" aria-label="Destacados">
      <div className="hero__bg">
        {slides.map((s, i) => (
          <img
            key={s.id}
            src={s.image}
            alt={i === current ? s.alt : ""}
            /* Every slide is in the DOM at once, only one is visible. Without
               this a screen reader reads all five alt texts in a row as though
               they were one page. */
            aria-hidden={i === current ? undefined : "true"}
            className={`hero__img ${i === current ? "active" : ""}`}
            /* The hero is the LCP element on the home page; the first slide
               must not wait behind lazy-loading heuristics. */
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
          />
        ))}
        {/* The scrim exists to make text readable, so with no text it steps
            back to a light tint that only keeps the buttons legible. */}
        <div className={`hero__overlay ${slide.title || slide.description ? "" : "hero__overlay--bare"}`} />
      </div>

      {/*
        Each line is rendered only when it has something to say.

        Some banner artwork is already a finished poster — its own headline,
        its own call to action, sometimes its own logo. Laying the site's text
        over that produces two competing headlines, and no amount of scrim
        fixes it. Clearing the title and description for such a slide in the
        admin now leaves the artwork to speak, with just the button over it;
        clearing the button text too leaves the image alone entirely.
      */}
      <div className="hero__content">
        {slide.eyebrow && <TextEffect key={`eyebrow-${slide.id}`} className="hero__eyebrow" per="char" delay={0.15}>{slide.eyebrow}</TextEffect>}
        {slide.title && <TextEffect key={`title-${slide.id}`} className="hero__title" per="word" delay={0.45}>{slide.title}</TextEffect>}
        {slide.description && <TextEffect key={`desc-${slide.id}`} className="hero__desc" per="word" delay={0.85}>{slide.description}</TextEffect>}
        {slide.cta && <Link href={slide.path} className="hero__cta">{slide.cta}</Link>}
      </div>

      {/*
        These were five unlabelled buttons — a screen reader announced "botón,
        botón, botón" with no way to tell which one was current or where any of
        them led. The slide's own eyebrow or title names it where there is one.
      */}
      <div className="hero__progress" role="group" aria-label="Diapositivas">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={s.title || s.eyebrow || `Diapositiva ${String(i + 1)}`}
            aria-current={i === current ? "true" : undefined}
            className={`progress-bar ${i === current ? "active" : i < current ? "done" : ""}`}
          />
        ))}

        {slides.length > 1 && (
          <button
            type="button"
            className="hero__playpause"
            onClick={() => setPlaying((on) => !on)}
            aria-label={playing ? "Pausar el carrusel" : "Reanudar el carrusel"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {playing ? (
                <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
              ) : (
                <path d="M8 5l11 7-11 7z" />
              )}
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
