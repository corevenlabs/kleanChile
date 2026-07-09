import './WhyUs.css'

const REASONS = [
  {
    id: 1,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l2.5 6.5L21 9.5l-5 4.5 1.5 7L12 18l-5.5 3 1.5-7L3 9.5l6.5-1z"/>
      </svg>
    ),
    title: 'Calidad garantizada',
    desc: 'Productos certificados y seleccionados para uso profesional y doméstico.',
  },
  {
    id: 2,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
    title: 'Despacho nacional',
    desc: 'Envíos rápidos y seguros a todo Chile con seguimiento.',
  },
  {
    id: 3,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Confianza y respaldo',
    desc: 'Más de 10 años apoyando empresas, colegios y hogares.',
  },
  {
    id: 4,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: 'Atención personalizada',
    desc: 'Asesoría directa para encontrar la mejor solución.',
  },
  {
    id: 5,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    title: 'Precios mayoristas',
    desc: 'Descuentos especiales para empresas e instituciones.',
  },
  {
    id: 6,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 12 20 22 4 22 4 12"/>
        <rect x="2" y="7" width="20" height="5"/>
      </svg>
    ),
    title: 'Amplio catálogo',
    desc: 'Todo lo que necesitas en un solo lugar.',
  },
]

export default function WhyUs() {
  return (
    <section className="why">

      <div className="why__header">
        <p className="why__eyebrow">Por qué elegirnos</p>
        <h2 className="why__title">Soluciones confiables para tu negocio</h2>
        <p className="why__subtitle">
          Una experiencia completa en productos de limpieza, librería y maquinaria industrial.
        </p>
      </div>

      <div className="why__grid">
        {REASONS.map((r) => (
          <div key={r.id} className="why__card">
            <div className="why__icon">
              {r.icon}
            </div>

            <div className="why__content">
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

    </section>
  )
}