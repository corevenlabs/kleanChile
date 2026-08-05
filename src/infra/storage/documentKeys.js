/**
 * Cómo se llama una ficha técnica en el bucket, y cómo se lee su nombre de
 * vuelta desde la URL.
 *
 * Sin dependencias, a propósito y por la misma razón que `imageKeys.js`: esto
 * lo importa tanto un Server Action como un componente de la tienda, y ninguno
 * de los dos debería arrastrar el SDK de S3 ni el cliente de la base para
 * averiguar cómo se llama un archivo.
 *
 * ── Por qué la clave no está direccionada por contenido ──────────────────────
 *
 * Las imágenes sí lo están: la misma foto subida dos veces converge en un solo
 * juego de objetos. Para eso hay que leer los bytes, y el pipeline ya los tiene
 * en memoria porque los tiene que procesar igual.
 *
 * Un PDF no se procesa — se guarda tal como llegó. Hacer contenido-direccionable
 * su clave obligaría a bajar del bucket un archivo que el navegador acaba de
 * subir, solo para hashearlo, y a cambio deduplicaría un caso que casi no
 * ocurre: dos productos con exactamente el mismo PDF. Un UUID cuesta nada y
 * responde igual de bien.
 */

export const DOCUMENT_REVISION = "v1";

/**
 * 20 MB.
 *
 * Una ficha técnica de proveedor son dos páginas de texto; las que pasan de
 * este tamaño son casi siempre un escaneo a 600 dpi de algo que debería ser
 * texto. El límite existe para que ese archivo se detenga acá y no en el
 * navegador de un cliente con datos móviles.
 */
export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

export const DOCUMENT_CONTENT_TYPE = "application/pdf";

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * El nombre del archivo, hecho seguro para una URL.
 *
 * Se conserva reconocible en vez de reemplazarlo por el UUID porque este nombre
 * es lo que ve el cliente cuando descarga: `ficha-cloro-gel.pdf` dice qué es,
 * `a3f9e1c2-....pdf` no dice nada. El UUID va en el segmento de arriba, que es
 * donde hace falta que sea único.
 */
export function documentSlug(fileName) {
  const base = String(fileName ?? "")
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || "ficha-tecnica";
}

export function documentKey(id, fileName) {
  return `docs/${DOCUMENT_REVISION}/${id}/${documentSlug(fileName)}.pdf`;
}

/**
 * El nombre visible de una ficha, sacado de su URL.
 *
 * Deriva en vez de guardarse en una columna aparte, por la misma razón que el
 * `srcset` de una imagen: la URL ya lo lleva, y una segunda columna podría
 * quedar diciendo el nombre de un archivo que ya no es el que está enlazado.
 *
 * Vale para las URLs propias y para las de un fabricante pegadas a mano, que es
 * lo que hace que las dos clases se puedan renderizar con el mismo componente.
 */
export function documentNameFromUrl(url) {
  if (!url) return null;

  // Sin dominio no hay base contra la cual resolver, así que se recorta a mano
  // en vez de construir un `URL` que tiraría en una ruta relativa como
  // `/uploads/x.pdf`.
  const withoutQuery = String(url).split(/[?#]/)[0];
  const last = withoutQuery.split("/").filter(Boolean).pop();
  if (!last) return null;

  try {
    return decodeURIComponent(last);
  } catch {
    // Un `%` suelto en la URL hace tirar a `decodeURIComponent`. El nombre sin
    // decodificar es peor pero sigue siendo informativo.
    return last;
  }
}
