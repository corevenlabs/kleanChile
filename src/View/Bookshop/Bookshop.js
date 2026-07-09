import { useMemo, useState } from "react";
import "./Bookshop.css";

const PRODUCTS = [
  {
    id: 1,
    name: "Cuaderno universitario cuadriculado",
    type: "cuaderno",
    price: 2500,
    image: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600",
    description: "Cuaderno de 100 hojas cuadriculadas ideal para estudio y trabajo."
  },
  {
    id: 2,
    name: "Set de lápices grafito HB",
    type: "escritura",
    price: 1800,
    image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600",
    description: "Set de lápices HB para escritura y dibujo técnico."
  },
  {
    id: 3,
    name: "Set de marcadores de colores",
    type: "arte",
    price: 4200,
    image: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=600",
    description: "Marcadores de colores intensos para resaltado y arte."
  },
  {
    id: 4,
    name: "Carpeta archivadora oficio",
    type: "oficina",
    price: 3500,
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600",
    description: "Carpeta resistente para organización de documentos."
  },
  {
    id: 5,
    name: "Notas adhesivas",
    type: "oficina",
    price: 1200,
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600",
    description: "Notas adhesivas para recordatorios diarios."
  },
  {
    id: 6,
    name: "Pluma estilográfica negra",
    type: "escritura",
    price: 8900,
    image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600",
    description: "Pluma elegante para escritura fina."
  },
  {
    id: 7,
    name: "Regla metálica 30cm",
    type: "herramienta",
    price: 1500,
    image: "https://images.unsplash.com/photo-1606326608690-5b0f2c0f9c7e?w=600",
    description: "Regla de metal resistente para uso técnico."
  },
  {
    id: 8,
    name: "Calculadora escolar básica",
    type: "tecnología",
    price: 5200,
    image: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600",
    description: "Calculadora para operaciones básicas."
  },
  {
    id: 9,
    name: "Estuche minimalista",
    type: "accesorios",
    price: 3000,
    image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b1d?w=600",
    description: "Estuche compacto para útiles escolares."
  },
  {
    id: 10,
    name: "Resaltadores neón x4",
    type: "escritura",
    price: 2800,
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600",
    description: "Set de resaltadores de colores brillantes."
  },
  {
    id: 11,
    name: "Tijeras escolares seguras",
    type: "herramienta",
    price: 1700,
    image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600",
    description: "Tijeras diseñadas para uso escolar."
  },
  {
    id: 12,
    name: "Cuaderno premium tapa dura",
    type: "cuaderno",
    price: 4500,
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600",
    description: "Cuaderno elegante con tapa dura."
  }
];

export default function Bookshop() {
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

  {/* TOP BAR MEJOR ESTRUCTURADA */}
  <div className="catalog__topbar">

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

        {/* wrapper clickable */}
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
    ))}

  </div>

</div>
  );
}