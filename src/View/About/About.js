"use client";

import Link from "next/link";
import { useScrollReveal } from "../../hooks/useScrollReveal";

function RevealSection({ children, className, delay = 0, ...props }) {
  const ref = useScrollReveal();

  return (
    <section
      ref={ref}
      className={`scroll-section scroll-section--fade-up ${className}`}
      style={{ "--delay": `${delay}ms` }}
      {...props}
    >
      {children}
    </section>
  );
}

const VALUES = [
  {
    title: "Soluciones en un solo lugar",
    text: "Reunimos productos de limpieza, librería, escritorio y maquinaria para simplificar las compras de tu organización.",
  },
  {
    title: "Atención a tu medida",
    text: "Escuchamos cada requerimiento y orientamos la cotización según el rubro, el volumen y la necesidad de cada cliente.",
  },
  {
    title: "Cobertura para instituciones",
    text: "Trabajamos pensando en colegios, hoteles, oficinas e industria, con despacho de productos a todo Chile.",
  },
];

const SOLUTIONS = [
  {
    title: "Limpieza profesional",
    text: "Productos para el aseo, la higiene y el mantenimiento cotidiano de espacios institucionales, comerciales e industriales.",
    href: "/cleaning",
    link: "Explorar limpieza",
  },
  {
    title: "Librería",
    text: "Artículos para apoyar las tareas educativas, administrativas y operativas de colegios, empresas y organizaciones.",
    href: "/bookshop",
    link: "Explorar librería",
  },
  {
    title: "Escritorio y oficina",
    text: "Elementos esenciales para mantener puestos de trabajo, áreas administrativas y equipos organizados y abastecidos.",
    href: "/desktop",
    link: "Explorar escritorio",
  },
  {
    title: "Maquinaria y apoyo operativo",
    text: "Alternativas pensadas para complementar labores de limpieza y responder a requerimientos de mayor escala.",
    href: "/cleaning",
    link: "Consultar alternativas",
  },
];

const CLIENTS = ["Colegios", "Hoteles", "Oficinas", "Industria", "Empresas", "Instituciones"];

function BrandMark({ compact = false }) {
  return (
    <div className={`about__brand-mark ${compact ? "about__brand-mark--compact" : ""}`} aria-hidden="true">
      <img src="/brand/mark.png" alt="" width="256" height="256" />
    </div>
  );
}

export default function About() {
  return (
    <div className="about">
      <RevealSection className="about__hero">
        <div className="about__copy">
          <p className="about__eyebrow">Nosotros</p>
          <h1>Todo lo que tu organización necesita para funcionar mejor</h1>
          <p className="about__lede">
            En KleanChile conectamos a empresas e instituciones con soluciones prácticas para
            sus espacios: limpieza profesional, artículos de librería, productos de escritorio
            y maquinaria.
          </p>
          <div className="about__actions">
            <Link className="about__primary" href="/contact">Cotiza con nosotros</Link>
            <Link className="about__secondary" href="/cleaning">Ver productos</Link>
          </div>
        </div>

        <div className="about__mark" aria-hidden="true">
          <BrandMark />
        </div>
      </RevealSection>

      <RevealSection className="about__story" aria-labelledby="about-story-title">
        <div>
          <p className="about__eyebrow">Nuestra forma de trabajar</p>
          <h2 id="about-story-title">Menos vueltas. Mejores soluciones.</h2>
        </div>
        <div className="about__story-copy">
          <p>
            Sabemos que abastecer una institución exige orden, continuidad y respuestas claras.
            Por eso nuestro foco es ayudarte a encontrar lo adecuado sin perder tiempo: un
            catálogo pensado para necesidades reales y una atención cercana para convertir cada
            consulta en una solución concreta.
          </p>
          <p>
            Más que ofrecer productos aislados, buscamos facilitar la compra de insumos que
            forman parte del funcionamiento diario de una organización. Centralizar distintas
            categorías permite cotizar con mayor claridad y tomar decisiones de compra de forma
            más simple.
          </p>
        </div>
      </RevealSection>

      <RevealSection className="about__solutions" aria-labelledby="about-solutions-title">
        <header className="about__section-head">
          <div>
            <p className="about__eyebrow">Qué hacemos</p>
            <h2 id="about-solutions-title">Soluciones para cada espacio de tu organización</h2>
          </div>
          <p>
            Nuestro catálogo reúne categorías complementarias para ayudarte a cubrir distintas
            necesidades con una atención centralizada.
          </p>
        </header>

        <div className="about__solutions-grid">
          {SOLUTIONS.map((solution, index) => (
            <article className="about__solution" key={solution.title}>
              <div className="about__solution-top">
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
              <h3>{solution.title}</h3>
              <p>{solution.text}</p>
              <Link href={solution.href}>{solution.link}</Link>
            </article>
          ))}
        </div>
      </RevealSection>

      <RevealSection className="about__clients" aria-labelledby="about-clients-title">
        <div className="about__clients-copy">
          <p className="about__eyebrow">A quién ayudamos</p>
          <h2 id="about-clients-title">Entendemos necesidades distintas</h2>
          <p>
            Cada rubro tiene su propio ritmo, volumen de consumo y forma de operar. KleanChile
            atiende requerimientos de organizaciones que necesitan abastecer sus espacios de
            manera ordenada, desde compras específicas hasta cotizaciones por volumen.
          </p>
          <p>
            Nuestro objetivo es que encuentres una alternativa adecuada para tu operación y
            cuentes con un canal directo para resolver dudas antes de comprar.
          </p>
        </div>
        <div className="about__client-list" aria-label="Tipos de clientes">
          {CLIENTS.map((client) => (
            <span key={client}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 4 4L19 6" />
              </svg>
              {client}
            </span>
          ))}
        </div>
      </RevealSection>

      <RevealSection className="about__values" aria-label="Lo que nos mueve">
        {VALUES.map((value, index) => (
          <article className="about__value" key={value.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{value.title}</h2>
            <p>{value.text}</p>
          </article>
        ))}
      </RevealSection>

      <RevealSection className="about__commitment" aria-labelledby="about-commitment-title">
        <div className="about__commitment-mark" aria-hidden="true">
          <BrandMark compact />
        </div>
        <div>
          <p className="about__eyebrow">Nuestro compromiso</p>
          <h2 id="about-commitment-title">Hacer que abastecer tu organización sea más simple</h2>
          <p>
            Queremos construir relaciones basadas en una comunicación clara y una atención
            cercana. Por eso ponemos a tu alcance el catálogo, la cotización y el contacto
            directo: para que puedas explicar lo que necesitas y recibir orientación antes de
            tomar una decisión.
          </p>
          <p>
            KleanChile nace para acompañar el funcionamiento diario de empresas e instituciones
            con soluciones útiles, accesibles y alineadas con sus requerimientos reales.
          </p>
        </div>
      </RevealSection>

      <RevealSection className="about__cta">
        <div>
          <p className="about__eyebrow">¿Tienes un requerimiento?</p>
          <h2>Conversemos sobre lo que necesitas</h2>
        </div>
        <Link href="/contact">Contactar a KleanChile</Link>
      </RevealSection>
    </div>
  );
}
