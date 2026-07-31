import "server-only";

import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { products } from "../schema/index.js";

/** Creating, editing and withdrawing catalog products. */

export async function createProduct(input) {
  const [row] = await db.insert(products).values(input).returning({ id: products.id });
  return row.id;
}

export async function updateProduct(id, input) {
  await db
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(products.id, id));
}

/**
 * Hides a product from the storefront without deleting it.
 *
 * The gentler of the two removals, and the one the admin table offers first:
 * an id that has been linked or printed keeps resolving, and the row can come
 * back when the product does.
 */
export async function setProductActive(id, isActive) {
  await db
    .update(products)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(products.id, id));
}

export async function deleteProduct(id) {
  await db.delete(products).where(eq(products.id, id));
}
