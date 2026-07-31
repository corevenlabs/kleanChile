import { z } from "zod";
import { ingestUploadedImage } from "../../../../src/infra/media/ingest.js";
import { requireUser } from "../../../../src/lib/adminSession.js";

/**
 * Convertir una imagen subida en su escalón de renditions.
 *
 * Un Route Handler y no un Server Action por una razón concreta: acá es donde
 * corre `sharp`, y tenerlo detrás de un endpoint Node explícito —externalizado
 * en `next.config.js`— mantiene el binario nativo fuera de la traza de
 * dependencias de todos los demás módulos de servidor. Es además la forma
 * natural de «hacer trabajo pesado y devolver un JSON chico».
 *
 * Guardado como toda superficie del panel: un Route Handler es una URL pública,
 * así que revisa la sesión él mismo en vez de confiar en nada río arriba.
 */

const bodySchema = z.object({
  tempKey: z.string().min(1),
  fileName: z.string().max(200).optional(),
});

export async function POST(request) {
  const user = await requireUser();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_input" }, { status: 400 });
  }

  // La clave tiene que ser una de las que acabamos de entregar. Rechazar
  // cualquier cosa fuera del prefijo temporal impide que esto se use para
  // procesar —y borrar— un objeto arbitrario del bucket.
  if (!parsed.data.tempKey.startsWith("uploads/tmp/")) {
    return Response.json({ error: "invalid_key" }, { status: 400 });
  }

  const result = await ingestUploadedImage({
    tempKey: parsed.data.tempKey,
    fileName: parsed.data.fileName,
    actorId: user.id,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.error === "not_found" ? 404 : 422 });
  }

  return Response.json(result);
}
