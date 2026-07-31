"use client";

import React from 'react'
import Banner from '../Banner/Banner'
import BestSellers from '../../components/BestSellers/BestSellers'
import BrandSlider from '../../components/BrandSlider/BrandSlider'
import DualBanner from '../../components/DualBanner/DualBanner'
import WhyUs from '../../components/WhyUs/WhyUs'
import Testimonials from '../../components/Testimonials/Testimonials' // 👈 NUEVO
import { useScrollReveal } from '../../hooks/useScrollReveal'

function RevealSection({ children, className = '', effect = 'fade-up', delay = 0 }) {
  const ref = useScrollReveal()

  return (
    <div
      ref={ref}
      className={`scroll-section scroll-section--${effect} ${className}`}
      style={{ '--delay': `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/**
 * The home page sections, in order.
 *
 * `content` is the whole set of editable blocks, straight from the database.
 * `bestSellers` is separate because it is derived from sales rather than
 * edited — the block only supplies the heading and the link.
 *
 * The two guards are not defensive noise: `Banner` indexes `slides[current]`
 * and `DualBanner` destructures `[left, ...right]`, so each crashes on an empty
 * list — and emptying a section is a thing the admin now lets someone do.
 */
export default function Home({ content, bestSellers = [] }) {
  return (
    <>
      {/*
        The home page had no `h1` at all.

        It cannot be the hero's headline: that rotates every few seconds and
        some slides deliberately carry no text, so the page's one top-level
        heading would change under the reader or vanish entirely. A stable
        hidden heading says what the site is, once, to a screen reader landing
        cold and to a crawler deciding what this page is about.
      */}
      <h1 className="sr-only">
        KleanChile — productos de limpieza, librería y artículos de escritorio para instituciones
      </h1>

      {content.hero.slides.length > 0 && <Banner data={content.hero} />}

      <RevealSection effect="fade-up">
        <BestSellers data={content.bestSellers} products={bestSellers} />
      </RevealSection>

      {content.dualBanner.blocks.length > 0 && (
        <RevealSection effect="zoom-in" delay={80}>
          <DualBanner data={content.dualBanner} />
        </RevealSection>
      )}

      {/* 👇 TESTIMONIOS - con efecto fade-up como el resto */}
      <RevealSection effect="fade-up" delay={60}>
        <Testimonials data={content.testimonials} />
      </RevealSection>

      <RevealSection effect="slide-right">
        <WhyUs data={content.whyUs} />
      </RevealSection>

      <RevealSection effect="fade-up" delay={60}>
        <BrandSlider data={content.brands} />
      </RevealSection>
    </>
  )
}
