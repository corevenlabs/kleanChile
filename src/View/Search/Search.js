import Link from "next/link";
import Catalog from "../../components/Catalog/Catalog";
import { CATEGORIES, CATEGORY_LABELS } from "../../domain/content/vocabulary";

/**
 * Search results.
 *
 * Reuses `Catalog` rather than growing a second grid: a result is a product,
 * and two components drawing product cards is how they start disagreeing about
 * what a price looks like.
 *
 * The default sort ("Destacados") applies no comparator, so the ranking from
 * `searchProducts` survives — the person can still re-sort by price, which
 * discards the ranking on purpose because at that point they have said what
 * they care about.
 */

function Suggestions({ title }) {
  return (
    <div className="search-suggest">
      <p>{title}</p>
      <div className="search-suggest__links">
        {CATEGORIES.map((category) => (
          <Link key={category} href={`/${category}`} className="chip">
            {CATEGORY_LABELS[category]}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Search({ query, products }) {
  const asked = query.trim().length > 0;

  return (
    <div className="catalog">
      <header className="catalog__head">
        <nav className="catalog__crumbs" aria-label="Ruta">
          <Link href="/">Inicio</Link>
          <span aria-hidden="true">/</span>
          <span>Buscar</span>
        </nav>

        <h1 className="catalog__title">
          {asked ? <>Resultados para «{query.trim()}»</> : "Buscar productos"}
        </h1>

        {asked && products.length > 0 && (
          <p className="catalog__count">
            {products.length === 1 ? "1 producto" : `${String(products.length)} productos`}
          </p>
        )}
      </header>

      {/*
        Announced, not just rendered. Someone who submitted the search from the
        navbar may still have focus there; without a live region the page
        changes under them silently.
      */}
      <p className="sr-only" role="status">
        {asked
          ? `${String(products.length)} resultados para ${query.trim()}`
          : "Escribe qué producto buscas"}
      </p>

      {!asked ? (
        <div className="catalog__empty">
          <img src="/brand/mark.png" alt="" className="catalog__empty-mark" width={256} height={256} />
          <h2>¿Qué estás buscando?</h2>
          <p>
            Busca por nombre, marca o código SKU — el mismo código que aparece en tu pedido de
            WhatsApp.
          </p>
          <Suggestions title="O explora el catálogo:" />
        </div>
      ) : products.length === 0 ? (
        <div className="catalog__empty">
          <img src="/brand/mark.png" alt="" className="catalog__empty-mark" width={256} height={256} />
          <h2>Productos no encontrados</h2>
          <p>
            No encontramos nada para «{query.trim()}». Prueba con una palabra más corta o revisa el
            código.
          </p>
          <Suggestions title="También puedes explorar:" />
        </div>
      ) : (
        <Catalog products={products} linkProducts />
      )}
    </div>
  );
}
