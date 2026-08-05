import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Sirve los archivos subidos al disco local.
 *
 * Next fija el contenido de `public/` en el momento del build, así que un
 * archivo escrito ahí **después** no lo sirve: `next start` devuelve 404. En
 * `next dev` funciona, y esa diferencia es exactamente la que hace que subir
 * una imagen parezca andar en desarrollo y esté rota en producción.
 *
 * Con esta ruta el camino de disco funciona igual en los tres modos, que es lo
 * que hace honesta la opción «VPS o contenedor con volumen» de `docs/DEPLOY.md`.
 * Con R2 configurado nada pasa por acá: las URLs apuntan al CDN.
 *
 * Sigue sin servir para un host serverless — el disco es efímero y por
 * instancia, así que el archivo no está para la siguiente petición.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  /* Las fichas técnicas siguen exactamente el mismo camino que las imágenes
     cuando no hay bucket configurado. Sin esta línea la subida parece funcionar
     —el archivo queda escrito en disco— y el enlace da 404. */
  ".pdf": "application/pdf",
};

export async function GET(request, { params }) {
  const { path: segments } = await params;

  /*
   * Se resuelve la ruta completa y se comprueba que caiga dentro del
   * directorio. Un segmento `..` viaja en la URL sin problema, y unirlo a un
   * directorio sin verificar el resultado es cómo una ruta de archivos estáticos
   * termina sirviendo `.env.local`.
   */
  const target = path.resolve(UPLOAD_DIR, ...segments);
  if (target !== UPLOAD_DIR && !target.startsWith(UPLOAD_DIR + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  const type = TYPES[path.extname(target).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  let info;
  try {
    info = await stat(target);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!info.isFile()) return new Response("Not found", { status: 404 });

  return new Response(Readable.toWeb(createReadStream(target)), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(info.size),
      /*
       * Una hora, no un año. Estos nombres llevan bytes aleatorios, no un hash
       * del contenido, así que nada garantiza que el archivo en una ruta dada
       * sea siempre el mismo — a diferencia de las claves de R2, que sí van
       * direccionadas por contenido y por eso se cachean para siempre.
       */
      "Cache-Control": "public, max-age=3600",
    },
  });
}
