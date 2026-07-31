import Search from "../../../src/View/Search/Search";
import { searchProducts } from "../../../src/domain/catalog/search.js";
import { getSearchableProducts } from "../../../src/infra/db/queries/catalog.js";

/**
 * `/buscar?q=cloro`
 *
 * A URL rather than client-side state, so a result set can be sent to a
 * colleague, kept in a tab, or reached with the back button. That is also what
 * lets the navbar's box be a plain `<form>` that works before React loads.
 *
 * `noindex, follow`: search result pages are infinite crawl space — every
 * possible query is a URL, and each one is a thin page assembled from products
 * that already have their own. `follow` so the links out to those products
 * still count.
 */
export const metadata = {
  title: "Buscar",
  robots: { index: false, follow: true },
};

export default async function Page({ searchParams }) {
  const { q } = await searchParams;
  // `?q=a&q=b` arrives as an array; take the first rather than rendering
  // "[object Object]" into the heading.
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");

  const products = query.trim() ? searchProducts(await getSearchableProducts(), query) : [];

  return <Search query={query} products={products} />;
}
