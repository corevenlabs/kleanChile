import "./BestSellers.css";
import { NavLink } from "react-router-dom";
import { useRef } from "react";

const products = [
  {
    id: 1,
    name: "Fabuloso Lavanda",
    type: "Limpiador Multiusos · 900ml",
    price: "$2.990",
    badge: "Más vendido",
    image:
      "https://www.tuhogar.com/content/dam/cp-sites/home-care/tu-hogar/latam/productos/fabuloso/fresca-lavanda/product-shot-fresca-lavanda-900ml.jpg",
  },
  {
    id: 2,
    name: "Fabuloso Alternativa Cloro",
    type: "Desinfectante · 900ml",
    price: "$3.290",
    badge: "Oferta",
    image:
      "https://www.tuhogar.com/content/dam/cp-sites/home-care/tu-hogar/latam/productos/fabuloso/alternativa-al-cloro/product-shot-alternativa-al-cloro-900ml.jpg",
  },
  {
    id: 3,
    name: "Fabuloso Pino",
    type: "Limpiador Multiusos · 900ml",
    price: "$2.990",
    badge: null,
    image:
      "https://www.tuhogar.com/content/dam/cp-sites/home-care/tu-hogar/latam/productos/fabuloso/pino/alternativa-al-cloro-pino-900ml.jpg",
  },
  {
    id: 4,
    name: "Fabuloso Manzana",
    type: "Limpiador Multiusos · 900ml",
    price: "$2.990",
    badge: "Nuevo",
    image:
      "https://www.tuhogar.com/content/dam/cp-sites/home-care/tu-hogar/latam/productos/fabuloso/frescura-activa-manzana/product-shot-fabuloso-manzana-900ml.jpg",
  },
  {
    id: 5,
    name: "Fabuloso Bicarbonato",
    type: "Frescura Activa · 900ml",
    price: "$3.490",
    badge: null,
    image:
      "https://www.tuhogar.com/content/dam/cp-sites/home-care/tu-hogar/latam/productos/fabuloso/frescura-activa-con-bicarbonato/thumb-fabuloso-frescura-activa-con-bicarbonato-900ml.jpg",
  },
  {
    id: 6,
    name: "Ajax Bicloro",
    type: "Limpiador en Polvo · 582g",
    price: "$4.190",
    badge: "Oferta",
    image:
      "https://www.tuhogar.com/content/dam/cp-sites/home-care/tu-hogar/latam/productos/ajax/bicloro/thumbnail/ajax-bicloro-582gr-miniatura-desktop-mx.jpg",
  },
  {
    id: 7,
    name: "Axion X-Treme",
    type: "Lavavajillas · 250ml",
    price: "$1.990",
    badge: null,
    image:
      "https://www.tuhogar.com/content/dam/cp-sites/home-care/tu-hogar/latam/productos/axion/x-treme/thumbnail/axion-x-treme-250-ml-product-mx.png",
  },
  {
    id: 8,
    name: "Suavitel Fresca Primavera",
    type: "Suavizante de Ropa · 700ml",
    price: "$3.990",
    badge: "Más vendido",
    image:
      "https://www.tuhogar.com/content/dam/cp-sites/home-care/tu-hogar/latam/productos/suavitel/complete-fresca-primavera1/thumbnail/2024/suavitel-complete-fresca-primavera-700ml.jpg",
  },
];

const badgeColors = {
  "Más vendido": "bs-badge--blue",
  Oferta: "bs-badge--red",
  Nuevo: "bs-badge--green",
};

export default function BestSellers() {
  const trackRef = useRef(null);

  const scroll = (dir) => {
    const track = trackRef.current;
    if (!track) return;

    const card = track.querySelector(".bs__card");
    const width = card ? card.offsetWidth + 20 : 300;

    track.scrollBy({
      left: dir === "left" ? -width : width,
      behavior: "smooth",
    });
  };

  return (
    <section className="bs">
      {/* HEADER */}
      <div className="bs__header">
        <h2 className="bs__title">Productos más vendidos</h2>

        <NavLink to="/cleaning" className="bs__link">
          Ver más productos
        </NavLink>
      </div>

      {/* WRAPPER */}
      <div className="bs__wrapper">
        {/* LEFT */}
        <button
          className="bs__arrow bs__arrow--left"
          onClick={() => scroll("left")}
        >
          ‹
        </button>

        {/* TRACK */}
        <div className="bs__track" ref={trackRef}>
          {products.map((p) => (
            <div key={p.id} className="bs__card">
              <div className="bs__card-img">
                <img src={p.image} alt={p.name} loading="lazy" />
                {p.badge && (
                  <span className={`bs__badge ${badgeColors[p.badge]}`}>
                    {p.badge}
                  </span>
                )}
              </div>

              <div className="bs__card-info">
                <p className="bs__card-name">{p.name}</p>
                <p className="bs__card-type">{p.type}</p>
                <p className="bs__card-price">{p.price}</p>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <button
          className="bs__arrow bs__arrow--right"
          onClick={() => scroll("right")}
        >
          ›
        </button>
      </div>
    </section>
  );
}