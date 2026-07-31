import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { products } from "./catalog.js";
import { inventoryReason } from "./enums.js";
import { orders } from "./orders.js";

/**
 * Every change to a stock level, with its reason.
 *
 * `products.stock_on_hand` is the running balance; this table is the history
 * that explains it. Without it, "I have 3 and expected 5" is unanswerable — and
 * with order confirmations and manual corrections both writing to stock, that
 * question will come up.
 *
 * The deltas for a product must always sum to its `stock_on_hand`. That is the
 * invariant the whole design rests on, and it is why nothing writes the balance
 * directly: a bare `UPDATE products SET stock_on_hand` leaves no row here and
 * quietly breaks it.
 */
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    /** Signed. Negative for a sale, positive for a restock. */
    delta: integer("delta").notNull(),

    /** The balance immediately after, so an audit needs no replay. */
    balanceAfter: integer("balance_after").notNull(),

    reason: inventoryReason("reason").notNull(),
    note: text("note"),

    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_movements_product_idx").on(table.productId, table.createdAt),
    index("inventory_movements_order_idx").on(table.orderId),
  ],
);

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  product: one(products, {
    fields: [inventoryMovements.productId],
    references: [products.id],
  }),
  order: one(orders, { fields: [inventoryMovements.orderId], references: [orders.id] }),
  actor: one(users, { fields: [inventoryMovements.actorId], references: [users.id] }),
}));
