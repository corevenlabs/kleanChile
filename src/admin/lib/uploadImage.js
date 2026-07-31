import {
  requestImageUploadAction,
  storageModeAction,
  uploadImageAction,
} from "../../actions/media";

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
  const { mode } = await storageModeAction();

  if (mode === "local") {
    const body = new FormData();
    body.set("file", file);
    const result = await uploadImageAction(body);
    return result.status === "ok"
      ? { ok: true, url: result.url }
      : { ok: false, message: result.message };
  }

  const ticket = await requestImageUploadAction({ contentType: file.type });
  if (ticket.status !== "ok") return { ok: false, message: ticket.message };

  const put = await fetch(ticket.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "content-type": file.type },
  });
  if (!put.ok) {
    /*
     * El sospechoso número uno acá es CORS: el PUT sale del navegador directo
     * al bucket, así que R2 tiene que permitir el origen del sitio. Es el paso
     * que más se olvida al desplegar y da un error que no se explica solo.
     */
    return { ok: false, message: "No se pudo subir al bucket. Revisa la política CORS de R2." };
  }

  const processed = await fetch("/api/admin/media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tempKey: ticket.tempKey, fileName: file.name }),
  });

  if (!processed.ok) {
    const detail = await processed.json().catch(() => ({}));
    return {
      ok: false,
      message:
        detail.error === "unreadable"
          ? "No se pudo leer la imagen. ¿Está corrupta?"
          : "No se pudo procesar la imagen.",
    };
  }

  return processed.json();
}
