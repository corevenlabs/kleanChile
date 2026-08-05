import {
  confirmDocumentUploadAction,
  requestDocumentUploadAction,
  storageModeAction,
  uploadDocumentAction,
} from "../../actions/media";

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
  const { mode } = await storageModeAction();

  if (mode === "local") {
    const body = new FormData();
    body.set("file", file);
    const result = await uploadDocumentAction(body);
    return result.status === "ok"
      ? { ok: true, url: result.url }
      : { ok: false, message: result.message };
  }

  const ticket = await requestDocumentUploadAction({
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
  if (ticket.status !== "ok") return { ok: false, message: ticket.message };

  const put = await fetch(ticket.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "content-type": file.type },
  });
  if (!put.ok) {
    // Igual que con las imágenes: el PUT sale del navegador directo al bucket,
    // así que CORS es el sospechoso número uno y conviene nombrarlo.
    return { ok: false, message: "No se pudo subir al bucket. Revisa la política CORS de R2." };
  }

  const confirmed = await confirmDocumentUploadAction({ key: ticket.key, fileName: file.name });
  return confirmed.status === "ok"
    ? { ok: true, url: confirmed.url, bytes: confirmed.bytes }
    : { ok: false, message: confirmed.message };
}
