/**
 * Cómo se encuadra una imagen del carrusel de portada.
 *
 * El carrusel tiene **proporciones fijas** por tamaño de pantalla, no un alto
 * en `vh`. Con un alto atado a la ventana, el mismo banner se recortaba distinto
 * en cada monitor y ninguna vista previa podía prometer nada. Con proporciones
 * fijas, lo que el admin ve en el editor es lo que sale en la tienda.
 *
 * Computador es 5:2 y no 3:1: con 3:1, a 1030px de ancho una diapositiva con
 * antetítulo, título de dos líneas y descripción no cabía y perdía la primera
 * línea por arriba.
 *
 * Los cortes tienen que coincidir con `View/Banner/Banner.css`.
 */
export const HERO_VIEWS = [
  {
    key: "desktop",
    label: "Computador",
    ratio: 5 / 2,
    ratioLabel: "5:2",
    // Ancho del hero en una ventana de 1440px (menos los 30px de margen a cada
    // lado): la vista previa se dibuja a ese tamaño y se escala.
    width: 1380,
    frame: "frame",
    recommended: "2000 × 800 px",
  },
  {
    key: "tablet",
    label: "Tablet",
    ratio: 16 / 9,
    ratioLabel: "16:9",
    width: 728,
    frame: "frame",
    recommended: "2000 × 800 px",
  },
  {
    key: "mobile",
    label: "Celular",
    ratio: 1,
    ratioLabel: "1:1",
    width: 366,
    frame: "frameMobile",
    recommended: "1080 × 1080 px",
  },
];

/** Por debajo de este ancho de ventana manda la imagen y el encuadre de celular. */
export const HERO_MOBILE_QUERY = "(max-width: 600px)";

export const DEFAULT_FRAME = { fit: "cover", x: 50, y: 30, zoom: 100 };

/**
 * Las variables CSS de un encuadre, con un prefijo por tamaño (`d-` o `m-`).
 *
 * El zoom es un `scale` con origen en el mismo punto que `object-position`:
 * ese punto de la foto queda clavado en su lugar del marco al acercar, así que
 * acercar nunca deja un borde vacío ni mueve lo que se eligió mostrar.
 *
 * En `contain` no hay recorte que encuadrar: se centra y no se acerca.
 */
export function frameVars(frame, prefix) {
  const f = { ...DEFAULT_FRAME, ...frame };
  const contain = f.fit === "contain";
  return {
    [`--${prefix}fit`]: contain ? "contain" : "cover",
    [`--${prefix}x`]: `${String(contain ? 50 : f.x)}%`,
    [`--${prefix}y`]: `${String(contain ? 50 : f.y)}%`,
    [`--${prefix}z`]: String(contain ? 1 : f.zoom / 100),
    [`--${prefix}backdrop`]: contain ? "block" : "none",
  };
}

/**
 * Cuántos píxeles de la foto caen en cada píxel del marco, con el encuadre
 * aplicado. Bajo 1 la foto se estira y se ve borrosa.
 *
 * `boxW`/`boxH` en píxeles CSS; se pide el doble para pantallas retina, así que
 * quien llama compara contra 1 (aceptable) y 2 (nítido).
 */
export function frameSharpness({ naturalWidth, naturalHeight }, frame, boxW, boxH) {
  if (!naturalWidth || !naturalHeight) return null;
  const f = { ...DEFAULT_FRAME, ...frame };
  const fill = f.fit === "contain" ? Math.min : Math.max;
  const scale = fill(boxW / naturalWidth, boxH / naturalHeight) * (f.fit === "contain" ? 1 : f.zoom / 100);
  return 1 / scale;
}
