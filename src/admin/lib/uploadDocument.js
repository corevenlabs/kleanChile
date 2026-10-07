import {
  confirmDocumentUploadAction,
  requestDocumentUploadAction,
  storageModeAction,
  uploadDocumentAction,
} from "../../actions/media";
import { uploadFailure } from "./uploadErrors";

/**
 * El lado del navegador de una subida de ficha técnica.
 *
 * La misma bifurcación que `uploadImage.js` —bucket o disco, decidida en el
 * servidor— con un paso menos: no hay procesamiento, así que después del PUT
 * solo queda confirmar que el archivo llegó.
 *
 * Devuelve lo mismo que la de imágenes: `{ ok, url }`. Los dos campos del panel
 * terminan en «el producto tiene una URL», que es la invariante de la que
 * cuelga todo lo demás.
 */
export async function uploadDocumentFile(file) {
  // Paso por paso, por lo mismo que en `uploadImage.js`.
  let mode;
  try {
    ({ mode } = await storageModeAction());
  } catch (cause) {
    return uploadFailure("prepare", cause);
  }

  if (mode === "local") {
    const body = new FormData();
    body.set("file", file);
    try {
      const result = await uploadDocumentAction(body);
      return result.status === "ok"
        ? { ok: true, url: result.url }
        : { ok: false, message: result.message };
    } catch (cause) {
      return uploadFailure("send", cause);
    }
  }

  let ticket;
  try {
    ticket = await requestDocumentUploadAction({
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });
  } catch (cause) {
    return uploadFailure("prepare", cause);
  }
  if (ticket.status !== "ok") return { ok: false, message: ticket.message };

  let put;
  try {
    put = await fetch(ticket.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "content-type": file.type },
    });
  } catch (cause) {
    return uploadFailure("send", cause);
  }
  if (!put.ok) return uploadFailure("rejected", `HTTP ${String(put.status)}`);

  let confirmed;
  try {
    confirmed = await confirmDocumentUploadAction({ key: ticket.key, fileName: file.name });
  } catch (cause) {
    return uploadFailure("process", cause);
  }
  return confirmed.status === "ok"
    ? { ok: true, url: confirmed.url, bytes: confirmed.bytes }
    : { ok: false, message: confirmed.message };
}
