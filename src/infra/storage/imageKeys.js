/**
 * Cómo se nombra una imagen procesada.
 *
 * Separado de `imagePipeline.js` a propósito: ese módulo importa `sharp`, un
 * binario nativo que no tiene por qué ser alcanzable desde el grafo de módulos
 * de una página. La tienda solo necesita **nombrar** renditions, nunca
 * producirlas, así que todo lo relacionado con nombres vive acá sin una sola
 * dependencia.
 *
 * ── La decisión que define el resto ──────────────────────────────────────────
 *
 * En azarwear una imagen es una fila de la tabla `media` y el producto guarda
 * una referencia. Acá una imagen **es una URL**, y eso no cambia: el catálogo
 * sembrado apunta a URLs de proveedor, el importador toma una columna de URL, y
 * el editor deja pegar cualquier enlace. Cambiar eso obligaría a migrar el
 * esquema, el importador, el seed y todos los componentes.
 *
 * Así que la URL se vuelve autodescriptiva: las dimensiones del original van
 * dentro de la ruta.
 *
 *     img/v1/<hash>/<anchoOriginal>x<altoOriginal>/<ancho>.<formato>
 *
 * De ahí salen tres propiedades que valen más que la tabla:
 *
 * - Un `<img src={product.image}>` sin tocar **sigue funcionando**: lo que se
 *   guarda es una imagen de verdad, no un identificador.
 * - El `srcset` completo se deriva **sin consultar la base**, porque el ancho
 *   original —lo único que hace falta para saber qué renditions existen— viaja
 *   en la propia URL.
 * - Una URL externa de proveedor no calza con el patrón, `parseRenditionUrl`
 *   devuelve null y se renderiza como imagen simple. Los dos casos conviven.
 */

/**
 * Los anchos del escalón.
 *
 * Elegidos contra cómo se ve el sitio de verdad: las tarjetas del catálogo van
 * en una grilla de 4 columnas sobre 1280px (≈300px cada una), el detalle de
 * producto ocupa media pantalla y el hero va a sangre completa.
 */
export const IMAGE_WIDTHS = [320, 640, 1024, 1600, 2400];

/** AVIF primero, WebP como respaldo para los navegadores que no lo tienen. */
export const IMAGE_FORMATS = ["avif", "webp"];

/**
 * WebP no se genera por encima de este ancho.
 *
 * Existe solo para navegadores sin AVIF, hoy una minoría, y comprime bastante
 * peor. Esos navegadores llegan hasta un original de 1600px en una pantalla
 * grande: un poco menos nítido si lo miras de cerca, y una fracción de los
 * bytes.
 */
export const WEBP_MAX_WIDTH = 1600;

/**
 * Revisión del codificador, incrustada en cada clave.
 *
 * Se sube cuando cambian anchos, formatos o calidades, para que los ajustes
 * nuevos escriban en claves nuevas en vez de chocar con objetos codificados con
 * los viejos. Sin esto, cambiar la calidad no tendría efecto sobre ninguna
 * imagen ya subida y nadie se enteraría.
 */
export const PIPELINE_REVISION = "v1";

/** El prefijo bajo el que viven todas las renditions de un original. */
export function mediaPrefix(hash, originalWidth, originalHeight) {
  return `img/${PIPELINE_REVISION}/${hash}/${String(originalWidth)}x${String(originalHeight)}`;
}

export function renditionKey(prefix, width, format) {
  return `${prefix}/${String(width)}.${format}`;
}

/**
 * Qué anchos existen de verdad para un original de este tamaño.
 *
 * El pipeline nunca agranda, así que un original de 1200px no tiene rendition
 * de 1600 ni de 2400, y listarlas en un `srcset` sería entregarle al navegador
 * URLs que dan 404. Esto replica la selección que hace `processImage`,
 * incluyendo su caso de borde: un original más chico que todos los escalones
 * conserva una sola rendition a su tamaño nativo.
 */
export function availableWidths(originalWidth) {
  const widths = IMAGE_WIDTHS.filter((width) => width <= originalWidth);
  return widths.length > 0 ? widths : [originalWidth];
}

const trimSlash = (value) => value.replace(/\/+$/, "");

/**
 * Lee una URL de rendition y devuelve con qué se armó.
 *
 * `null` para cualquier otra cosa —una URL de proveedor, una ruta local, una
 * imagen vieja de `/uploads/`— y eso es lo que permite que el catálogo mezcle
 * imágenes procesadas con externas sin que ningún componente tenga que saber
 * cuál es cuál.
 */
export function parseRenditionUrl(url) {
  if (typeof url !== "string") return null;

  const match = /^(.*\/img\/[^/]+\/[0-9a-f]+\/(\d+)x(\d+))\/(\d+)\.(avif|webp)$/.exec(url);
  if (!match) return null;

  const [, prefix, width, height] = match;
  return {
    prefix,
    originalWidth: Number(width),
    originalHeight: Number(height),
  };
}

/**
 * El `srcset` de una imagen procesada.
 *
 * Se rinde dentro de un `<source>` para que el navegador descargue exactamente
 * un archivo, elegido con su propio viewport y densidad de pantalla.
 */
export function buildSrcSet(prefix, originalWidth, format) {
  const base = trimSlash(prefix);

  return availableWidths(originalWidth)
    .filter((width) => format !== "webp" || width <= WEBP_MAX_WIDTH)
    .map((width) => `${base}/${String(width)}.${format} ${String(width)}w`)
    .join(", ");
}

/**
 * Una sola URL de rendition, para el `src` de respaldo.
 *
 * Acotada a un ancho que exista, para que el respaldo no sea justamente la
 * única URL de la página que falla.
 */
export function buildSrc(prefix, originalWidth, preferredWidth, format) {
  const widths = availableWidths(originalWidth).filter(
    (width) => format !== "webp" || width <= WEBP_MAX_WIDTH,
  );

  const chosen =
    widths.find((width) => width >= preferredWidth) ??
    widths[widths.length - 1] ??
    originalWidth;

  return `${trimSlash(prefix)}/${String(chosen)}.${format}`;
}
