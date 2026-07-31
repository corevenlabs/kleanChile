"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  applyMapping,
  detectMapping,
  mappedFields,
  validateMapping,
} from "../domain/import/columnMapping.js";
import { buildPlan } from "../domain/import/plan.js";
import { applyImportPlan } from "../infra/db/mutations/catalogImport.js";
import { CATALOG_TAG } from "../infra/db/queries/catalog.js";
import { snapshotBySku } from "../infra/db/queries/imports.js";
import { parseSpreadsheet } from "../infra/import/parseSpreadsheet.js";
import { requireUser } from "../lib/adminSession.js";

/**
 * Importación masiva de catálogo.
 *
 * Dos acciones, y las dos parten del archivo. Analizar no guarda nada en el
 * servidor y aplicar vuelve a leer el mismo archivo en lugar de recibir el plan
 * desde el navegador — un plan que viaja al cliente y vuelve es un plan que se
 * puede editar por el camino, y decide qué se escribe en el catálogo.
 *
 * Cinco mil filas tampoco caben cómodas en el cuerpo de una Server Action, así
 * que releer sale más barato que transportarlas.
 */

/** Cuántas filas del detalle se mandan al navegador para la vista previa. */
const PREVIEW_LIMIT = 60;

async function readPlan(formData) {
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) {
    return { ok: false, error: "No se recibió ningún archivo." };
  }

  const parsed = await parseSpreadsheet(file.name, Buffer.from(await file.arrayBuffer()));
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { headers, rows } = parsed.value;

  // Un mapeo confirmado por la persona gana sobre la autodetección; en la
  // primera pasada todavía no hay ninguno.
  const submitted = formData.get("mapping");
  let mapping;
  if (typeof submitted === "string" && submitted !== "") {
    try {
      mapping = JSON.parse(submitted);
    } catch {
      return { ok: false, error: "El mapeo de columnas llegó dañado." };
    }
  } else {
    mapping = detectMapping(headers);
  }

  const checked = validateMapping(mapping);
  if (!checked.ok) return { ok: false, error: checked.error };

  const present = mappedFields(mapping);
  const { bySku, byName } = await snapshotBySku();

  const plan = buildPlan({
    // Fila 1 son los encabezados, así que los datos empiezan en la 2 — que es
    // el número que la persona ve en Excel.
    rows: rows.map((row, index) => ({ rowNumber: index + 2, values: applyMapping(mapping, row) })),
    present,
    bySku,
    byName,
  });

  return { ok: true, headers, mapping, present, plan, fileName: file.name };
}

export async function analyzeImportAction(_previous, formData) {
  await requireUser();

  const result = await readPlan(formData);
  if (!result.ok) return { status: "error", message: result.error };

  const { plan } = result;

  // Los errores viajan completos aunque el resto se recorte: son las filas que
  // la persona tiene que ir a arreglar, y una lista truncada de errores es una
  // lista inútil.
  const errors = plan.rows.filter((row) => row.status === "error").slice(0, 200);
  const sample = plan.rows.filter((row) => row.status !== "error").slice(0, PREVIEW_LIMIT);

  return {
    status: "ok",
    headers: result.headers,
    mapping: result.mapping,
    present: result.present,
    fileName: result.fileName,
    counts: plan.counts,
    rows: [...errors, ...sample].sort((a, b) => a.rowNumber - b.rowNumber),
    truncated: plan.rows.length > errors.length + sample.length,
  };
}

export async function applyImportAction(_previous, formData) {
  const user = await requireUser();

  const result = await readPlan(formData);
  if (!result.ok) return { status: "error", message: result.error };

  const { plan, mapping, fileName } = result;

  if (plan.counts.created === 0 && plan.counts.updated === 0) {
    return { status: "error", message: "No hay nada que aplicar en este archivo." };
  }

  const applied = await applyImportPlan({ plan, fileName, mapping, actorId: user.id });

  revalidateTag(CATALOG_TAG);
  revalidatePath("/admin/productos");
  revalidatePath("/admin/importar");

  return {
    status: "applied",
    counts: applied.counts,
    message: `${String(applied.counts.created)} creados · ${String(applied.counts.updated)} actualizados`,
  };
}
