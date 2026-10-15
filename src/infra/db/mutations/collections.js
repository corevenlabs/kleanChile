import "server-only";

import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../client.js";
import { collections, productCollections, products } from "../schema/index.js";

/** Crear, editar y borrar colecciones, y decidir qué productos tienen. */

/**
 * Crea la colección y le asigna sus productos en una transacción: una
 * colección que se creó pero cuyos productos no se guardaron sería una página
 * vacía que la persona cree haber llenado.
 */
export async function createCollection(input, productIds) {
  return db.transaction(async (tx) => {
    const [{ max }] = await tx
      .select({ max: sql`coalesce(max(${collections.position}), 0)`.mapWith(Number) })
      .from(collections);

    const [row] = await tx
      .insert(collections)
      .values({ ...input, position: max + 1 })
      .returning({ id: collections.id });

    await replaceMembers(tx, row.id, productIds);
    return row.id;
  });
}

/** El slug no se toca al editar — ver la nota en el esquema. */
export async function updateCollection(id, input, productIds) {
  await db.transaction(async (tx) => {
    await tx
      .update(collections)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(collections.id, id));
    await replaceMembers(tx, id, productIds);
  });
}

export async function deleteCollection(id) {
  await db.delete(collections).where(eq(collections.id, id));
}

/** Intercambia la posición con la vecina, para las flechas del panel. */
export async function moveCollection(id, direction) {
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: collections.id, position: collections.position })
      .from(collections)
      .orderBy(collections.position, collections.id);

    const index = rows.findIndex((row) => row.id === id);
    const other = rows[index + (direction < 0 ? -1 : 1)];
    if (index === -1 || !other) return;

    // Se renumera todo para que dos posiciones iguales no dejen la flecha
    // sin efecto — el caso de colecciones creadas antes de que hubiera orden.
    const order = rows.map((row) => row.id);
    [order[index], order[index + (direction < 0 ? -1 : 1)]] = [other.id, id];
    for (const [position, rowId] of order.entries()) {
      await tx.update(collections).set({ position: position + 1 }).where(eq(collections.id, rowId));
    }
  });
}

/**
 * Las colecciones de un producto, desde su editor. Reemplaza el conjunto
 * completo: lo que no viene marcado sale.
 */
export async function setProductCollections(productId, collectionIds) {
  await db.transaction(async (tx) => {
    await tx
      .delete(productCollections)
      .where(
        collectionIds.length > 0
          ? and(
              eq(productCollections.productId, productId),
              notInArray(productCollections.collectionId, collectionIds),
            )
          : eq(productCollections.productId, productId),
      );

    if (collectionIds.length > 0) {
      await tx
        .insert(productCollections)
        .values(collectionIds.map((collectionId) => ({ collectionId, productId })))
        .onConflictDoNothing();
    }
  });
}

/**
 * Deja la colección con exactamente estos productos.
 *
 * Los ids se filtran contra la tabla de productos antes de insertar: vienen del
 * navegador, y un id que ya no existe haría fallar la clave foránea con un
 * error que nadie sabría leer.
 */
async function replaceMembers(tx, collectionId, productIds) {
  await tx.delete(productCollections).where(eq(productCollections.collectionId, collectionId));
  if (productIds.length === 0) return;

  const existing = await tx
    .select({ id: products.id })
    .from(products)
    .where(inArray(products.id, productIds));

  if (existing.length > 0) {
    await tx
      .insert(productCollections)
      .values(existing.map((row) => ({ collectionId, productId: row.id })));
  }
}
