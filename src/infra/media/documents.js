import "server-only";

import { db } from "../db/client.js";
import { media } from "../db/schema/index.js";
import { DOCUMENT_MAX_BYTES } from "../storage/documentKeys.js";
import { deleteObject, publicUrl, statObject } from "../storage/r2.js";

/**
 * Cerrar una subida de ficha técnica.
 *
 * El navegador hizo PUT del PDF directo al bucket con una URL firmada, así que
 * el servidor **nunca vio el archivo**. Esta es la mitad que falta: comprobar
 * que llegó, cuánto pesa de verdad, dejarlo anotado y devolver la URL.
 *
 * No hay procesamiento porque no hay nada que procesar. Esa es toda la
 * diferencia con `ingest.js`, y es lo que hace que un documento pueda ir a su
 * clave definitiva desde el principio en vez de pasar por una temporal.
 *
 * ── Por qué se vuelve a medir el tamaño ──────────────────────────────────────
 *
 * El límite se comprueba en el navegador antes de pedir la URL firmada, y esa
 * comprobación no es una garantía de nada: quien tiene sesión de admin puede
 * pedir un permiso declarando 1 MB y subir 400. Una URL firmada de S3 no lleva
 * límite de tamaño —eso solo lo dan las políticas POST, que obligarían a un
 * formulario multiparte— así que el punto donde se puede verificar es después,
 * y lo que corresponde entonces es borrar lo que sobra.
 */
export async function confirmUploadedDocument({ key, fileName, actorId }) {
  const info = await statObject(key);
  if (!info) return { ok: false, error: "not_found" };

  if (info.size > DOCUMENT_MAX_BYTES) {
    // No se deja en el bucket: es un objeto que nadie va a enlazar y que nadie
    // se va a acordar de borrar.
    try {
      await deleteObject(key);
    } catch {
      // Que el borrado falle no cambia la respuesta — el archivo se rechaza igual.
    }
    return { ok: false, error: "too_large" };
  }

  await db
    .insert(media)
    .values({
      kind: "document",
      storageKey: key,
      byteSize: info.size,
      fileName: fileName ?? null,
      uploadedBy: actorId ?? null,
    })
    .onConflictDoNothing({ target: media.storageKey });

  return { ok: true, url: publicUrl(key), bytes: info.size };
}
