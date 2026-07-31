import "server-only";

import { inArray } from "drizzle-orm";
import { db } from "../client.js";
import { products } from "../schema/index.js";

/**
 * Turns the cookie's ids and quantities into displayable lines.
 *
 * Not cached. A cart is one person's, read once per page they look at, and
 * caching it by cookie contents would mean a cache entry per distinct basket —
 * all cost, no reuse.
 *
 * Lines whose product has since been withdrawn are dropped and reported
 * separately, so the cart page can say so rather than silently shrinking.
 */
export async function resolveCartLines(items) {
  if (items.length === 0) return { lines: [], dropped: [] };

  const rows = await db
    .select({
      id: products.id,
      skuCode: products.skuCode,
      name: products.name,
      priceClp: products.priceClp,
      imageUrl: products.imageUrl,
      stockOnHand: products.stockOnHand,
      isActive: products.isActive,
      category: products.category,
    })
    .from(products)
    .where(inArray(products.id, items.map((item) => item.productId)));

  const byId = new Map(rows.map((row) => [row.id, row]));

  const lines = [];
  const dropped = [];

  // Iterated over the cookie, not the rows, so the order the customer added
  // things in survives — a basket that reshuffles itself on every render looks
  // broken.
  for (const item of items) {
    const product = byId.get(item.productId);

    if (!product?.isActive) {
      dropped.push({ productId: item.productId, name: product?.name ?? null });
      continue;
    }

    lines.push({
      productId: product.id,
      skuCode: product.skuCode,
      name: product.name,
      unitPrice: product.priceClp,
      image: product.imageUrl,
      quantity: item.quantity,
      stockOnHand: product.stockOnHand,
      /** Flagged rather than clamped: the shop may still agree to backorder it. */
      exceedsStock: item.quantity > product.stockOnHand,
    });
  }

  return { lines, dropped };
}
