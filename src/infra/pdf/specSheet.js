import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";

/**
 * La ficha técnica generada desde la tabla clave→valor.
 *
 * Se arma cuando alguien la pide, no cuando alguien guarda el producto.
 *
 * Guardarla en el bucket costaría un objeto por producto, habría que regenerarla
 * en cada corrección de una coma, y cada corrección dejaría atrás el archivo
 * anterior. Derivarla al vuelo hace que **editar una especificación cambie el
 * PDF**, sin ningún proceso de sincronización que se pueda quedar atrás. Es el
 * mismo criterio que los más vendidos y que el `srcset`: derivado, no guardado.
 *
 * Lo que cuesta es un render por descarga, sobre datos que ya vienen de la
 * caché del catálogo. Si algún día eso pesa, el punto donde se resuelve es la
 * ruta —cacheando el buffer por `CATALOG_TAG`— y no acá.
 *
 * ── Sobre `sharp` ────────────────────────────────────────────────────────────
 *
 * Este es el **segundo** módulo del proyecto que lo importa, y sigue valiendo la
 * regla de fondo: solo lo alcanzan Route Handlers, nunca una página, un
 * componente ni un Server Action. Está acá por una limitación concreta del
 * formato: un PDF solo admite JPEG y PNG incrustados, y nuestras propias fotos
 * de catálogo son AVIF y WebP. Sin la conversión, la única imagen que este
 * documento podría mostrar sería la de un proveedor externo — exactamente al
 * revés de lo que hace falta.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 50;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

const NAVY = "#0e2a6b";
const INK = "#10233f";
const MUTED = "#5b7189";
const LINE = "#dce9f2";
const CYAN = "#22c2e8";

/** La marca, para el encabezado. Se lee del disco una sola vez por proceso. */
const MARK_PATH = path.join(process.cwd(), "public", "brand", "mark.png");
let markPromise = null;
const brandMark = () => {
  // `readFile` cacheado en la promesa y no en el buffer: dos peticiones
  // simultáneas la primera vez comparten la misma lectura en vez de hacer dos.
  markPromise ??= readFile(MARK_PATH).catch(() => null);
  return markPromise;
};

/**
 * La foto del producto, convertida a algo que un PDF pueda llevar adentro.
 *
 * Falla en silencio a propósito: la ficha técnica del producto vale por sus
 * especificaciones, y una URL de proveedor que dejó de responder no es motivo
 * para que la descarga entera devuelva un error.
 */
async function productPhoto(url) {
  if (!url) return null;

  try {
    // Un tiempo límite corto y explícito. Sin esto, un servidor de proveedor que
    // acepta la conexión y no contesta deja colgada la descarga del cliente.
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 12 * 1024 * 1024) return null;

    // A JPEG y con el lado largo acotado: dentro del documento se dibuja a unos
    // 150 pt, así que incrustar el original de 2400 px solo engordaría el
    // archivo que el cliente va a descargar.
    const image = sharp(bytes).rotate().resize({
      width: 600,
      height: 600,
      fit: "inside",
      withoutEnlargement: true,
    });

    return await image.jpeg({ quality: 82 }).toBuffer();
  } catch {
    return null;
  }
}

/** Un separador horizontal fino, del ancho del contenido. */
function rule(doc, y) {
  doc.save().moveTo(MARGIN, y).lineTo(A4.width - MARGIN, y).lineWidth(0.5).strokeColor(LINE).stroke().restore();
}

function header(doc, mark) {
  const top = MARGIN - 8;

  if (mark) doc.image(mark, MARGIN, top, { width: 30, height: 30 });

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(NAVY)
    .text("KleanChile", MARGIN + (mark ? 40 : 0), top + 8, { lineBreak: false });

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(MUTED)
    .text("Ficha técnica", MARGIN, top + 10, { width: CONTENT_WIDTH, align: "right" });

  rule(doc, top + 38);
  return top + 58;
}

/**
 * El pie, en todas las páginas.
 *
 * Se dibuja al final sobre las páginas ya escritas, no al vaciar cada una: la
 * numeración necesita saber cuántas páginas hubo en total, y eso solo se sabe
 * cuando el contenido terminó.
 */
function footers(doc, contactLines) {
  const range = doc.bufferedPageRange();
  const y = A4.height - MARGIN + 4;

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);

    /*
     * El pie va **debajo** del margen inferior, y para pdfkit escribir ahí es
     * motivo de salto de página: agrega una hoja nueva, le pone su propio pie,
     * que vuelve a caer fuera de margen… Un documento de tres páginas salía con
     * seis. Bajar el margen a cero mientras se dibuja es la forma de decirle que
     * este texto es el pie y no contenido que se desbordó.
     */
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    rule(doc, y - 10);

    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);

    if (contactLines.length > 0) {
      doc.text(contactLines.join("  ·  "), MARGIN, y, {
        width: CONTENT_WIDTH - 60,
        lineBreak: false,
        ellipsis: true,
      });
    }

    doc.text(`${String(index + 1)} / ${String(range.count)}`, MARGIN, y, {
      width: CONTENT_WIDTH,
      align: "right",
      lineBreak: false,
    });

    doc.page.margins.bottom = bottom;
  }
}

/**
 * @param product       la vista del catálogo: name, skuCode, specs, image…
 * @param specs         [[etiqueta, valor]] ya humanizadas por quien llama
 * @param contactLines  líneas del bloque `footer` para el pie
 */
export async function renderSpecSheet({ product, specs, contactLines = [] }) {
  const [mark, photo] = await Promise.all([brandMark(), productPhoto(product.image)]);

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: `Ficha técnica · ${product.name}`,
      Author: "KleanChile",
      Subject: product.skuCode ? `SKU ${product.skuCode}` : "Ficha técnica",
      Creator: "KleanChile",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve) => doc.on("end", resolve));

  /*
   * La marca se abre una sola vez y se reusa en cada página.
   *
   * `doc.image(buffer)` con el mismo buffer lo vuelve a incrustar: un documento
   * de cinco páginas llevaba cinco copias del logo. Un objeto de imagen ya
   * abierto se referencia, y pesa una sola vez.
   */
  const markImage = mark ? doc.openImage(mark) : null;

  doc.addPage();
  let y = header(doc, markImage);

  // ── Título y foto, en dos columnas ─────────────────────────────────────────
  const photoBox = 150;
  const photoImage = photo ? doc.openImage(photo) : null;
  const photoWidth = photoImage ? photoBox : 0;
  const titleWidth = CONTENT_WIDTH - photoWidth - (photoImage ? 24 : 0);

  /*
   * El alto que la foto ocupa de verdad, no el de su caja.
   *
   * `fit` encaja la imagen dentro del cuadrado manteniendo la proporción, así
   * que una foto apaisada deja abajo un margen que no es de nadie. Reservar los
   * 150 pt igual abría un hueco de casi tres centímetros entre el título y las
   * especificaciones, que se lee como un error de maquetación.
   */
  let photoHeight = 0;
  if (photoImage) {
    const scale = Math.min(photoBox / photoImage.width, photoBox / photoImage.height);
    photoHeight = photoImage.height * scale;

    doc.image(photoImage, A4.width - MARGIN - photoWidth, y, {
      fit: [photoBox, photoBox],
      align: "right",
      valign: "top",
    });
  }

  doc.font("Helvetica-Bold").fontSize(19).fillColor(INK).text(product.name, MARGIN, y, {
    width: titleWidth,
  });

  if (product.skuCode) {
    doc.moveDown(0.4);
    // Monoespaciada porque es un código que alguien va a volver a teclear, la
    // misma razón por la que en la tienda lleva IBM Plex Mono.
    doc.font("Courier").fontSize(10).fillColor(NAVY).text(`SKU ${product.skuCode}`, { width: titleWidth });
  }

  if (product.type) {
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(product.type, { width: titleWidth });
  }

  y = Math.max(doc.y, y + photoHeight) + 26;

  // ── La tabla ───────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text("Especificaciones", MARGIN, y);
  y = doc.y + 6;

  doc.save().moveTo(MARGIN, y).lineTo(MARGIN + 40, y).lineWidth(2).strokeColor(CYAN).stroke().restore();
  y += 14;

  const keyWidth = 165;
  const valueWidth = CONTENT_WIDTH - keyWidth - 16;
  const bottomLimit = A4.height - MARGIN - 24;

  for (const [label, value] of specs) {
    doc.font("Helvetica-Bold").fontSize(9);
    const keyHeight = doc.heightOfString(label, { width: keyWidth });
    doc.font("Helvetica").fontSize(9);
    const valueHeight = doc.heightOfString(value, { width: valueWidth });
    const rowHeight = Math.max(keyHeight, valueHeight) + 14;

    /*
     * Se mide antes de escribir y se salta de página a mano.
     *
     * Dejar que pdfkit parta la fila sola dividiría un valor largo entre dos
     * páginas con su etiqueta huérfana en la primera, que es justo lo que hace
     * ilegible una tabla de dos columnas.
     */
    if (y + rowHeight > bottomLimit) {
      doc.addPage();
      y = header(doc, markImage);
    }

    doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text(label, MARGIN, y, { width: keyWidth });
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(value, MARGIN + keyWidth + 16, y, { width: valueWidth });

    y += rowHeight;
    rule(doc, y - 7);
  }

  footers(doc, contactLines);

  doc.end();
  await finished;

  return Buffer.concat(chunks);
}
