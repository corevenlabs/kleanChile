import { notFound } from "next/navigation";
import ProductDetail from "../../../../src/View/ProductDetail/ProductDetail";
import { CATEGORY_LABELS } from "../../../../src/domain/content/vocabulary.js";
import { getProduct } from "../../../../src/infra/db/queries/catalog.js";
import { formatClp } from "../../../../src/domain/shared/money.js";
import { absoluteImage, absoluteUrl } from "../../../../src/lib/site.js";

/**
 * Every product page used to share the site's default title and description,
 * which is the same as forty pages telling a search engine they are the same
 * page. The title, the description and the share image now come from the
 * product.
 */

async function load(params) {
  const { id } = await params;
  // A non-numeric id parses to NaN, which the query treats as "no such product".
  return getProduct(Number(id));
}

export async function generateMetadata({ params }) {
  const product = await load(params);
  if (!product) return { title: "Producto no encontrado", robots: { index: false } };

  const url = absoluteUrl(`/product/${String(product.id)}`);
  const image = absoluteImage(product.image);

  /*
   * The description falls back to a written sentence rather than to nothing.
   * Most of the seeded catalogue has no description, and an absent meta
   * description lets the engine quote whatever text is nearest — here, the
   * "Agregar al carrito" button.
   */
  const description = product.description?.trim()
    ? product.description.trim().slice(0, 300)
    : `${product.name} — ${formatClp(product.price)}. ${CATEGORY_LABELS[product.category]} para instituciones, con despacho a todo Chile.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: product.name,
      description,
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function Page({ params }) {
  const product = await load(params);

  /*
   * A real 404, not a page that says "no encontrado" with a 200.
   *
   * The soft version is worse than it looks: a crawler indexes it as a valid
   * page, so a shop that deletes a product accumulates identical "not found"
   * results in search — and the two cases a customer cares about, a withdrawn
   * product and a mistyped URL, are the same answer either way.
   */
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
