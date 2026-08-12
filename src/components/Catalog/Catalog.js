"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Picture from "../media/Picture";
import { formatClp } from "../../domain/shared/money";
import { useScrollReveal } from "../../hooks/useScrollReveal";

function ProductReveal({ children, index }) {
  const ref = useScrollReveal({
    threshold: 0.1,
    rootMargin: "40px 0px -36px 0px",
  });

  return (
    <div
      ref={ref}
      className="product-reveal scroll-section scroll-section--fade-up"
      style={{ "--delay": `${(index % 4) * 55}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * The filter bar and the grid. Rendered inside `View/Category`, which owns the
 * page wrapper, the heading and the case where there is nothing to show.
 *
 * The filters carry a count each. That is the point of the redesign — a row of
 * bare words tells a buyer nothing about where the catalogue actually is, while
 * "Químico 5" tells them whether the filter is worth pressing before they press
 * it. Counts come from the loaded products, so they cannot disagree with the
 * grid — including on a page narrowed by a menu classification, where they
 * count the matches rather than the whole category.
 */

const SORTS = {
  relevance: { label: "Destacados", compare: null },
  priceAsc: { label: "Menor precio", compare: (a, b) => a.price - b.price },
  priceDesc: { label: "Mayor precio", compare: (a, b) => b.price - a.price },
};

// Estas composiciones vienen del proveedor a menos de 160 px y pierden fuerza
// al ampliarse. La corrección es de presentación; no altera logos ni portadas.
const LOW_CONTRAST_SKUS = new Set(["552296", "552313", "552328", "552315"]);

// Types arrive lowercase from the catalogue ("químico"); shown capitalised
// rather than forced lowercase in CSS, which was making them read as filler.
const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export default function Catalog({ products = [], linkProducts = false }) {
  const [selectedType, setSelectedType] = useState("todos");
  const [sort, setSort] = useState("relevance");

  const types = useMemo(() => {
    const counts = new Map();
    for (const product of products) {
      counts.set(product.type, (counts.get(product.type) ?? 0) + 1);
    }
    return [
      { value: "todos", label: "Todos", count: products.length },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, label: titleCase(value), count })),
    ];
  }, [products]);

  const visible = useMemo(() => {
    const result =
      selectedType === "todos"
        ? [...products]
        : products.filter((product) => product.type === selectedType);

    const compare = SORTS[sort].compare;
    if (compare) result.sort(compare);
    return result;
  }, [products, selectedType, sort]);

  return (
    <>
      <div className="catalog__topbar">
        {/* "Todos 2 · Químico 2" is not a choice. A narrowed page often lands on
            a single type, and two pills that select the same two products read
            as a control that does nothing. */}
        <div className="catalog__filters" role="group" aria-label="Filtrar por tipo">
          {types.length > 2 &&
            types.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`chip ${selectedType === type.value ? "chip--active" : ""}`}
                aria-pressed={selectedType === type.value}
                onClick={() => setSelectedType(type.value)}
              >
                {type.label}
                <span className="chip__count">{type.count}</span>
              </button>
            ))}
        </div>

        <label className="catalog__sort">
          <span>Ordenar</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {Object.entries(SORTS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="catalog__grid">
        {visible.map((product, index) => {
          const card = (
            <article className={`product-card ${product.inStock ? "" : "product-card--out"}`}>
              <div className="product-card__img">
                {/* 4 columnas a 1280px, 3 a 1000px, 2 en teléfono — así el
                    navegador baja la rendition del tamaño que va a mostrar y no
                    la más grande que exista. */}
                <Picture
                  src={product.image}
                  alt={product.name}
                  className={
                    LOW_CONTRAST_SKUS.has(product.skuCode)
                      ? "product-card__photo--enhanced"
                      : undefined
                  }
                  sizes="(max-width: 720px) 50vw, (max-width: 1000px) 33vw, 300px"
                />
                {!product.inStock && <span className="product-card__flag">Sin stock</span>}
              </div>
              <div className="product-card__info">
                <p className="product-card__type">{titleCase(product.type)}</p>
                <h3>{product.name}</h3>
                <div className="product-card__foot">
                  <span className="product-card__price">{formatClp(product.price)}</span>
                  {product.skuCode && <span className="k-sku">{product.skuCode}</span>}
                </div>
              </div>
            </article>
          );

          return (
            <ProductReveal key={product.id} index={index}>
              {linkProducts ? (
                <Link href={`/product/${String(product.id)}`} className="product-link">
                  {card}
                </Link>
              ) : (
                card
              )}
            </ProductReveal>
          );
        })}
      </div>
    </>
  );
}
