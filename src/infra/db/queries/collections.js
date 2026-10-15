import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "../client.js";
import { collections, productCollections, products } from "../schema/index.js";
import { CATALOG_TAG, toView } from "./catalog.js";

/**
 * Leer colecciones.
 *
 * Comparten la etiqueta del catálogo en vez de tener una propia: una colección
 * es una vista sobre productos, así que editar un producto (su precio, si está
 * publicado) tiene que refrescar las colecciones donde aparece, y una sola
 * etiqueta es la forma de que nunca se desincronicen.
 */

const toCollection = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  image: row.imageUrl,
  isActive: row.isActive,
});

/** Las colecciones publicadas, con cuántos productos visibles tiene cada una. */
export const getActiveCollections = unstable_cache(
  async () => {
    const rows = await db
      .select({
        collection: collections,
        productCount: sql`count(${products.id}) filter (where ${products.isActive})`.mapWith(Number),
      })
      .from(collections)
      .leftJoin(productCollections, eq(productCollections.collectionId, collections.id))
      .leftJoin(products, eq(products.id, productCollections.productId))
      .where(eq(collections.isActive, true))
      .groupBy(collections.id)
      .orderBy(asc(collections.position), asc(collections.id));

    return rows.map((row) => ({ ...toCollection(row.collection), productCount: row.productCount }));
  },
  ["active-collections-v1"],
  { tags: [CATALOG_TAG] },
);

/**
 * Una colección publicada y sus productos visibles, o null.
 *
 * Los productos salen en el orden del catálogo —categoría y posición—, el mismo
 * que en el resto de la tienda.
 */
export const getCollectionPage = unstable_cache(
  async (slug) => {
    const [row] = await db
      .select()
      .from(collections)
      .where(and(eq(collections.slug, String(slug)), eq(collections.isActive, true)))
      .limit(1);
    if (!row) return null;

    const rows = await db
      .select({ product: products })
      .from(productCollections)
      .innerJoin(products, eq(products.id, productCollections.productId))
      .where(and(eq(productCollections.collectionId, row.id), eq(products.isActive, true)))
      .orderBy(asc(products.category), asc(products.position), asc(products.id));

    return { collection: toCollection(row), products: rows.map((entry) => toView(entry.product)) };
  },
  ["collection-page-v1"],
  { tags: [CATALOG_TAG] },
);

/**
 * Todas las colecciones, ocultas incluidas, con los ids de sus productos. Para
 * el panel; sin caché, como `getAllProducts`.
 */
export async function getAllCollections() {
  const [rows, members] = await Promise.all([
    db.select().from(collections).orderBy(asc(collections.position), asc(collections.id)),
    db.select().from(productCollections),
  ]);

  const byCollection = new Map();
  for (const member of members) {
    const list = byCollection.get(member.collectionId) ?? [];
    list.push(member.productId);
    byCollection.set(member.collectionId, list);
  }

  return rows.map((row) => ({
    ...toCollection(row),
    position: row.position,
    productIds: byCollection.get(row.id) ?? [],
  }));
}

/**
 * Lo mínimo para elegir una colección en un selector de enlaces: nombre y
 * slug, ocultas incluidas — se marcan, pero un banner puede prepararse antes de
 * publicar la colección.
 */
export async function getCollectionOptions() {
  const rows = await db
    .select({ slug: collections.slug, name: collections.name, isActive: collections.isActive })
    .from(collections)
    .orderBy(asc(collections.position), asc(collections.id));
  return rows;
}
