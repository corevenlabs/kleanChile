import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "../client.js";
import { products } from "../schema/index.js";

/**
 * Reading the product catalog.
 *
 * Rows are mapped to a view shape here rather than handed to components raw, so
 * that `image_url` versus `image` is a decision made once, in one file, instead
 * of every component knowing the column names.
 */

export const CATALOG_TAG = "products";

/**
 * Invalidated whenever stock moves or an order is confirmed.
 *
 * Separate from `CATALOG_TAG` because these change on different events: editing
 * a product is an admin action, while stock moves every time an order is
 * confirmed. Best sellers are derived from sales, so a confirmation has to
 * refresh the home page without also discarding the whole catalog's cache.
 */
export const SALES_TAG = "sales";

const toView = (row) => ({
  id: row.id,
  category: row.category,
  skuCode: row.skuCode,
  name: row.name,
  type: row.type,
  /** Integer pesos. `formatClp` in domain/shared/money.js renders it. */
  price: row.priceClp,
  image: row.imageUrl,
  description: row.description,
  specs: row.specs ?? {},
  /** La ficha técnica en PDF, o "" si el producto no tiene una subida. */
  specSheet: row.specSheetUrl ?? "",
  stockOnHand: row.stockOnHand,
  inStock: row.stockOnHand > 0,
});

/** Active products in one category, in admin-chosen order. */
export const getProductsByCategory = unstable_cache(
  async (category) => {
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.category, category), eq(products.isActive, true)))
      .orderBy(asc(products.position), asc(products.id));

    return rows.map(toView);
  },
  ["products-by-category-v2"],
  { tags: [CATALOG_TAG] },
);

/**
 * Every active product, across all three categories, for the search.
 *
 * One cache entry rather than three category reads stitched together: the
 * search does not care which catalogue a product is in, and combining the
 * per-category entries would mean the search seeing a different snapshot than
 * whichever category page was cached most recently.
 *
 * This is the seam to replace when the catalogue outgrows in-memory search —
 * see the note in `domain/catalog/search.js`.
 */
export const getSearchableProducts = unstable_cache(
  async () => {
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(asc(products.category), asc(products.position), asc(products.id));

    return rows.map(toView);
  },
  ["searchable-products-v2"],
  { tags: [CATALOG_TAG] },
);

/**
 * One product by id, or null.
 *
 * Returns inactive products as null rather than 404ing separately: to a
 * customer, a product that has been withdrawn and one that never existed are
 * the same thing, and the page already renders "Producto no encontrado".
 */
export const getProduct = unstable_cache(
  async (id) => {
    if (!Number.isInteger(id)) return null;

    const row = await db.query.products.findFirst({
      where: (table, { and: every, eq: is }) =>
        every(is(table.id, id), is(table.isActive, true)),
    });

    return row ? toView(row) : null;
  },
  ["product-by-id-v2"],
  { tags: [CATALOG_TAG] },
);

/**
 * Every product including hidden ones, for the admin table. Uncached, for the
 * same reason `getBlockForEdit` is.
 */
export async function getAllProducts() {
  const rows = await db
    .select()
    .from(products)
    .orderBy(asc(products.category), asc(products.position), asc(products.id));

  return rows.map((row) => ({ ...toView(row), isActive: row.isActive, position: row.position }));
}

/**
 * The products that actually sell, most first.
 *
 * Ranked by units moved across confirmed orders — not by an editor's pick.
 * That was the point of deriving it: the home page reflects what customers buy
 * rather than what someone remembered to update, and a product that starts
 * selling arrives there on its own.
 *
 * Only confirmed orders count. A pending one is a request nobody has agreed to
 * yet, and letting those rank would let anyone push a product onto the home
 * page by filling a cart.
 *
 * Products with no sales still come back, ordered by the catalog's own
 * position. Otherwise a shop that has not sold anything yet would show an empty
 * band where its best sellers belong.
 */
export const getBestSellers = unstable_cache(
  async (limit = 8) => {
    const rows = await db.execute(sql`
      select p.*, coalesce(sum(
               case when o.status = 'confirmed' then oi.quantity else 0 end
             ), 0)::int as sold
      from ${products} p
      left join order_items oi on oi.product_id = p.id
      left join orders o on o.id = oi.order_id
      where p.is_active
      group by p.id
      order by sold desc, p.position asc, p.id asc
      limit ${limit}
    `);

    return rows.map((row) => ({
      ...toView({
        id: row.id,
        category: row.category,
        skuCode: row.sku_code,
        name: row.name,
        type: row.type,
        priceClp: row.price_clp,
        imageUrl: row.image_url,
        description: row.description,
        specs: row.specs,
        specSheetUrl: row.spec_sheet_url,
        stockOnHand: row.stock_on_hand,
      }),
      unitsSold: Number(row.sold),
    }));
  },
  ["best-sellers-v2"],
  { tags: [CATALOG_TAG, SALES_TAG] },
);
