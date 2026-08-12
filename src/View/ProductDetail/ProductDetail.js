import Link from "next/link";
import AddToCartForm from "../../components/cart/AddToCartForm";
import JsonLd from "../../components/seo/JsonLd";
import Picture from "../../components/media/Picture";
import { specEntries } from "../../domain/catalog/specLabels";
import { CATEGORY_LABELS } from "../../domain/content/vocabulary";
import { breadcrumbLd, productLd } from "../../domain/seo/structuredData";
import { formatPrice, isPriceOnRequest } from "../../domain/shared/pricing";
import { documentNameFromUrl } from "../../infra/storage/documentKeys";
import { absoluteImage, absoluteUrl } from "../../lib/site";

/** The route 404s on a missing product, so this always has one. */
export default function ProductDetail({ product }) {
  // Specs are free-form and admin-editable, so a product may legitimately have
  // none — an empty table with a download button would look broken.
  const specs = specEntries(product.specs);

  const url = absoluteUrl(`/product/${String(product.id)}`);
  const categoryLabel = CATEGORY_LABELS[product.category];

  /*
   * La ficha técnica tiene dos formas y una sola sección.
   *
   * Si el admin subió un PDF, ese documento **reemplaza** la tabla: es la ficha
   * oficial del fabricante, y mostrar las dos invita a compararlas y a encontrar
   * que no dicen exactamente lo mismo. Si no lo hay, se muestra la tabla y el
   * botón entrega un PDF generado desde ella al vuelo.
   *
   * `product.specs` se sigue guardando en los dos casos —alimenta el `brand` de
   * los datos estructurados de más abajo— así que quitar el PDF devuelve la
   * tabla a la vista sin que nadie haya tenido que volver a escribirla.
   */
  const sheetName = documentNameFromUrl(product.specSheet);

  /*
   * Sin precio publicado se vende igual.
   *
   * La única diferencia es lo que dice el número: el botón, el stock y el
   * pedido completo funcionan idénticos, porque lo que falta es el monto y no
   * la disponibilidad. Un producto que hay en bodega y no se puede pedir sería
   * una vitrina que manda al cliente a buscar el teléfono por su cuenta.
   */
  const priceOnRequest = isPriceOnRequest(product.price);

  return <div className="product-page">
    <JsonLd data={productLd({ product, url, image: absoluteImage(product.image), brand: product.specs?.marca })} />
    <JsonLd data={breadcrumbLd(trailOf(product, categoryLabel, url))} />
    <nav className="breadcrumb" aria-label="Ruta"><Link href="/">Inicio</Link> / <Link href={`/${product.category}`}>{categoryLabel}</Link> / <span>{product.name}</span></nav><div className="product-layout">
    {/* La imagen principal de la página: `priority` para que no espere detrás de
        la heurística de carga diferida. */}
    <div className="product-image-box"><div className="product-image-wrapper"><Picture src={product.image} alt={product.name} sizes="(max-width: 900px) 100vw, 520px" priority /></div></div>
    <div className="product-info">{product.skuCode && <p className="quickview__sku">SKU {product.skuCode}</p>}<h1>{product.name}</h1><div className={`price ${priceOnRequest ? "price--ask" : ""}`}>{formatPrice(product.price)}</div>{priceOnRequest && <p className="price-ask-note">Este producto se cotiza. Agrégalo al carrito y te confirmamos el precio por WhatsApp.</p>}<div className="description-section"><p className="description">{product.description}</p></div>
      <AddToCartForm productId={product.id} inStock={product.inStock} stockOnHand={product.stockOnHand} />

      {product.specSheet ? (
        <div className="specs-section">
          <div className="specs-header"><h3>Especificaciones</h3></div>
          {/*
            Una tarjeta con un enlace, no un visor incrustado. Un PDF dentro de
            un <object> en iOS Safari muestra la primera página y no scrollea, y
            este catálogo se mira sobre todo desde el teléfono.
          */}
          <a className="spec-sheet" href={product.specSheet} target="_blank" rel="noreferrer" download>
            <span className="spec-sheet__badge" aria-hidden="true">PDF</span>
            <span className="spec-sheet__text">
              <strong>Ficha técnica</strong>
              {sheetName && <small>{sheetName}</small>}
            </span>
            <span className="spec-sheet__cta">Descargar</span>
          </a>
        </div>
      ) : specs.length > 0 && (
        <div className="specs-section">
          <div className="specs-header">
            <h3>Especificaciones</h3>
            {/*
              Un enlace y no un <button>: durante mucho tiempo esto fue un botón
              sin handler, que es la peor versión de las dos — parece que hace
              algo. Ahora apunta a la ruta que arma el PDF desde esta misma
              tabla, así que lo que se descarga no puede diferir de lo que se ve.
            */}
            <a className="download-btn" href={`/product/${String(product.id)}/ficha-tecnica`}>
              📄 Descargar ficha técnica
            </a>
          </div>
          <div className="specs-grid">{specs.map(([label, value]) => <div className="specs-row" key={label}><span className="specs-key">{label}</span><span className="specs-value">{value}</span></div>)}</div>
        </div>
      )}
    </div>
  </div></div>;
}

/*
 * The trail said "Inicio / Producto" — a dead word where the category belonged.
 * Naming the category and linking it gives a customer who arrived from a search
 * the way back into the catalogue, and gives a crawler the relationship between
 * the two pages.
 */
function trailOf(product, categoryLabel, url) {
  return [
    { name: "Inicio", url: absoluteUrl("/") },
    { name: categoryLabel, url: absoluteUrl(`/${product.category}`) },
    { name: product.name, url },
  ];
}
