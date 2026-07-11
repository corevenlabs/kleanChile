import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function Catalog({ products = [], linkProducts = false }) {
  const [selectedType, setSelectedType] = useState("todos");
  const [sort, setSort] = useState("none");
  const types = useMemo(() => ["todos", ...new Set(products.map(({ type }) => type))], [products]);
  const filtered = useMemo(() => {
    const result = selectedType === "todos"
      ? [...products]
      : products.filter(({ type }) => type === selectedType);
    if (sort !== "none") result.sort((a, b) => sort === "asc" ? a.price - b.price : b.price - a.price);
    return result;
  }, [products, selectedType, sort]);

  return (
    <div className="catalog">
      <div className="catalog__topbar">
        <div className="catalog__filters filters">
          {types.map((type) => (
            <button key={type} className={`chip ${selectedType === type ? "active" : ""}`} onClick={() => setSelectedType(type)}>{type}</button>
          ))}
        </div>
        <div className="catalog__actions">
          <button className="sort" onClick={() => setSort((value) => value === "asc" ? "desc" : "asc")}>precio {sort === "asc" ? "↑" : "↓"}</button>
        </div>
      </div>
      <div className="catalog__grid">
        {filtered.map((product) => {
          const card = <div className="product-card"><div className="product-card__inner"><div className="product-card__img"><img src={product.image} alt={product.name} /></div><div className="product-card__info"><h3>{product.name}</h3><p>${product.price.toLocaleString("es-CL")}</p></div></div></div>;
          return linkProducts ? <Link key={product.id} to={`/product/${product.id}`} className="product-link">{card}</Link> : <div key={product.id}>{card}</div>;
        })}
      </div>
    </div>
  );
}
