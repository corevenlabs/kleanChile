import { notFound } from "next/navigation";
import Collection from "../../../../src/View/Collection/Collection";
import { collectionPath } from "../../../../src/domain/content/links.js";
import { getCollectionPage } from "../../../../src/infra/db/queries/collections.js";
import { absoluteUrl } from "../../../../src/lib/site.js";

/**
 * `/coleccion/[slug]` — un grupo de productos armado en el panel.
 *
 * Una colección oculta o inexistente es un 404: a diferencia de una
 * clasificación del menú, acá el conjunto de direcciones válidas es finito y
 * lo decide el panel.
 */
async function load(params) {
  const { slug } = await params;
  return getCollectionPage(decodeURIComponent(slug));
}

export async function generateMetadata({ params }) {
  const found = await load(params);
  if (!found) return {};

  const { collection, products } = found;
  const url = absoluteUrl(collectionPath(collection.slug));
  const description =
    collection.description || `${collection.name}: productos seleccionados de RutaCorp.`;

  return {
    title: collection.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: collection.name,
      description,
      url,
      ...(collection.image ? { images: [collection.image] } : {}),
    },
    // Vacía: correcta para quien llegó desde un banner, delgada para un buscador.
    ...(products.length > 0 ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function Page({ params }) {
  const found = await load(params);
  if (!found) notFound();

  return <Collection collection={found.collection} products={found.products} />;
}
