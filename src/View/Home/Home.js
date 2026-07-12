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

export default function Home({ banner, content }) {
  return (
    <>
      <Banner data={banner} />

      <RevealSection effect="fade-up">
        <BestSellers data={content.bestSellers} />
      </RevealSection>

      <RevealSection effect="zoom-in" delay={80}>
        <DualBanner data={content.dualBanner} />
      </RevealSection>

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
