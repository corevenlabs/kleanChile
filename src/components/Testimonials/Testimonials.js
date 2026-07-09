import React, { useState, useEffect } from 'react';
import './Testimonials.css';

const testimonios = [
  {
    id: 1,
    nombre: "María González",
    cargo: "Gerente de Operaciones",
    empresa: "Limpiezas Industriales MG",
    comentario: "Los productos de KleanChile han transformado nuestra limpieza. El desengrasante es el mejor que hemos probado, rendimiento excepcional.",
    fecha: "15 Jun 2026",
  },
  {
    id: 2,
    nombre: "Carlos Rodríguez",
    cargo: "Encargado de Mantención",
    empresa: "Hotel Central",
    comentario: "Excelente servicio y productos de primera calidad. Nuestros pisos nunca habían estado tan limpios. 100% recomendados.",
    fecha: "12 Jun 2026",
  },
  {
    id: 3,
    nombre: "Ana María Pérez",
    cargo: "Dueña",
    empresa: "Cafetería El Buen Sabor",
    comentario: "El lavalozas Excell es maravilloso. Deja los platos impecables y con un aroma fresco. Además, es biodegradable.",
    fecha: "08 Jun 2026",
  },
  {
    id: 4,
    nombre: "Roberto Méndez",
    cargo: "Jefe de Bodega",
    empresa: "Distribuidora Andes",
    comentario: "Llevamos 2 años comprando a KleanChile. Productos consistentes, entregas puntuales y excelente atención al cliente.",
    fecha: "05 Jun 2026",
  },
  {
    id: 5,
    nombre: "Laura Fernández",
    cargo: "Administradora",
    empresa: "Colegio San José",
    comentario: "La limpieza de nuestro colegio mejoró notablemente. Los desinfectantes son seguros para los niños y muy efectivos.",
    fecha: "01 Jun 2026",
  },
  {
    id: 6,
    nombre: "Patricio Silva",
    cargo: "Jefe de Cocina",
    empresa: "Restaurante La Casona",
    comentario: "El desengrasante industrial es increíble. Nuestras cocinas quedan impecables y el aroma a limón es muy agradable.",
    fecha: "28 May 2026",
  },
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => 
        prev + itemsPerView >= testimonios.length ? 0 : prev + itemsPerView
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [itemsPerView, isPaused]);

  const visibleItems = testimonios.slice(currentIndex, currentIndex + itemsPerView);
  const finalItems = visibleItems.length === itemsPerView 
    ? visibleItems 
    : [...visibleItems, ...testimonios.slice(0, itemsPerView - visibleItems.length)];

  const totalPages = Math.ceil(testimonios.length / itemsPerView);
  const currentPage = Math.floor(currentIndex / itemsPerView);

  const goToPage = (page) => {
    setCurrentIndex(page * itemsPerView);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => {
      const newIndex = prev - itemsPerView;
      return newIndex < 0 ? testimonios.length - itemsPerView : newIndex;
    });
  };

  const goToNext = () => {
    setCurrentIndex((prev) => {
      const newIndex = prev + itemsPerView;
      return newIndex >= testimonios.length ? 0 : newIndex;
    });
  };

  return (
    <section 
      className="testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="testimonials__inner">
        <div className="testimonials__header">
          <span className="testimonials__label">testimonios</span>
          <h2 className="testimonials__title">Lo que dicen nuestros clientes</h2>
          <p className="testimonials__subtitle">
            Más de 500 clientes confían en KleanChile para sus soluciones de limpieza
          </p>
        </div>

        <div className="testimonials__slider">
          <button 
            className="testimonials__arrow testimonials__arrow--prev"
            onClick={goToPrev}
            aria-label="Anterior"
          >
            ‹
          </button>

          <div className="testimonials__grid">
            {finalItems.map((testimonio, idx) => (
              <div className="testimonial-card" key={`${testimonio.id}-${idx}`}>
                <div className="testimonial-card__stars">★★★★★</div>
                <p className="testimonial-card__comentario">"{testimonio.comentario}"</p>
                <div className="testimonial-card__footer">
                  <div>
                    <p className="testimonial-card__nombre">{testimonio.nombre}</p>
                    <p className="testimonial-card__cargo">{testimonio.cargo}</p>
                    <p className="testimonial-card__empresa">{testimonio.empresa}</p>
                  </div>
                  <span className="testimonial-card__fecha">{testimonio.fecha}</span>
                </div>
              </div>
            ))}
          </div>

          <button 
            className="testimonials__arrow testimonials__arrow--next"
            onClick={goToNext}
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>

        <div className="testimonials__dots">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              className={`testimonials__dot ${currentPage === idx ? 'active' : ''}`}
              onClick={() => goToPage(idx)}
              aria-label={`Ir a página ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}