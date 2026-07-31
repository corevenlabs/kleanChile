import Link from "next/link";
import Catalog from "../../components/Catalog/Catalog";
import JsonLd from "../../components/seo/JsonLd";
import { CATEGORY_LABELS } from "../../domain/content/vocabulary";
import { breadcrumbLd, itemListLd } from "../../domain/seo/structuredData";
import { absoluteUrl } from "../../lib/site";

/**
 * One view for all three category pages, filtered or not.
 *
 * `/cleaning` and `/cleaning/detergentes` are the same page asking a narrower
 * question, so they render the same component. `Cleaning.js`, `Bookshop.js`
 * and `Desktop.js` were three identical one-line files that each forwarded to
 * `Catalog`; a fourth for the filtered case would have been the point at which
 * they started drifting.
 *
 * The empty state lives here rather than in `Catalog` because only this level
 * knows what to offer next: "no hay detergentes" is useless without a way back
 * to the products there are.
 */
export default function Category({ category, products, classification = null }) {
  const label = CATEGORY_LABELS[category];
  const heading = classification ? classification.label : label;
  const url = absoluteUrl(classification ? `/${category}/${classification.slug}` : `/${category}`);

  const trail = [
    { name: "Inicio", url: absoluteUrl("/") },
    { name: label, url: absoluteUrl(`/${category}`) },
    ...(classification ? [{ name: classification.label, url }] : []),
  ];

  return (
    <div className="catalog">
      <JsonLd data={breadcrumbLd(trail)} />
      {/* An empty listing is not offered to a crawler as a list of nothing. */}
      {products.length > 0 && (
        <JsonLd
          data={itemListLd({
            name: heading,
            url,
            products,
            urlFor: (product) => absoluteUrl(`/product/${String(product.id)}`),
          })}
        />
      )}

      <header className="catalog__head">
        <nav className="catalog__crumbs" aria-label="Ruta">
          <Link href="/">Inicio</Link>
          <span aria-hidden="true">/</span>
          {classification ? (
            <>
              <Link href={`/${category}`}>{label}</Link>
              <span aria-hidden="true">/</span>
              <span>{classification.label}</span>
            </>
          ) : (
            <span>{label}</span>
          )}
        </nav>

        <h1 className="catalog__title">{heading}</h1>

        {products.length > 0 && (
          <p className="catalog__count">
            {products.length === 1 ? "1 producto" : `${String(products.length)} productos`}
            {classification && <> en {label}</>}
          </p>
        )}
      </header>

      {products.length === 0 ? (
        <div className="catalog__empty">
          <img
            src="/brand/mark.png"
            alt=""
            className="catalog__empty-mark"
            width={256}
            height={256}
          />
          <h2>Productos no encontrados</h2>
          <p>
            {classification ? (
              <>
                No tenemos productos de «{classification.label}» en {label} por ahora.
              </>
            ) : (
              <>Todavía no hay productos publicados en {label}.</>
            )}
          </p>
          {/* The one primary action on this view, so it gets the gradient. */}
          <Link className="catalog__empty-cta" href={classification ? `/${category}` : "/"}>
            {classification ? `Ver todo ${label}` : "Volver al inicio"}
          </Link>
        </div>
      ) : (
        <Catalog products={products} linkProducts />
      )}
    </div>
  );
}
