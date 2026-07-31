import "server-only";

import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { importBatches, importRows, products } from "../schema/index.js";
import { applyMovement } from "./inventory.js";
import { allocateSkuCodes } from "./skuCodes.js";

/**
 * Escribir un plan de importación ya aprobado.
 *
 * Todo ocurre dentro de una transacción: o queda el lote completo o no queda
 * nada. Un importador que aplica media planilla deja al catálogo en un estado
 * que nadie eligió y que hay que reconstruir a mano.
 *
 * El stock **no** se escribe junto al resto de las columnas. Pasa por
 * `applyMovement`, que bloquea la fila, calcula el saldo y deja el asiento en
 * el libro de inventario. Escribir `stock_on_hand` acá sería más corto y
 * rompería la única invariante del inventario: que los movimientos sumen el
 * saldo.
 */

/** Las columnas del producto que puede tocar cada campo del archivo. */
const COLUMN = {
  name: "name",
  category: "category",
  type: "type",
  price: "priceClp",
  description: "description",
  image: "imageUrl",
  active: "isActive",
};

export async function applyImportPlan({ plan, fileName, mapping, actorId }) {
  const writable = plan.rows.filter((row) => row.status === "created" || row.status === "updated");
  const toCreate = writable.filter((row) => row.status === "created");

  return db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(importBatches)
      .values({
        fileName,
        columnMapping: mapping,
        totalRows: plan.rows.length,
        createdRows: plan.counts.created,
        updatedRows: plan.counts.updated,
        skippedRows: plan.counts.skipped,
        errorRows: plan.counts.error,
        uploadedById: actorId,
      })
      .returning({ id: importBatches.id });

    // Los códigos se piden todos juntos: una llamada a la secuencia por
    // producto multiplica los viajes a la base sin ganar nada.
    const codes = await allocateSkuCodes(toCreate.length, tx);
    let nextCode = 0;

    const rowRecords = [];

    for (const row of plan.rows) {
      if (row.status === "error" || row.status === "skipped") {
        rowRecords.push({
          batchId: batch.id,
          rowNumber: row.rowNumber,
          status: row.status,
          message: row.message,
          skuCode: row.skuCode,
          productId: row.productId,
          changes: row.changes,
        });
        continue;
      }

      const values = {};
      for (const [field, change] of Object.entries(row.changes)) {
        if (field === "stock") continue; // va por el libro de inventario
        values[COLUMN[field]] = change.to;
      }

      let productId = row.productId;
      let skuCode = row.skuCode;

      if (row.status === "created") {
        skuCode = codes[nextCode];
        nextCode += 1;

        const [created] = await tx
          .insert(products)
          .values({ ...values, skuCode, stockOnHand: 0 })
          .returning({ id: products.id });

        productId = created.id;
      } else {
        if (Object.keys(values).length > 0) {
          await tx
            .update(products)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(products.id, productId));
        }
      }

      if (row.stock !== undefined) {
        // La planilla trae un conteo, no un ajuste: la diferencia contra el
        // saldo actual es el movimiento.
        const [current] = await tx
          .select({ stockOnHand: products.stockOnHand })
          .from(products)
          .where(eq(products.id, productId))
          .for("update");

        const delta = row.stock - current.stockOnHand;
        if (delta !== 0) {
          await applyMovement(tx, {
            productId,
            delta,
            reason: delta > 0 ? "restock" : "adjustment",
            note: `Importación ${fileName} (fila ${String(row.rowNumber)})`,
            actorId,
          });
        }
      }

      rowRecords.push({
        batchId: batch.id,
        rowNumber: row.rowNumber,
        status: row.status,
        message: null,
        skuCode,
        productId,
        changes: row.changes,
      });
    }

    if (rowRecords.length > 0) {
      // En tandas: un INSERT con miles de filas supera el límite de parámetros
      // del protocolo de Postgres.
      for (let start = 0; start < rowRecords.length; start += 500) {
        await tx.insert(importRows).values(rowRecords.slice(start, start + 500));
      }
    }

    return { batchId: batch.id, counts: plan.counts };
  });
}
