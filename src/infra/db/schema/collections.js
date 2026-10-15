import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { products } from "./catalog.js";

/**
 * Colecciones: grupos de productos armados a mano.
 *
 * «Temporada escolar», «Rheinvéntate», «Industriales». Una categoría dice qué
 * es un producto y tiene uno solo; una colección dice dónde se lo quiere
 * mostrar, y un producto puede estar en varias. Por eso es una relación aparte
 * y no otra columna en `products`.
 *
 * Se eligió una tabla y no etiquetas de texto en el producto porque la
 * colección tiene identidad propia: un título, un texto y una imagen para su
 * página, y un nombre que se puede corregir sin tocar cada producto.
 */
export const collections = pgTable(
  "collections",
  {
    id: serial("id").primaryKey(),

    /**
     * La dirección: `/coleccion/temporada-escolar`.
     *
     * Se fija al crear y no cambia al renombrar, por la misma razón que un SKU:
     * los botones del banner y los ítems del menú apuntan a ella.
     */
    slug: text("slug").notNull(),

    name: text("name").notNull(),
    description: text("description").notNull().default(""),

    /** Encabezado opcional de la página. Una URL, como toda imagen acá. */
    imageUrl: text("image_url").notNull().default(""),

    /** Oculta = su página da 404, sin perder los productos asignados. */
    isActive: boolean("is_active").notNull().default(true),

    /** Orden en el admin y en el selector de enlaces. */
    position: integer("position").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("collections_slug_idx").on(table.slug)],
);

/**
 * Qué productos hay en cada colección.
 *
 * Borrar un producto o una colección borra sus filas acá: una pertenencia a
 * algo que ya no existe no significa nada.
 */
export const productCollections = pgTable(
  "product_collections",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.productId] }),
    index("product_collections_product_idx").on(table.productId),
  ],
);
