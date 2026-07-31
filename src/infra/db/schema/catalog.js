import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { productCategory } from "./enums.js";

/**
 * Allocates SKU code sequence values.
 *
 * A Postgres sequence rather than `max(sku_code) + 1`, because two products
 * created in the same instant would read the same maximum and collide on
 * `products_sku_code_idx`. A sequence hands out a distinct number per caller
 * without either of them waiting on the other.
 */
export const skuCodeSeq = pgSequence("sku_code_seq", { startWith: 1, increment: 1 });

/**
 * The product catalog.
 *
 * One table for all three categories rather than one per category. The old
 * `catalogs.json` kept three separate arrays that each restarted their ids at
 * 1, which made `/product/1` ambiguous — three different products answered to
 * it and `product-details.json` picked whichever it happened to list. A single
 * serial primary key ends that: an id identifies exactly one product, and the
 * existing `/product/[id]` URLs keep working.
 *
 * **Prices are integer Chilean pesos, not cents.** This is a deliberate
 * departure from the sibling project's "money is always integer cents" rule.
 * CLP is a zero-decimal currency: there is no centavo in circulation, prices
 * are quoted and paid in whole pesos, and `toLocaleString("es-CL")` formats
 * whole pesos. Storing a hundredth of a unit that cannot be transacted would
 * add a multiply-and-divide to every read for no representable value. The
 * invariant that matters — never a float — still holds.
 */
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    category: productCategory("category").notNull(),

    /**
     * The code the customer quotes over WhatsApp — `KC0000427`.
     *
     * Nullable in the column only because the 36 products that predate this
     * were backfilled by a script; every creation path allocates one. See
     * `mutations/skuCodes.js`.
     */
    skuCode: text("sku_code"),

    name: text("name").notNull(),

    /** The filter chip on the category page: "químico", "herramienta", … */
    type: text("type").notNull(),

    priceClp: integer("price_clp").notNull(),

    imageUrl: text("image_url").notNull().default(""),
    description: text("description").notNull().default(""),

    /**
     * The spec sheet rendered on the product page, as label → value.
     *
     * Free-form because it varies by product: a detergent has a concentration
     * and a storage warning, a chair has neither. `ProductDetail` humanises
     * known keys and falls back to title-casing the rest, so a new key needs no
     * migration.
     */
    specs: jsonb("specs").notNull().default({}),

    /**
     * Units on the shelf.
     *
     * **Never written directly.** Every change goes through an
     * `inventory_movements` row so the balance can always be explained — see
     * `mutations/inventory.js`. The check constraint below is the backstop: it
     * rejects a negative balance regardless of what the application believes,
     * which is what stops two confirmations racing over the last unit from
     * both succeeding.
     */
    stockOnHand: integer("stock_on_hand").notNull().default(0),

    /** Hides a product from the storefront without deleting its history. */
    isActive: boolean("is_active").notNull().default(true),

    /** Manual ordering within a category; ties break by id. */
    position: integer("position").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("products_category_idx").on(table.category, table.isActive),
    uniqueIndex("products_sku_code_idx").on(table.skuCode),
    /* A negative price would render as a discount the store cannot honour. */
    check("products_price_non_negative", sql`${table.priceClp} >= 0`),
    /* Selling stock that does not exist is the one thing the ledger must not allow. */
    check("products_stock_non_negative", sql`${table.stockOnHand} >= 0`),
  ],
);
