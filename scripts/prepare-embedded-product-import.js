import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import sharp from "sharp";

const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  console.error("Uso: node scripts/prepare-embedded-product-import.js <origen.xlsx> <salida.csv>");
  process.exit(1);
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(source);
const sheet = workbook.worksheets[0];
if (!sheet) throw new Error("El libro no contiene hojas.");

const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
await mkdir(uploadDir, { recursive: true });

const imagesByRow = new Map();
for (const placement of sheet.getImages()) {
  const image = workbook.getImage(placement.imageId);
  const firstRow = placement.range.tl.nativeRow + 1;
  const lastRow = placement.range.br?.nativeRow + 1 ?? firstRow;
  // En este archivo una imagen que abarca las filas 33–34 corresponde a la 34.
  const rowNumber = lastRow > firstRow ? lastRow : firstRow;
  const list = imagesByRow.get(rowNumber) ?? [];
  list.push(image);
  imagesByRow.set(rowNumber, list);
}

const quote = (value) => {
  const text = String(value ?? "");
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/**
 * Familias que usa el submenú real del catálogo. El texto de `type` coincide
 * con cada enlace para que el filtro de la tienda encuentre todos los artículos.
 */
function classifyProduct(name) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (/CUADERNO|CROQUERA/.test(normalized)) {
    return { category: "Librería", type: "Cuadernos y croqueras" };
  }
  if (/PAPEL|BLOCK DE APUNTES/.test(normalized)) {
    return { category: "Librería", type: "Papeles y blocks" };
  }
  if (/DESTACADOR|MARCADOR/.test(normalized)) {
    return { category: "Librería", type: "Marcadores y destacadores" };
  }
  if (/CORRECTOR|LAPIZ|GOMA DE BORRAR|SACAPUNTA/.test(normalized)) {
    return { category: "Librería", type: "Lápices y corrección" };
  }
  if (/ADHESIVO|CINTA ADH/.test(normalized)) {
    return { category: "Librería", type: "Adhesivos y cintas" };
  }
  if (/TIJERA|CUCHILLO CARTONERO/.test(normalized)) {
    return { category: "Librería", type: "Corte y manualidades" };
  }
  if (/ARCHV|ARCHIVADOR|CARPETA|ANOTADOR/.test(normalized)) {
    return { category: "Escritorio", type: "Archivadores y carpetas" };
  }
  if (/FUNDA|TERMOLAMINAR/.test(normalized)) {
    return { category: "Escritorio", type: "Fundas y plastificado" };
  }
  if (/CORCHETERA|PERFORADORA/.test(normalized)) {
    return { category: "Escritorio", type: "Corcheteras y perforadoras" };
  }
  if (/CORCHETE|PUSH PINS/.test(normalized)) {
    return { category: "Escritorio", type: "Corchetes y chinches" };
  }

  throw new Error(`No hay una familia definida para «${name}».`);
}

const rows = [
  [
    "SKU",
    "Nombre",
    "Categoría",
    "Tipo",
    "Precio",
    "Stock",
    "Descripción",
    "Imagen (URL)",
    "Ficha técnica (URL)",
    "Publicado",
  ],
];

const problems = [];
for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
  const sku = sheet.getCell(rowNumber, 2).text.trim();
  const name = sheet.getCell(rowNumber, 3).text.trim();
  const description = sheet.getCell(rowNumber, 4).text.trim();
  if (!sku && !name) continue;
  const classification = classifyProduct(name);

  let imageUrl = "";
  const candidates = imagesByRow.get(rowNumber) ?? [];
  if (candidates.length !== 1) {
    problems.push(`Fila ${String(rowNumber)}: ${String(candidates.length)} imágenes asociadas.`);
  } else {
    const image = candidates[0];
    const metadata = await sharp(image.buffer).metadata();
    const extension = metadata.format === "jpeg" ? "jpg" : metadata.format;
    if (!extension || !["jpg", "png", "webp", "avif"].includes(extension)) {
      problems.push(`Fila ${String(rowNumber)}: formato de imagen no admitido.`);
    } else {
      const fileName = `${sku}.${extension}`;
      await writeFile(path.join(uploadDir, fileName), image.buffer);
      imageUrl = `/uploads/products/${fileName}`;
    }
  }

  rows.push([
    sku,
    name,
    classification.category,
    classification.type,
    "0",
    "0",
    description,
    imageUrl,
    "",
    "Sí",
  ]);
}

if (problems.length > 0) {
  throw new Error(`No se generó la carga:\n${problems.join("\n")}`);
}

const csv = `\ufeff${rows.map((row) => row.map(quote).join(";")).join("\r\n")}\r\n`;
await writeFile(destination, csv, "utf8");
console.log(`${String(rows.length - 1)} productos preparados en ${destination}`);
