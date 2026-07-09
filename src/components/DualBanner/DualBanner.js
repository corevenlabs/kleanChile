import "./DualBanner.css";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import TextEffect from "../core/TextEffect";

export default function DualBanner() {
  return (
    <section className="dual">

      {/* LIMPIEZA */}
      <div className="dual__block dual__block--left">
        <img
          src="https://images.unsplash.com/photo-1563453392212-326f5e854473?w=900&auto=format&fit=crop&q=80"
          alt="Productos de limpieza"
          className="dual__img"
          loading="lazy"
        />

        <div className="dual__overlay" />

        <div className="dual__content">
          <TextEffect
            className="dual__eyebrow"
            per="char"
            delay={0.1}
          >
            Nueva colección
          </TextEffect>

          <TextEffect
            className="dual__title"
            per="word"
            delay={0.35}
          >
            Productos de Limpieza
          </TextEffect>

          <TextEffect
            className="dual__desc"
            per="word"
            delay={0.65}
          >
            Detergentes, desinfectantes y equipos profesionales para hogar e industria.
          </TextEffect>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            viewport={{ once: true }}
          >
            <NavLink
              to="/cleaning"
              className="dual__btn dual__btn--light"
            >
              Ver productos

              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </NavLink>
          </motion.div>
        </div>
      </div>

      <div className="dual__right">

        {/* ESCOLAR */}

        <div className="dual__block dual__block--top">
          <img
            src="https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=900&auto=format&fit=crop&q=80"
            alt="Material escolar"
            className="dual__img"
            loading="lazy"
          />

          <div className="dual__overlay" />

          <div className="dual__content">
            <TextEffect
              className="dual__eyebrow"
              per="char"
              delay={0.15}
            >
              Temporada escolar
            </TextEffect>

            <TextEffect
              className="dual__title"
              per="word"
              delay={0.35}
            >
              Librería & Útiles
            </TextEffect>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              viewport={{ once: true }}
            >
              <NavLink
                to="/bookshop"
                className="dual__btn dual__btn--light"
              >
                Ver productos

                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </NavLink>
            </motion.div>
          </div>
        </div>

        {/* MAQUINARIA */}

        <div className="dual__block dual__block--bottom">
          <img
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&auto=format&fit=crop&q=80"
            alt="Maquinaria industrial"
            className="dual__img"
            loading="lazy"
          />

          <div className="dual__overlay" />

          <div className="dual__content">
            <TextEffect
              className="dual__eyebrow"
              per="char"
              delay={0.15}
            >
              Equipamiento
            </TextEffect>

            <TextEffect
              className="dual__title"
              per="word"
              delay={0.35}
            >
              Maquinaria Industrial
            </TextEffect>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              viewport={{ once: true }}
            >
              <NavLink
                to="/machinery"
                className="dual__btn dual__btn--light"
              >
                Ver productos

                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </NavLink>
            </motion.div>
          </div>
        </div>

      </div>

    </section>
  );
}