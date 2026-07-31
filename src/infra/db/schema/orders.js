import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { products } from "./catalog.js";
import { orderStatus } from "./enums.js";

/**
 * Orders requested through the storefront.
 *
 * The flow has no payment in it: a customer fills a cart, the site records the
 * order and hands them a pre-written WhatsApp message, and someone at the shop
 * confirms it. Confirmation is the moment stock moves — nothing before it
 * touches inventory, because a request that never arrives on WhatsApp should
 * not hold units off the shelf.
 */

export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1, increment: 1 });

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The reference read aloud over WhatsApp — `KC-0042`. */
    number: text("number").notNull(),

    /**
     * How the customer reaches their own order page.
     *
     * Random rather than the order number, which is sequential and therefore
     * guessable: `/pedido/KC-0043` would let anyone page through everyone's
     * orders.
     */
    lookupToken: text("lookup_token").notNull(),

    status: orderStatus("status").notNull().default("pending"),

    /** Optional — the customer may just send the message without naming themselves. */
    customerName: text("customer_name"),

    /** The sum of the line snapshots, fixed at the moment of the request. */
    totalClp: integer("total_clp").notNull(),

    /** Free-form, for whoever handles the conversation. */
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("orders_number_idx").on(table.number),
    uniqueIndex("orders_lookup_token_idx").on(table.lookupToken),
    index("orders_status_idx").on(table.status, table.createdAt),
    check("orders_total_non_negative", sql`${table.totalClp} >= 0`),
  ],
);

/**
 * A line of an order, as it was at the moment of the request.
 *
 * **These are snapshots.** Name, SKU and unit price are copied rather than
 * joined, so raising a price tomorrow cannot rewrite what someone was quoted
 * today — and deleting a product cannot erase the record of having sold it.
 * `productId` is kept alongside purely so confirmation knows which stock to
 * move, and goes null if the product is ever deleted.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),

    skuCode: text("sku_code"),
    name: text("name").notNull(),
    unitPriceClp: integer("unit_price_clp").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_product_idx").on(table.productId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
