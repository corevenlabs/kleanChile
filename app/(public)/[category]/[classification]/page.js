import { notFound } from "next/navigation";
import Category from "../../../../src/View/Category/Category";
import {
  filterByClassification,
  findClassification,
} from "../../../../src/domain/catalog/classification.js";
import { categoryDescription } from "../../../../src/domain/catalog/categoryCopy.js";
import { CATEGORIES, CATEGORY_LABELS } from "../../../../src/domain/content/vocabulary.js";
import { getProductsByCategory } from "../../../../src/infra/db/queries/catalog.js";
import { getContent } from "../../../../src/infra/db/queries/content.js";
import { absoluteUrl } from "../../../../src/lib/site.js";

/**
 * A category narrowed by a navbar dropdown item — `/cleaning/detergentes`.
 *
 * One dynamic route rather than a `[classification]` folder under each of the
 * three category pages: the categories are already a domain constant, and
 * three copies of this file would be three places to forget.
 *
 * `/carrito/x` and `/contact/x` also reach this route, since those segments
 * have no children of their own. That is what the category check is for — an
 * invented category is a 404, while a category with an unknown classification
 * is a real page that reports finding nothing. The difference matters: the
 * first is a URL that was never valid, the second is a shelf that is empty
 * today and may not be tomorrow.
 */

async function load(params) {
  const { category, classification: slug } = await params;
  if (!CATEGORIES.includes(category)) return null;

  const [products, content] = await Promise.all([
    getProductsByCategory(category),
    getContent(),
  ]);

  return {
    category,
    classification: findClassification(content.navigation, `/${category}`, slug),
    products: filterByClassification(products, slug),
  };
}

export async function generateMetadata({ params }) {
  const found = await load(params);
  if (!found) return {};

  const title = `${found.classification.label} en ${CATEGORY_LABELS[found.category]}`;
  const description = categoryDescription(found.category, found.classification);
  const url = absoluteUrl(`/${found.category}/${found.classification.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    /*
     * A classification that matches nothing is a real page for a person who
     * clicked the menu and a thin-content page for a crawler. It stays
     * reachable and stays out of the index — `follow` so the links back into
     * the catalogue are still worth something.
     */
    ...(found.products.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function Page({ params }) {
  const found = await load(params);
  if (!found) notFound();

  return (
    <Category
      category={found.category}
      products={found.products}
      classification={found.classification}
    />
  );
}
