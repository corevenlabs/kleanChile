import Link from "next/link";
import Catalog from "../../components/Catalog/Catalog";
import Picture from "../../components/media/Picture";
import JsonLd from "../../components/seo/JsonLd";
import { collectionPath } from "../../domain/content/links";
import { breadcrumbLd, itemListLd } from "../../domain/seo/structuredData";
import { absoluteUrl } from "../../lib/site";

/**
 * La página de una colección — `/coleccion/temporada-escolar`.
 *
 * Es la página de categoría con otro encabezado: mismo filtro, misma grilla,
 * mismo estado vacío, para que quien llega desde un banner sienta que sigue en
 * la misma tienda. Lo propio es el encabezado, que puede llevar el texto y la
 * imagen que el cliente le puso a la colección.
 */
export default function Collection({ collection, products }) {
  const url = absoluteUrl(collectionPath(collection.slug));
  const trail = [
    { name: "Inicio", url: absoluteUrl("/") },
    { name: collection.name, url },
  ];

  return (
    <div className="catalog">
      <JsonLd data={breadcrumbLd(trail)} />
      {products.length > 0 && (
        <JsonLd
          data={itemListLd({
            name: collection.name,
            url,
            products,
            urlFor: (product) => absoluteUrl(`/product/${String(product.id)}`),
          })}
        />
      )}

      <header className={`catalog__head ${collection.image ? "catalog__head--banner" : ""}`}>
        {collection.image && (
          <div className="catalog__banner">
            <Picture src={collection.image} alt="" sizes="(max-width: 960px) 100vw, 1200px" />
          </div>
        )}
        <div className="catalog__head-text">
          <nav className="catalog__crumbs" aria-label="Ruta">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span>{collection.name}</span>
          </nav>

          <h1 className="catalog__title">{collection.name}</h1>
          {collection.description && <p className="catalog__lead">{collection.description}</p>}

          {products.length > 0 && (
            <p className="catalog__count">
              {products.length === 1 ? "1 producto" : `${String(products.length)} productos`}
            </p>
          )}
        </div>
      </header>

      {products.length === 0 ? (
        <div className="catalog__empty">
          <img src="/brand/mark.png" alt="" className="catalog__empty-mark" width={256} height={256} />
          <h2>Productos no encontrados</h2>
          <p>Esta colección todavía no tiene productos publicados.</p>
          <Link className="catalog__empty-cta" href="/">
            Volver al inicio
          </Link>
        </div>
      ) : (
        <Catalog products={products} linkProducts />
      )}
    </div>
  );
}
