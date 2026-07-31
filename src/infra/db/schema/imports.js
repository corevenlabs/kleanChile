import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { products } from "./catalog.js";
import { importRowStatus } from "./enums.js";

/**
 * Cargas masivas de catálogo.
 *
 * Se guarda cada archivo procesado y cada una de sus filas. No es contabilidad
 * de más: cuando alguien pregunte «¿por qué este producto quedó a $13.500?», la
 * respuesta es una fila de una planilla concreta, subida por una persona
 * concreta, a una hora concreta. Sin este registro la única respuesta posible
 * es «alguien lo importó».
 */

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    fileName: text("file_name").notNull(),

    /**
     * El mapeo de columnas usado, por ejemplo
     * `{ "Codigo": "sku", "Valor Neto": "price" }`.
     *
     * Se guarda por lote y no solo como preferencia global, porque si mañana se
     * cambia el mapeo, el lote viejo tiene que seguir siendo interpretable.
     */
    columnMapping: jsonb("column_mapping").notNull(),

    totalRows: integer("total_rows").notNull().default(0),
    createdRows: integer("created_rows").notNull().default(0),
    updatedRows: integer("updated_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),

    uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("import_batches_created_idx").on(table.createdAt)],
);

/**
 * Una fila de la planilla y en qué terminó.
 *
 * Se conserva el valor anterior de cada campo tocado, así el historial explica
 * el cambio sin tener que reconstruirlo desde el archivo original — que para
 * entonces probablemente ya no exista.
 */
export const importRows = pgTable(
  "import_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),

    /** Base 1, igual que lo ve la persona en Excel. */
    rowNumber: integer("row_number").notNull(),

    status: importRowStatus("status").notNull(),
    message: text("message"),

    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    skuCode: text("sku_code"),

    /** Los campos que la fila pidió cambiar, y lo que había antes. */
    changes: jsonb("changes").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("import_rows_batch_idx").on(table.batchId),
    index("import_rows_status_idx").on(table.batchId, table.status),
  ],
);

export const importBatchesRelations = relations(importBatches, ({ one, many }) => ({
  uploadedBy: one(users, { fields: [importBatches.uploadedById], references: [users.id] }),
  rows: many(importRows),
}));

export const importRowsRelations = relations(importRows, ({ one }) => ({
  batch: one(importBatches, { fields: [importRows.batchId], references: [importBatches.id] }),
  product: one(products, { fields: [importRows.productId], references: [products.id] }),
}));
