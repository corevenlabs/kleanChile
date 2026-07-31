"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import TextEffect from "../core/TextEffect";
import Picture from "../media/Picture";

const Arrow = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;

function BannerBlock({ block }) {
  return <div className={`dual__block dual__block--${block.position}`}>
    <Picture src={block.image} alt={block.alt} className="dual__img" sizes="(max-width: 900px) 100vw, 50vw" /><div className="dual__overlay" />
    <div className="dual__content"><TextEffect className="dual__eyebrow" per="char" delay={0.15}>{block.eyebrow}</TextEffect><TextEffect className="dual__title" per="word" delay={0.35}>{block.title}</TextEffect>
      {block.description && <TextEffect className="dual__desc" per="word" delay={0.65}>{block.description}</TextEffect>}
      <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: block.description ? 0.9 : 0.65 }} viewport={{ once: true }}><Link href={block.path} className="dual__btn dual__btn--light">{block.cta}<Arrow /></Link></motion.div>
    </div>
  </div>;
}

export default function DualBanner({ data }) {
  const [left, ...right] = data.blocks;
  return <section className="dual"><BannerBlock block={left} /><div className="dual__right">{right.map((block) => <BannerBlock key={block.id} block={block} />)}</div></section>;
}
