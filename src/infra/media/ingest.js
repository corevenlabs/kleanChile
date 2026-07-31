import "server-only";

import { db } from "../db/client.js";
import { media } from "../db/schema/index.js";
import { processImage } from "../storage/imagePipeline.js";
import { deleteObject, getObjectBytes, publicUrl, uploadObject } from "../storage/r2.js";

/**
 * Convertir un original recién subido en una imagen guardada y renditionada.
 *
 * El navegador ya hizo PUT del original directo a una clave temporal en R2 —
 * saltándose el servidor, que bajo un límite serverless no puede recibir un
 * cuerpo de 12 MB. Esta es la segunda mitad: recuperar ese original, pasarlo
 * por el pipeline, subir el escalón AVIF/WebP y devolver **una URL**.
 *
 * Devuelve una URL y no un identificador a propósito: es lo que el resto del
 * sistema entiende por una imagen, y lo que hace que un producto creado por el
 * importador con un enlace de proveedor y uno con una foto subida acá sean la
 * misma clase de cosa.
 *
 * Las claves están direccionadas por contenido, así que subir la misma foto dos
 * veces converge en un solo juego de objetos y una sola fila — el
 * `onConflictDoNothing` hace que reprocesar sea idempotente en vez de duplicar.
 */

const CONTENT_TYPE = { avif: "image/avif", webp: "image/webp" };

export async function ingestUploadedImage({ tempKey, fileName, actorId }) {
  let original;
  try {
    original = await getObjectBytes(tempKey);
  } catch {
    return { ok: false, error: "not_found" };
  }

  let processed;
  try {
    processed = await processImage(original);
  } catch {
    return { ok: false, error: "unreadable" };
  }

  // Todas las renditions arriba antes de registrar la fila: una fila que apunte
  // a objetos que todavía no están en el bucket son imágenes rotas.
  await Promise.all(
    processed.renditions.map((rendition) =>
      uploadObject({
        key: rendition.key,
        body: rendition.data,
        contentType: CONTENT_TYPE[rendition.format],
      }),
    ),
  );

  await db
    .insert(media)
    .values({
      storageKey: processed.prefix,
      originalWidth: processed.originalWidth,
      originalHeight: processed.originalHeight,
      byteSize: processed.totalBytes,
      fileName: fileName ?? null,
      uploadedBy: actorId ?? null,
    })
    .onConflictDoNothing({ target: media.storageKey });

  // El original era un borrador. Se borra sin insistir: un temporal que quedó
  // es basura inofensiva, no motivo para fallar una subida que ya terminó.
  try {
    await deleteObject(tempKey);
  } catch {
    // ignorado a propósito
  }

  /*
   * Se devuelve la rendition de 1024 como `src`.
   *
   * Cualquiera de ellas serviría para derivar el resto —el ancho original está
   * en el prefijo— pero esta es la que va a usar un navegador que ignore el
   * `srcset`, y la que se ve si alguien copia la URL a otro lado.
   */
  const widths = processed.renditions
    .filter((rendition) => rendition.format === "avif")
    .map((rendition) => rendition.width);
  const chosen = widths.find((width) => width >= 1024) ?? widths[widths.length - 1];

  return {
    ok: true,
    url: publicUrl(`${processed.prefix}/${String(chosen)}.avif`),
    width: processed.originalWidth,
    height: processed.originalHeight,
    bytes: processed.totalBytes,
    renditions: processed.renditions.length,
  };
}
