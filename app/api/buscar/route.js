import { searchProducts } from "../../../src/domain/catalog/search.js";
import { formatClp } from "../../../src/domain/shared/money.js";
import { getSearchableProducts } from "../../../src/infra/db/queries/catalog.js";

/**
 * Type-ahead suggestions for the navbar.
 *
 * The only route handler in the project, and a `GET` rather than a Server
 * Action on purpose: actions are POSTs, and a keystroke-rate POST is neither
 * cacheable nor idempotent. This is a read of public data — the same names and
 * prices the catalogue pages already show.
 *
 * Prices are formatted here rather than in the browser so the client never has
 * to know that CLP is zero-decimal. That rule lives in `domain/shared/money`
 * and has exactly one implementation.
 *
 * Only what a suggestion row draws is returned. Sending whole product rows
 * would put descriptions and stock levels on the wire for every keystroke.
 */

const LIMIT = 6;

export async function GET(request) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  // Below two characters every product matches and the list is noise.
  if (query.trim().length < 2) {
    return Response.json({ results: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const results = searchProducts(await getSearchableProducts(), query, { limit: LIMIT }).map(
    (product) => ({
      id: product.id,
      name: product.name,
      price: formatClp(product.price),
      image: product.image,
      skuCode: product.skuCode,
      inStock: product.inStock,
    }),
  );

  return Response.json(
    { results },
    {
      /*
       * Briefly cacheable. Repeated prefixes are the normal case — every person
       * typing "detergente" issues the same nine requests — and a few seconds
       * absorbs that without anyone seeing a stale price: the catalogue read
       * underneath is still tag-invalidated the moment an admin saves.
       */
      headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" },
    },
  );
}
