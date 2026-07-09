import { useMemo, useState } from "react";
import "./Desktop.css";

const PRODUCTS = [
  {
    id: 1,
    name: "Monitor 27'' Full HD",
    type: "pantallas",
    price: 189990,
    image: "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=600",
    description: "Monitor de alta resolución ideal para trabajo y diseño."
  },
  {
    id: 2,
    name: "Teclado mecánico RGB",
    type: "periféricos",
    price: 45990,
    image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=600",
    description: "Teclado mecánico para escritura rápida y gaming."
  },
  {
    id: 3,
    name: "Mouse inalámbrico ergonómico",
    type: "periféricos",
    price: 19990,
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600",
    description: "Mouse cómodo para largas jornadas de trabajo."
  },
  {
    id: 4,
    name: "Soporte ajustable para laptop",
    type: "accesorios",
    price: 15990,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600",
    description: "Mejora postura y ventilación del portátil."
  },
  {
    id: 5,
    name: "Silla ergonómica oficina",
    type: "mobiliario",
    price: 129990,
    image: "https://images.unsplash.com/photo-1582582494700-08c0a5c0a0b7?w=600",
    description: "Silla cómoda para largas horas de trabajo."
  },
  {
    id: 6,
    name: "Escritorio minimalista madera",
    type: "mobiliario",
    price: 89990,
    image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=600",
    description: "Escritorio moderno estilo limpio y minimalista."
  },
  {
    id: 7,
    name: "Lámpara LED escritorio",
    type: "iluminación",
    price: 12990,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600",
    description: "Luz ajustable para trabajo nocturno."
  },
  {
    id: 8,
    name: "Hub USB-C múltiple",
    type: "conectividad",
    price: 24990,
    image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600",
    description: "Expande puertos de tu laptop fácilmente."
  },
  {
    id: 9,
    name: "Webcam Full HD",
    type: "video",
    price: 34990,
    image: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600",
    description: "Cámara ideal para videollamadas profesionales."
  },
  {
    id: 10,
    name: "Micrófono USB profesional",
    type: "audio",
    price: 59990,
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600",
    description: "Audio claro para streaming y reuniones."
  },
  {
    id: 11,
    name: "Organizador de cables",
    type: "accesorios",
    price: 7990,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600",
    description: "Mantén tu escritorio limpio y ordenado."
  },
  {
    id: 12,
    name: "Pad mouse XXL",
    type: "accesorios",
    price: 9990,
    image: "https://images.unsplash.com/photo-1612810806695-30f7f8f9d5c7?w=600",
    description: "Superficie amplia para mayor comodidad."
  }
];

export default function Desktop() {
  const [selectedType, setSelectedType] = useState("todos");
  const [sort, setSort] = useState("none");

  const types = ["todos", ...new Set(PRODUCTS.map(p => p.type))];

  const filtered = useMemo(() => {
    let result = [...PRODUCTS];

    if (selectedType !== "todos") {
      result = result.filter(p => p.type === selectedType);
    }

    if (sort === "asc") {
      result.sort((a, b) => a.price - b.price);
    }

    if (sort === "desc") {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [selectedType, sort]);

  return (
   <div className="catalog">

  {/* TOP BAR */}
  <div className="catalog__topbar">

    {/* filtros */}
    <div className="catalog__filters">
      {types.map(t => (
        <button
          key={t}
          className={`chip ${selectedType === t ? "active" : ""}`}
          onClick={() => setSelectedType(t)}
        >
          {t}
        </button>
      ))}
    </div>

    {/* acciones */}
    <div className="catalog__actions">

      <button
        className="sort"
        onClick={() =>
          setSort(prev => (prev === "asc" ? "desc" : "asc"))
        }
      >
        precio {sort === "asc" ? "↑" : "↓"}
      </button>

    </div>

  </div>

  {/* GRID */}
  <div className="catalog__grid">

    {filtered.map(product => (
      <div key={product.id} className="product-card">

        <div className="product-card__inner">

          {/* imagen */}
          <div className="product-card__img">
            <img src={product.image} alt={product.name} />
          </div>

          {/* info */}
          <div className="product-card__info">
            <h3>{product.name}</h3>
            <p>${product.price.toLocaleString("es-CL")}</p>
          </div>

        </div>

      </div>
    ))}

  </div>

</div>
  );
}