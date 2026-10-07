import {
  requestImageUploadAction,
  storageModeAction,
  uploadImageAction,
} from "../../actions/media";
import { uploadFailure } from "./uploadErrors";

/**
 * El lado del navegador de una subida, en un solo lugar.
 *
 * Con R2: pedir una URL firmada, hacer PUT del original directo al bucket
 * —nunca por el servidor— y después pedirle a la ruta de procesamiento que lo
 * convierta en renditions. Sin R2: mandar el archivo por el Server Action de
 * siempre.
 *
 * Cuál de los dos se decide en el servidor y no acá, porque el navegador no
 * tiene por qué conocer la configuración del despliegue. Los dos devuelven lo
 * mismo: una URL.
 */
export async function uploadImageFile(file) {
  /*
   * Cada paso por separado, porque «Failed to fetch» no dice cuál falló y la
   * respuesta cambia según el paso: un error al preparar es configuración, uno
   * al enviar es CORS o red, uno al procesar ya dejó el original en el bucket.
   */
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
      const result = await uploadImageAction(body);
      return result.status === "ok"
        ? { ok: true, url: result.url }
        : { ok: false, message: result.message };
    } catch (cause) {
      return uploadFailure("send", cause);
    }
  }

  let ticket;
  try {
    ticket = await requestImageUploadAction({ contentType: file.type });
  } catch (cause) {
    return uploadFailure("prepare", cause);
  }
  if (ticket.status !== "ok") return { ok: false, message: ticket.message };

  /*
   * El PUT sale del navegador directo al bucket. Si el origen del sitio no está
   * en la política CORS de R2 —el paso que más se olvida al cambiar de
   * dominio— el navegador lo bloquea antes de recibir respuesta: eso es el
   * `catch`, no el `!put.ok`.
   */
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

  let processed;
  try {
    processed = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tempKey: ticket.tempKey, fileName: file.name }),
    });
  } catch (cause) {
    return uploadFailure("process", cause);
  }

  if (!processed.ok) {
    const detail = await processed.json().catch(() => ({}));
    if (detail.error === "unreadable") {
      return {
        ok: false,
        message: "No pudimos leer esa imagen. Puede estar dañada; prueba exportarla de nuevo como JPG o PNG.",
      };
    }
    return uploadFailure("process", `HTTP ${String(processed.status)}`);
  }

  return processed.json();
}
