import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  IMAGE_FORMATS,
  IMAGE_WIDTHS,
  WEBP_MAX_WIDTH,
  mediaPrefix,
  renditionKey,
} from "./imageKeys.js";

/**
 * Procesamiento de imágenes.
 *
 * Las fotos que llegan son originales de cámara o de catálogo de proveedor —
 * varios megas cada una. Servirlas tal cual en una grilla de veinte productos
 * hace la página inusable en un teléfono, que es donde la mayoría de los
 * compradores institucionales la va a mirar la primera vez.
 *
 * Cada original produce un escalón de anchos en dos formatos modernos. El
 * navegador elige el archivo más chico que le sirve vía `srcset`, así que un
 * teléfono baja unos 40 KB donde el original pesaba 4 MB.
 *
 * **AVIF primero, WebP de respaldo.** AVIF pesa cerca de un 30% menos que WebP
 * a calidad equivalente, pero decodifica más lento y falta en Safari viejo.
 * Emitir los dos deja que `<picture>` elija, y la copia extra cuesta poco al
 * lado de que R2 no cobra egreso.
 */

/**
 * La calidad baja a medida que sube el ancho.
 *
 * Una rendition de 2400px llena una pantalla grande, donde el ojo resuelve
 * mucho menos detalle por píxel que en una miniatura de 320px mirada de cerca.
 * Mantener la calidad constante a lo largo del escalón gastaría los bytes justo
 * donde menos se notan — y la rendition más ancha suele ser el elemento más
 * grande de la página, en las conexiones que menos lo pueden pagar.
 *
 * La escala de AVIF en sharp no es la de WebP: AVIF 50 se ve parecido a WebP 75.
 */
const QUALITY_LADDER = [
  { maxWidth: 640, avif: 55, webp: 78 },
  { maxWidth: 1024, avif: 50, webp: 74 },
  { maxWidth: 1600, avif: 45, webp: 70 },
  { maxWidth: Number.POSITIVE_INFINITY, avif: 40, webp: 65 },
];

function qualityFor(width, format) {
  const step = QUALITY_LADDER.find((entry) => width <= entry.maxWidth);
  return step ? step[format] : 50;
}

/**
 * Clave direccionada por contenido.
 *
 * Nombrar con el hash de los bytes hace que reprocesar sea idempotente, que la
 * misma foto usada por dos productos se guarde una sola vez, y que cada objeto
 * se pueda cachear para siempre: el contenido de una clave dada nunca cambia.
 */
export function contentHash(source) {
  return createHash("sha256").update(source).digest("hex").slice(0, 16);
}

export async function processImage(source, { maxWidth } = {}) {
  const hash = contentHash(source);

  // `rotate()` sin argumento aplica la orientación EXIF y la borra. Sin esto,
  // una foto vertical tomada con teléfono sale acostada: el resize descarta el
  // metadato que la mantenía derecha.
  const image = sharp(source, { failOn: "none" }).rotate();

  const metadata = await image.metadata();
  const { width: storedWidth, height: storedHeight } = metadata;
  if (!storedWidth || !storedHeight) throw new Error("No se pudieron leer las dimensiones");

  /*
   * `metadata()` informa las dimensiones como están guardadas, antes de aplicar
   * la orientación — `rotate()` no cambia lo que devuelve.
   *
   * Un teléfono guarda una foto vertical como píxeles horizontales más una
   * bandera de orientación entre 5 y 8, que significa un cuarto de vuelta.
   * Registrar esos números crudos anotaría una proporción horizontal para una
   * imagen que se ve vertical — y como estas dimensiones son las que reservan
   * el espacio en la maqueta, cada foto así daría un salto visible al cargar.
   */
  const quarterTurned =
    metadata.orientation !== undefined &&
    metadata.orientation >= 5 &&
    metadata.orientation <= 8;

  const originalWidth = quarterTurned ? storedHeight : storedWidth;
  const originalHeight = quarterTurned ? storedWidth : storedHeight;

  const ceiling = Math.min(maxWidth ?? originalWidth, originalWidth);

  // Nunca agrandar: ampliar un original suma bytes sin sumar detalle. Si el
  // original es más chico que todos los escalones, queda una sola rendition a
  // su tamaño nativo.
  const widths = IMAGE_WIDTHS.filter((width) => width <= ceiling);
  if (widths.length === 0) widths.push(ceiling);

  const prefix = mediaPrefix(hash, originalWidth, originalHeight);
  const renditions = [];

  for (const width of widths) {
    for (const format of IMAGE_FORMATS) {
      if (format === "webp" && width > WEBP_MAX_WIDTH) continue;

      const pipeline = image
        .clone()
        .resize(width, null, { fit: "inside", withoutEnlargement: true });

      const encoded =
        format === "avif"
          ? pipeline.avif({ quality: qualityFor(width, "avif"), effort: 4 })
          : pipeline.webp({ quality: qualityFor(width, "webp") });

      const { data, info } = await encoded.toBuffer({ resolveWithObject: true });

      renditions.push({
        width: info.width,
        height: info.height,
        format,
        byteSize: info.size,
        data,
        key: renditionKey(prefix, width, format),
      });
    }
  }

  return {
    hash,
    prefix,
    originalWidth,
    originalHeight,
    renditions,
    totalBytes: renditions.reduce((sum, rendition) => sum + rendition.byteSize, 0),
  };
}
