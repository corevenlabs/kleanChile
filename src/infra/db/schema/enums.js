import { pgEnum } from "drizzle-orm/pg-core";

/**
 * The three storefront categories, matching the public routes `/cleaning`,
 * `/bookshop` and `/desktop`.
 *
 * An enum rather than free text because the storefront has exactly one page per
 * category — a typo'd fourth value would create products that no page renders.
 */
export const productCategory = pgEnum("product_category", [
  "cleaning",
  "bookshop",
  "desktop",
]);

export const userRole = pgEnum("user_role", ["owner", "staff"]);

/**
 * An order's life.
 *
 * `pending` is a request sent over WhatsApp and not yet answered — it holds no
 * stock. `confirmed` is the shop agreeing to it, and the only transition that
 * moves inventory.
 */
export const orderStatus = pgEnum("order_status", ["pending", "confirmed", "cancelled"]);

/**
 * En qué terminó una fila de una planilla importada.
 *
 * `skipped` existe aparte de `error` a propósito: una fila válida que no cambia
 * nada no es un fallo, y mezclarlas escondería los errores reales dentro de un
 * número grande.
 */
export const importRowStatus = pgEnum("import_row_status", [
  "created",
  "updated",
  "skipped",
  "error",
]);

/** Why a stock level changed. Every movement carries one. */
export const inventoryReason = pgEnum("inventory_reason", [
  "sale",
  "restock",
  "adjustment",
  "cancellation",
]);
