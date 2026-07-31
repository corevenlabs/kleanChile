import "server-only";

import { randomBytes } from "node:crypto";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { formatOrderNumber } from "../../../domain/orders/orderNumber.js";
import { err, ok } from "../../../domain/shared/result.js";
import { db } from "../client.js";
import { orderItems, orders, products } from "../schema/index.js";
import { applyMovement } from "./inventory.js";

/**
 * An order's life: requested, then confirmed or cancelled.
 *
 * Placing one moves no stock. The customer has only written a WhatsApp message
 * at that point, and a message that never gets sent should not hold units off
 * the shelf. Confirmation — a person at the shop agreeing to the order — is the
 * single moment inventory changes.
 *
 * The cost of that choice is that two customers can request the last unit and
 * only one confirmation will succeed. That is the right failure: it happens in
 * front of someone who can pick up the phone, rather than silently reserving
 * stock for a request that never arrives.
 */

/**
 * Records a requested order.
 *
 * **Prices are re-read from the database here.** The cart cookie carries
 * product ids and quantities and nothing else; what a line costs is a fact of a
 * row, never something the browser gets to state. The prices then become
 * snapshots on `order_items`, so a later price change cannot rewrite what this
 * customer was quoted.
 */
export async function placeOrder({ items, customerName = null }) {
  if (items.length === 0) return err({ kind: "empty_cart" });

  return db.transaction(async (tx) => {
    const ids = items.map((item) => item.productId);

    const rows = await tx
      .select({
        id: products.id,
        skuCode: products.skuCode,
        name: products.name,
        priceClp: products.priceClp,
        isActive: products.isActive,
      })
      .from(products)
      .where(inArray(products.id, ids));

    const byId = new Map(rows.map((row) => [row.id, row]));

    const lines = [];
    for (const item of items) {
      const product = byId.get(item.productId);
      // A product withdrawn while it sat in someone's cart. Skipped rather
      // than failing the whole order — the rest of the basket is still valid.
      if (!product?.isActive) continue;

      lines.push({
        productId: product.id,
        skuCode: product.skuCode,
        name: product.name,
        unitPriceClp: product.priceClp,
        quantity: item.quantity,
      });
    }

    if (lines.length === 0) return err({ kind: "no_available_items" });

    const [sequence] = await tx.execute(sql`select nextval('order_number_seq') as value`);
    const number = formatOrderNumber(Number(sequence.value));

    const totalClp = lines.reduce((total, line) => total + line.unitPriceClp * line.quantity, 0);

    const [order] = await tx
      .insert(orders)
      .values({
        number,
        lookupToken: randomBytes(24).toString("base64url"),
        customerName,
        totalClp,
      })
      .returning({ id: orders.id, number: orders.number, lookupToken: orders.lookupToken });

    await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));

    return ok({ ...order, totalClp, skipped: items.length - lines.length });
  });
}

/**
 * Confirms an order and takes its units off the shelf.
 *
 * Every product in the order is locked in id order *before* anything is
 * checked or written. Two reasons, both learned the hard way in systems like
 * this one:
 *
 * Consistent lock ordering prevents deadlock — two confirmations sharing two
 * products, each holding what the other wants, otherwise wait for each other
 * until Postgres kills one.
 *
 * Checking every line before applying any movement is what makes the failure
 * clean. Drizzle only rolls a transaction back when the callback *throws*, so
 * a shortfall discovered halfway through a loop and returned as a value would
 * commit the movements already applied — an order half-confirmed, with stock
 * gone and no sale recorded.
 */
export async function confirmOrder({ orderId, actorId }) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, number: orders.number, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");

    if (!order) return err({ kind: "order_not_found" });
    if (order.status === "confirmed") return err({ kind: "already_confirmed" });
    if (order.status === "cancelled") return err({ kind: "cancelled" });

    const items = await tx
      .select({
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        name: orderItems.name,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .orderBy(asc(orderItems.productId));

    // Products deleted since the request leave `product_id` null. The order
    // still stands — its lines are snapshots — but there is no stock to move.
    const movable = items.filter((item) => item.productId !== null);

    if (movable.length > 0) {
      const stock = await tx
        .select({ id: products.id, name: products.name, stockOnHand: products.stockOnHand })
        .from(products)
        .where(inArray(products.id, movable.map((item) => item.productId)))
        .orderBy(asc(products.id))
        .for("update");

      const available = new Map(stock.map((row) => [row.id, row]));

      const shortfalls = movable
        .map((item) => ({ item, row: available.get(item.productId) }))
        .filter(({ item, row }) => !row || row.stockOnHand < item.quantity)
        .map(({ item, row }) => ({
          name: row?.name ?? item.name,
          available: row?.stockOnHand ?? 0,
          requested: item.quantity,
        }));

      if (shortfalls.length > 0) return err({ kind: "insufficient_stock", shortfalls });

      for (const item of movable) {
        await applyMovement(tx, {
          productId: item.productId,
          delta: -item.quantity,
          reason: "sale",
          orderId: order.id,
          actorId,
        });
      }
    }

    await tx
      .update(orders)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(orders.id, order.id));

    return ok({ number: order.number, moved: movable.length });
  });
}

/**
 * Cancels an order, returning stock if it had already been confirmed.
 *
 * A pending order never took anything off the shelf, so cancelling it writes no
 * movement. A confirmed one did, and the units come back with their own ledger
 * row — the balance stays explainable either way.
 */
export async function cancelOrder({ orderId, actorId, note = null }) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, number: orders.number, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");

    if (!order) return err({ kind: "order_not_found" });
    if (order.status === "cancelled") return err({ kind: "already_cancelled" });

    if (order.status === "confirmed") {
      const items = await tx
        .select({ productId: orderItems.productId, quantity: orderItems.quantity })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))
        .orderBy(asc(orderItems.productId));

      for (const item of items) {
        if (item.productId === null) continue;

        await applyMovement(tx, {
          productId: item.productId,
          delta: item.quantity,
          reason: "cancellation",
          note,
          orderId: order.id,
          actorId,
        });
      }
    }

    await tx
      .update(orders)
      .set({ status: "cancelled", cancelledAt: new Date(), notes: note })
      .where(eq(orders.id, order.id));

    return ok({ number: order.number });
  });
}
