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
     * Indexable only if the menu points here and something is on the shelf.
     *
     * Two different pages fail that, for two different reasons:
     *
     * - **Nothing matches.** A real page for whoever clicked the menu, thin
     *   content for a crawler. Eight of the seeded items are in this state.
     * - **The slug is not in the menu.** This route answers anything, so
     *   `/cleaning/cloro`, `/cleaning/limpia` and `/cleaning/a-b-c` are all
     *   200s with products on them. Left indexable, that is an unbounded set of
     *   self-canonical URLs serving overlapping slices of one catalogue —
     *   duplicate content the shop never decided to publish, and crawl budget
     *   spent on pages nobody linked. The menu is the finite, intentional set,
     *   and it is exactly what `app/sitemap.js` submits.
     *
     * `follow` in both cases: the links back into the catalogue still count.
     */
    ...(found.classification.inMenu && found.products.length > 0
      ? {}
      : { robots: { index: false, follow: true } }),
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
