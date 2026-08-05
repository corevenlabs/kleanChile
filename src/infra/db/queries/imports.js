import "server-only";

import { desc, eq } from "drizzle-orm";
import { normalizeHeader } from "../../../domain/import/columnMapping.js";
import { db } from "../client.js";
import { importBatches, importRows, products } from "../schema/index.js";

/** Lecturas del importador. */

/**
 * El catálogo actual, indexado por SKU.
 *
 * Lo consume el planificador, que es puro: recibe esta foto y nunca consulta la
 * base por su cuenta. Se trae el catálogo entero de una vez en lugar de una
 * consulta por fila — son cientos de productos, y quinientas consultas para
 * previsualizar un archivo es la clase de cosa que hace lento un importador.
 */
export async function snapshotBySku() {
  const rows = await db
    .select({
      id: products.id,
      skuCode: products.skuCode,
      name: products.name,
      category: products.category,
      type: products.type,
      priceClp: products.priceClp,
      description: products.description,
      imageUrl: products.imageUrl,
      specSheetUrl: products.specSheetUrl,
      isActive: products.isActive,
      stockOnHand: products.stockOnHand,
    })
    .from(products);

  return {
    bySku: new Map(rows.filter((row) => row.skuCode).map((row) => [row.skuCode, row])),
    /* Nombres normalizados, para avisar cuando una fila sin SKU va a crear
       un producto que ya parece existir. */
    byName: new Map(rows.map((row) => [normalizeHeader(row.name), row.id])),
  };
}

/** Historial de cargas, la más reciente primero. */
export async function getImportBatches(limit = 20) {
  return db.query.importBatches.findMany({
    orderBy: desc(importBatches.createdAt),
    limit,
    with: { uploadedBy: { columns: { name: true } } },
  });
}

/** Las filas de un lote, para revisar qué pasó con cada una. */
export async function getBatchRows(batchId, limit = 500) {
  return db
    .select()
    .from(importRows)
    .where(eq(importRows.batchId, batchId))
    .orderBy(importRows.rowNumber)
    .limit(limit);
}
