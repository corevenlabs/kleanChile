import "server-only";

import ExcelJS from "exceljs";
import Papa from "papaparse";

/**
 * Leer una planilla y devolver filas que el importador pueda mapear.
 *
 * El resto del importador trabaja sobre `{ headers, rows }` y nunca se entera
 * de si el archivo era CSV o XLSX. Esa frontera es el punto: un formato nuevo
 * es una rama más acá y nada corriente abajo.
 *
 * **Todo vuelve como texto.** La idea de tipo que tiene una planilla no es de
 * fiar: un SKU guardado como número pierde los ceros a la izquierda, un precio
 * puede venir como fecha, y Excel decide solo. La interpretación se hace
 * después, campo por campo, a propósito.
 */

/**
 * Tope de filas.
 *
 * Un catálogo completo son unos cientos de productos. Cinco mil está muy por
 * encima de cualquier caso real y muy por debajo de lo que costaría tener el
 * diff entero en memoria — un archivo más grande que esto es un error, y
 * rechazarlo es más amable que molerlo.
 */
const MAX_ROWS = 5000;

/** Una celda de Excel puede ser fórmula, texto enriquecido o hipervínculo. */
function cellToText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value.text === "string") return value.text;
    if (typeof value.result !== "undefined") return String(value.result);
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
    if (typeof value.hyperlink === "string") return value.hyperlink;
    return "";
  }
  return String(value);
}

const cleanHeaders = (raw) => raw.map((cell) => cellToText(cell).trim());

function fail(message) {
  return { ok: false, error: message };
}

function parseCsv(text) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    // Sin conversión de tipos: ver la nota de arriba sobre los ceros a la izquierda.
    dynamicTyping: false,
    transformHeader: (header) => header.trim(),
  });

  const headers = (parsed.meta.fields ?? []).filter((header) => header !== "");
  if (headers.length === 0) return fail("El archivo no tiene una fila de encabezados.");

  const rows = parsed.data
    .map((row) => {
      const clean = {};
      for (const header of headers) clean[header] = String(row[header] ?? "").trim();
      return clean;
    })
    .filter((row) => Object.values(row).some((value) => value !== ""));

  return { ok: true, value: { headers, rows } };
}

async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return fail("El archivo no tiene ninguna hoja.");

  const headerRow = sheet.getRow(1);
  const headers = cleanHeaders(
    Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [],
  );
  if (headers.filter(Boolean).length === 0) {
    return fail("La primera fila debe tener los encabezados de las columnas.");
  }

  const rows = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return; // encabezados

    const record = {};
    let hasContent = false;

    headers.forEach((header, position) => {
      if (!header) return;
      const text = cellToText(row.getCell(position + 1).value).trim();
      record[header] = text;
      if (text !== "") hasContent = true;
    });

    if (hasContent) rows.push(record);
  });

  return { ok: true, value: { headers: headers.filter(Boolean), rows } };
}

/** Decide el formato por la extensión; el contenido no siempre lo delata. */
export async function parseSpreadsheet(fileName, buffer) {
  const lower = fileName.toLowerCase();

  let parsed;
  try {
    if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
      parsed = parseCsv(buffer.toString("utf8"));
    } else if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
      parsed = await parseXlsx(buffer);
    } else {
      return fail("Formato no admitido. Sube un archivo .csv o .xlsx.");
    }
  } catch (error) {
    // El detalle real de una librería de planillas no le dice nada a quien sube
    // el archivo; lo que necesita saber es que el archivo no se pudo leer.
    console.error("parseSpreadsheet", error);
    return fail("No pudimos leer el archivo. Revisa que no esté dañado ni protegido con contraseña.");
  }

  if (!parsed.ok) return parsed;

  const { headers, rows } = parsed.value;
  if (rows.length === 0) return fail("El archivo no tiene filas con datos.");
  if (rows.length > MAX_ROWS) {
    return fail(`El archivo tiene ${String(rows.length)} filas y el máximo es ${String(MAX_ROWS)}.`);
  }

  return { ok: true, value: { headers, rows } };
}

export { MAX_ROWS };
