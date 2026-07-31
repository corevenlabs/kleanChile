import Link from "next/link";
import AddToCartForm from "../../components/cart/AddToCartForm";
import JsonLd from "../../components/seo/JsonLd";
import { CATEGORY_LABELS } from "../../domain/content/vocabulary";
import { breadcrumbLd, productLd } from "../../domain/seo/structuredData";
import { formatClp } from "../../domain/shared/money";
import { absoluteImage, absoluteUrl } from "../../lib/site";

const labels = {
  marca: "Marca", advertencias_almacenamiento: "Advertencias de Almacenamiento", advertencias_uso: "Advertencias de Uso",
  beneficios_uso: "Beneficios de Uso", contenido_neto: "Contenido Neto", denominacion_variedad: "Denominación/Variedad",
  modo_uso: "Modo de Uso", tipo_producto: "Tipo de Producto", concentrado: "Concentrado",
  unidades_por_paquete: "Unidades por Paquete", estado_producto: "Estado de Producto", formato: "Formato",
  presentacion_empaque: "Presentación/Empaque",
};
const formatKey = (key) => labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/** The route 404s on a missing product, so this always has one. */
export default function ProductDetail({ product }) {
  // Specs are free-form and admin-editable, so a product may legitimately have
  // none — an empty table with a download button would look broken.
  const specs = Object.entries(product.specs ?? {});

  const url = absoluteUrl(`/product/${String(product.id)}`);
  const categoryLabel = CATEGORY_LABELS[product.category];

  /*
   * The trail said "Inicio / Producto" — a dead word where the category
   * belonged. Naming the category and linking it gives a customer who arrived
   * from a search the way back into the catalogue, and gives a crawler the
   * relationship between the two pages.
   */
  const trail = [
    { name: "Inicio", url: absoluteUrl("/") },
    { name: categoryLabel, url: absoluteUrl(`/${product.category}`) },
    { name: product.name, url },
  ];

  return <div className="product-page">
    <JsonLd data={productLd({ product, url, image: absoluteImage(product.image), brand: product.specs?.marca })} />
    <JsonLd data={breadcrumbLd(trail)} />
    <nav className="breadcrumb" aria-label="Ruta"><Link href="/">Inicio</Link> / <Link href={`/${product.category}`}>{categoryLabel}</Link> / <span>{product.name}</span></nav><div className="product-layout">
    <div className="product-image-box"><div className="product-image-wrapper"><img src={product.image} alt={product.name} /></div></div>
    <div className="product-info">{product.skuCode && <p className="quickview__sku">SKU {product.skuCode}</p>}<h1>{product.name}</h1><div className="price">{formatClp(product.price)}</div><div className="description-section"><p className="description">{product.description}</p></div>
      <AddToCartForm productId={product.id} inStock={product.inStock} stockOnHand={product.stockOnHand} />
      {specs.length > 0 &&<div className="specs-section"><div className="specs-header"><h3>Especificaciones</h3><button className="download-btn">📄 Descargar ficha técnica</button></div><div className="specs-grid">{specs.map(([key, value]) => <div className="specs-row" key={key}><span className="specs-key">{formatKey(key)}</span><span className="specs-value">{value}</span></div>)}</div></div>}
    </div>
  </div></div>;
}
