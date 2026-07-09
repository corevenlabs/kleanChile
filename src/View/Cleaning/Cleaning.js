import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "./Cleaning.css";

const PRODUCTS = [
  {
    id: 1,
    name: "Detergente Industrial",
    type: "químico",
    price: 12000,
    image:
      "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600",
    description:
      "Detergente concentrado de alto rendimiento para limpieza profunda en superficies industriales.",
  },
  {
    id: 2,
    name: "Desinfectante Multiuso",
    type: "químico",
    price: 8500,
    image:
      "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600",
    description:
      "Elimina bacterias, virus y hongos en todo tipo de superficies. Ideal para uso doméstico e industrial.",
  },
  {
    id: 3,
    name: "Escoba Profesional",
    type: "herramienta",
    price: 15000,
    image:
      "https://images.unsplash.com/photo-1584824486539-53bb4646bdbc?w=600",
    description:
      "Escoba resistente para uso intensivo en limpieza profesional y grandes superficies.",
  },
  {
    id: 4,
    name: "Mopa Microfibra",
    type: "herramienta",
    price: 18000,
    image:
      "https://images.unsplash.com/photo-1581579185169-0c9b0c0f2b0b?w=600",
    description:
      "Mopa de microfibra de alta absorción que permite limpieza profunda sin químicos.",
  },
  {
    id: 5,
    name: "Aromatizante Industrial",
    type: "químico",
    price: 9900,
    image:
      "https://images.unsplash.com/photo-1610705267928-1b9f5f3f7d6a?w=600",
    description:
      "Aromatizante de larga duración que neutraliza malos olores en espacios grandes.",
  },
  {
    id: 6,
    name: "Guantes de Limpieza",
    type: "protección",
    price: 5000,
    image:
      "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=600",
    description:
      "Guantes resistentes para protección en tareas de limpieza con químicos o agua.",
  },
  {
    id: 7,
    name: "Paños Microfibra",
    type: "herramienta",
    price: 7000,
    image:
      "https://images.unsplash.com/photo-1585421514284-efb74c2b6b9a?w=600",
    description:
      "Paños ultra absorbentes ideales para limpieza de superficies delicadas sin rayar.",
  },
  {
    id: 8,
    name: "Limpiador Vidrios",
    type: "químico",
    price: 11000,
    image:
      "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600",
    description:
      "Fórmula especial para dejar vidrios sin manchas ni residuos.",
  },
  {
    id: 9,
    name: "Carro de Limpieza",
    type: "industrial",
    price: 45000,
    image:
      "https://images.unsplash.com/photo-1581579185169-0c9b0c0f2b0b?w=600",
    description:
      "Carro profesional para transporte de implementos de limpieza en grandes instalaciones.",
  },
  {
    id: 10,
    name: "Aspiradora Industrial",
    type: "industrial",
    price: 120000,
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
    description:
      "Aspiradora de alta potencia para limpieza industrial pesada y continua.",
  },
  {
    id: 11,
    name: "Cepillo Industrial",
    type: "herramienta",
    price: 9000,
    image:
      "https://images.unsplash.com/photo-1584824486539-53bb4646bdbc?w=600",
    description:
      "Cepillo robusto diseñado para suciedad difícil en superficies duras.",
  },
  {
    id: 12,
    name: "Desengrasante Fuerte",
    type: "químico",
    price: 13000,
    image:
      "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600",
    description:
      "Desengrasante de alto poder para eliminar grasa pesada en maquinaria y cocinas.",
  },
];

export default function Cleaning() {
  const [selectedType, setSelectedType] = useState("todos");
  const [sort, setSort] = useState("none");

  const types = ["todos", ...new Set(PRODUCTS.map((p) => p.type))];

  const filtered = useMemo(() => {
    let result = [...PRODUCTS];

    if (selectedType !== "todos") {
      result = result.filter((p) => p.type === selectedType);
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
      {/* TOPBAR */}
      <div className="catalog__topbar">
        {/* filtros */}
        <div className="filters">
          {types.map((t) => (
            <button
              key={t}
              className={`chip ${selectedType === t ? "active" : ""}`}
              onClick={() => setSelectedType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* sort */}
        <button
          className="sort"
          onClick={() =>
            setSort(prev => (prev === "asc" ? "desc" : "asc"))
          }
        >
          precio {sort === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {/* GRID */}
      <div className="catalog__grid">
        {filtered.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="product-link"
          >
            <div className="product-card">
              <div className="product-card__inner">
                <div className="product-card__img">
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="product-card__info">
                  <h3>{product.name}</h3>
                  <p>${product.price.toLocaleString("es-CL")}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}