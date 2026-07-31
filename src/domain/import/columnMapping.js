import { FIELDS, FIELD_KEYS } from "./fields.js";

/**
 * Los encabezados del archivo → nuestros campos canónicos.
 *
 * Un mapeo es exactamente este objeto: `{ "Valor Neto": "price" }`. Se aplica a
 * cada fila antes de que nadie más mire los datos, así que de la validación en
 * adelante el resto del importador nunca ve los nombres de columna del
 * proveedor, solo `sku`, `price`, `stock`.
 */

/**
 * Normaliza un encabezado para comparar: minúsculas, sin tildes, sin puntuación.
 *
 * Es lo que permite que "Descripción Producto", "descripcion_producto" y
 * "DESCRIPCION PRODUCTO" caigan todos en el mismo campo. Sin esto la
 * autodetección fallaría por una tilde y la persona tendría que mapear a mano
 * un archivo que era perfectamente reconocible.
 */
export function normalizeHeader(header) {
  return String(header ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Propone un mapeo a partir de los encabezados del archivo.
 *
 * Primero coincidencia exacta contra los alias, después por inclusión — "precio
 * unitario" contiene "precio". La inclusión se prueba en segunda pasada para
 * que un encabezado que calza exacto nunca pierda contra uno que solo lo
 * contiene.
 *
 * Cada campo se asigna una sola vez: si dos columnas parecen el precio, gana la
 * primera y la otra queda sin mapear, a la vista, para que la persona decida.
 */
export function detectMapping(headers) {
  const mapping = {};
  const taken = new Set();

  const candidates = headers.map((header) => ({ header, key: normalizeHeader(header) }));

  for (const { header, key } of candidates) {
    if (key === "") continue;
    const field = FIELDS.find(
      (candidate) => !taken.has(candidate.key) && candidate.aliases.includes(key),
    );
    if (field) {
      mapping[header] = field.key;
      taken.add(field.key);
    }
  }

  for (const { header, key } of candidates) {
    if (key === "" || mapping[header]) continue;
    const field = FIELDS.find(
      (candidate) =>
        !taken.has(candidate.key) &&
        candidate.aliases.some((alias) => key.includes(alias) || alias.includes(key)),
    );
    if (field) {
      mapping[header] = field.key;
      taken.add(field.key);
    }
  }

  return mapping;
}

/**
 * Revisa que un mapeo tenga sentido antes de procesar el archivo.
 *
 * Dos formas de estar mal: apuntar a un campo que no existe, o apuntar dos
 * columnas al mismo campo — cuál gana sería arbitrario, así que no se permite
 * ninguna.
 *
 * No se exige ningún campo acá. Una planilla de solo SKU + precio es un uso
 * legítimo; si falta algo para *crear*, lo dirá la fila que intente crear, con
 * su número de línea, que es donde la persona puede hacer algo al respecto.
 */
export function validateMapping(mapping) {
  const seen = new Set();

  for (const [header, target] of Object.entries(mapping)) {
    if (!target) continue;
    if (!FIELD_KEYS.includes(target)) {
      return { ok: false, error: `La columna «${header}» apunta a un campo desconocido.` };
    }
    if (seen.has(target)) {
      return { ok: false, error: `Dos columnas apuntan a «${target}». Deja solo una.` };
    }
    seen.add(target);
  }

  if (seen.size === 0) {
    return { ok: false, error: "No hay ninguna columna asignada todavía." };
  }

  return { ok: true, mapping };
}

/**
 * Aplica el mapeo a una fila cruda.
 *
 * Recorta al pasar: un espacio al final de una celda es invisible y haría que
 * " KC0000013 " no encuentre el SKU que claramente nombra.
 */
export function applyMapping(mapping, rawRow) {
  const mapped = {};

  for (const [header, target] of Object.entries(mapping)) {
    if (!target) continue;
    mapped[target] = String(rawRow[header] ?? "").trim();
  }

  return mapped;
}

/** Los campos efectivamente presentes en el archivo, en orden canónico. */
export const mappedFields = (mapping) =>
  FIELD_KEYS.filter((key) => Object.values(mapping).includes(key));
