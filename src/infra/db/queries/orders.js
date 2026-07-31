import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "../client.js";
import { orderItems, orders } from "../schema/index.js";

/** Reading orders, for the customer's own page and for the admin. */

const toLine = (item) => ({
  productId: item.productId,
  skuCode: item.skuCode,
  name: item.name,
  unitPrice: item.unitPriceClp,
  quantity: item.quantity,
});

/**
 * The customer's view of their order, by the random token in its URL.
 *
 * By token and never by order number: the number is sequential, so addressing
 * the page by it would let anyone walk through every order the shop has taken.
 */
export async function getOrderByToken(token) {
  if (!token) return null;

  const order = await db.query.orders.findFirst({
    where: eq(orders.lookupToken, token),
    with: { items: true },
  });

  if (!order) return null;

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    customerName: order.customerName,
    total: order.totalClp,
    createdAt: order.createdAt,
    lines: order.items.map(toLine),
  };
}

/** The admin list, newest first. */
export async function getOrders({ status = null, limit = 100 } = {}) {
  const rows = await db.query.orders.findMany({
    where: status ? eq(orders.status, status) : undefined,
    orderBy: desc(orders.createdAt),
    limit,
    with: { items: true },
  });

  return rows.map((order) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    customerName: order.customerName,
    total: order.totalClp,
    notes: order.notes,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
    lines: order.items.map(toLine),
  }));
}

/** How many orders are waiting on someone, for the dashboard. */
export async function countPendingOrders() {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.status, "pending"));

  return rows.length;
}

export async function getOrderItems(orderId) {
  const rows = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return rows.map(toLine);
}
