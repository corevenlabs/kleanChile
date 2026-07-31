import "server-only";

import { eq, sql } from "drizzle-orm";
import { err, ok } from "../../../domain/shared/result.js";
import { db } from "../client.js";
import { inventoryMovements, products } from "../schema/index.js";

/**
 * Moving stock.
 *
 * The single door to `products.stock_on_hand`. Everything that changes a stock
 * level comes through here so that the balance and the ledger cannot disagree —
 * they are written in the same statement, over a locked row.
 *
 * `SELECT … FOR UPDATE` before reading the balance is what makes concurrent
 * confirmations safe: the second one waits for the first to commit and then
 * reads the balance it actually left behind, rather than the one it saw before.
 * Without the lock, two confirmations of the last unit both read 1, both write
 * 0, and one unit is sold twice.
 */

export async function applyMovement(tx, { productId, delta, reason, note = null, orderId = null, actorId = null }) {
  const [current] = await tx
    .select({ stockOnHand: products.stockOnHand, name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .for("update");

  if (!current) return err({ kind: "product_not_found", productId });

  const balanceAfter = current.stockOnHand + delta;

  // Checked here so the caller gets a usable message naming the product. The
  // check constraint on the column is still the authority — this is the
  // friendly version of the same rule, not a replacement for it.
  if (balanceAfter < 0) {
    return err({
      kind: "insufficient_stock",
      productId,
      name: current.name,
      available: current.stockOnHand,
      requested: -delta,
    });
  }

  await tx.update(products).set({ stockOnHand: balanceAfter, updatedAt: new Date() }).where(eq(products.id, productId));

  await tx.insert(inventoryMovements).values({
    productId,
    delta,
    balanceAfter,
    reason,
    note,
    orderId,
    actorId,
  });

  return ok({ balanceAfter });
}

/**
 * A manual correction from the admin.
 *
 * Takes the level the person counted, not a delta, because that is what they
 * are holding — a shelf with 7 boxes on it. The delta is derived, so the ledger
 * still records the movement that got there.
 */
export async function setStockLevel({ productId, newLevel, note, actorId }) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ stockOnHand: products.stockOnHand })
      .from(products)
      .where(eq(products.id, productId))
      .for("update");

    if (!current) return err({ kind: "product_not_found", productId });

    const delta = newLevel - current.stockOnHand;
    if (delta === 0) return ok({ balanceAfter: newLevel });

    return applyMovement(tx, {
      productId,
      delta,
      reason: delta > 0 ? "restock" : "adjustment",
      note,
      actorId,
    });
  });
}

/** The recent history for one product, newest first. */
export async function readMovements(productId, limit = 20) {
  return db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.productId, productId))
    .orderBy(sql`${inventoryMovements.createdAt} desc`)
    .limit(limit);
}
