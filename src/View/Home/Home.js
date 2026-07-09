import React from 'react'
import './Home.css'
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

export default function Home() {
  return (
    <>
      <Banner />

      <RevealSection effect="fade-up">
        <BestSellers />
      </RevealSection>

      <RevealSection effect="zoom-in" delay={80}>
        <DualBanner />
      </RevealSection>

      {/* 👇 TESTIMONIOS - con efecto fade-up como el resto */}
      <RevealSection effect="fade-up" delay={60}>
        <Testimonials />
      </RevealSection>

      <RevealSection effect="slide-right">
        <WhyUs />
      </RevealSection>

      <RevealSection effect="fade-up" delay={60}>
        <BrandSlider />
      </RevealSection>
    </>
  )
}