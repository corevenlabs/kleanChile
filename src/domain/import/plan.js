import { CATEGORIES, CATEGORY_LABELS } from "../content/vocabulary.js";
import { isValidSkuCode } from "../catalog/skuCode.js";
import { parseClp } from "../shared/money.js";
import { normalizeHeader } from "./columnMapping.js";
import { fieldLabel, REQUIRED_TO_CREATE } from "./fields.js";

/**
 * Convierte las filas mapeadas en un plan revisable.
 *
 * Es el diff que la persona aprueba antes de que se escriba nada. Es puro: el
 * estado actual del catálogo entra como argumento, nunca se lee acá. Por eso se
 * puede probar sin base de datos y por eso una «vista previa» no puede tener
 * efectos secundarios.
 *
 * Cada fila de entrada produce exactamente una fila de plan. Nada se descarta
 * en silencio: un SKU desconocido aparece como error visible, no como ausencia.
 * Esa es la diferencia entre «40 productos actualizados» y «40 de tus 42 filas
 * se aplicaron y de las otras dos nunca te enteraste».
 */

const CATEGORY_BY_LABEL = new Map(
  CATEGORIES.flatMap((slug) => [
    [normalizeHeader(slug), slug],
    [normalizeHeader(CATEGORY_LABELS[slug]), slug],
  ]),
);
// Sinónimos que la gente escribe de verdad en sus planillas.
for (const [alias, slug] of [
  ["aseo", "cleaning"],
  ["quimicos", "cleaning"],
  ["papeleria", "bookshop"],
  ["libreria", "bookshop"],
  ["utiles", "bookshop"],
  ["oficina", "desktop"],
  ["escritorio", "desktop"],
]) {
  if (!CATEGORY_BY_LABEL.has(alias)) CATEGORY_BY_LABEL.set(alias, slug);
}

const TRUTHY = new Set(["si", "si ", "s", "yes", "y", "true", "1", "publicado", "activo", "visible"]);
const FALSY = new Set(["no", "n", "false", "0", "oculto", "inactivo", "borrador"]);

function parseBoolean(raw) {
  const value = normalizeHeader(raw);
  if (value === "") return null;
  if (TRUTHY.has(value)) return true;
  if (FALSY.has(value)) return false;
  return undefined; // presente pero ininteligible
}

/**
 * Interpreta una celda según su campo.
 *
 * Devuelve `{ value }` o `{ error }`. Una celda vacía devuelve `{ value:
 * undefined }`, que significa «no tocar este campo» — distinto de un valor
 * inválido, que es un error que hay que mostrar.
 */
function readCell(field, raw) {
  const text = String(raw ?? "").trim();
  if (text === "") return { value: undefined };

  switch (field) {
    case "price": {
      const pesos = parseClp(text);
      if (pesos === null || pesos < 0) return { error: `Precio inválido: «${text}»` };
      return { value: pesos };
    }
    case "stock": {
      const digits = text.replace(/[^\d-]/g, "");
      const units = Number.parseInt(digits, 10);
      if (!Number.isInteger(units) || units < 0) return { error: `Stock inválido: «${text}»` };
      return { value: units };
    }
    case "category": {
      const slug = CATEGORY_BY_LABEL.get(normalizeHeader(text));
      if (!slug) {
        return { error: `Categoría desconocida: «${text}». Usa Limpieza, Librería o Escritorio.` };
      }
      return { value: slug };
    }
    case "active": {
      const flag = parseBoolean(text);
      if (flag === undefined) return { error: `Valor de publicado inválido: «${text}»` };
      return { value: flag };
    }
    default:
      return { value: text };
  }
}

/** Cómo se llama el campo del plan dentro de la fila del producto. */
const COLUMN = {
  name: "name",
  category: "category",
  type: "type",
  price: "priceClp",
  description: "description",
  image: "imageUrl",
  specSheet: "specSheetUrl",
  active: "isActive",
};

/**
 * @param rows      [{ rowNumber, values: MappedRow }]
 * @param present   claves de campo efectivamente mapeadas
 * @param bySku     Map<skuCode, snapshot> del catálogo actual
 */
export function buildPlan({ rows, present, bySku, byName = new Map() }) {
  const planned = [];
  const seenSku = new Set();
  const seenName = new Set();

  for (const { rowNumber, values } of rows) {
    const row = { rowNumber, skuCode: null, productId: null, changes: {}, stock: undefined };

    // Cada celda se interpreta una vez; los errores se juntan para que la
    // persona vea todo lo que está mal en la fila, no solo lo primero.
    const parsed = {};
    const problems = [];

    for (const field of present) {
      if (field === "sku") continue;
      const result = readCell(field, values[field]);
      if (result.error) problems.push(result.error);
      else if (result.value !== undefined) parsed[field] = result.value;
    }

    const sku = String(values.sku ?? "").trim().toUpperCase();

    if (problems.length > 0) {
      planned.push({ ...row, skuCode: sku || null, status: "error", message: problems.join(" · ") });
      continue;
    }

    // ── Actualizar ───────────────────────────────────────────────────────
    if (sku !== "") {
      row.skuCode = sku;

      if (!isValidSkuCode(sku)) {
        planned.push({ ...row, status: "error", message: `SKU con formato inválido: «${sku}»` });
        continue;
      }

      const existing = bySku.get(sku);
      if (!existing) {
        planned.push({
          ...row,
          status: "error",
          message: `No existe un producto con SKU ${sku}. Deja la celda vacía para crearlo.`,
        });
        continue;
      }

      // Dos filas para el mismo producto: la segunda pisaría a la primera sin
      // que nadie lo note, así que se detiene.
      if (seenSku.has(sku)) {
        planned.push({ ...row, status: "error", message: `El SKU ${sku} aparece más de una vez.` });
        continue;
      }
      seenSku.add(sku);

      row.productId = existing.id;

      for (const [field, value] of Object.entries(parsed)) {
        if (field === "stock") {
          if (value !== existing.stockOnHand) {
            row.stock = value;
            row.changes.stock = { from: existing.stockOnHand, to: value };
          }
          continue;
        }
        const column = COLUMN[field];
        if (value !== existing[column]) {
          row.changes[field] = { from: existing[column], to: value };
        }
      }

      const status = Object.keys(row.changes).length === 0 ? "skipped" : "updated";
      planned.push({
        ...row,
        status,
        message: status === "skipped" ? "Sin cambios" : null,
      });
      continue;
    }

    // ── Crear ────────────────────────────────────────────────────────────
    const missing = REQUIRED_TO_CREATE.filter((field) => parsed[field] === undefined);
    if (missing.length > 0) {
      planned.push({
        ...row,
        status: "error",
        message: `Faltan datos para crear: ${missing.map(fieldLabel).join(", ")}.`,
      });
      continue;
    }

    for (const [field, value] of Object.entries(parsed)) {
      if (field === "stock") {
        row.stock = value;
        row.changes.stock = { from: 0, to: value };
        continue;
      }
      row.changes[field] = { from: null, to: value };
    }

    /*
     * Una fila sin SKU siempre crea. Eso significa que volver a subir el mismo
     * archivo duplicaría estos productos, y es un error fácil de cometer y
     * difícil de notar después.
     *
     * No se bloquea — dos productos pueden llamarse igual legítimamente — pero
     * se avisa en la vista previa, que es el momento en que todavía se puede
     * decidir. Para actualizarlos hay que usar su SKU, que se asigna al crear.
     */
    const nameKey = normalizeHeader(parsed.name);
    const duplicate = byName.has(nameKey) || seenName.has(nameKey);
    seenName.add(nameKey);

    planned.push({
      ...row,
      status: "created",
      message: duplicate ? "Ya existe un producto con este nombre; se creará otro." : null,
    });
  }

  const counts = { created: 0, updated: 0, skipped: 0, error: 0 };
  for (const row of planned) counts[row.status] += 1;

  return { rows: planned, counts };
}
