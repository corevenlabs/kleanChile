/**
 * Cómo se encuadra una imagen del carrusel de portada.
 *
 * El carrusel tiene **proporciones fijas** por tamaño de pantalla, no un alto
 * en `vh`. Con un alto atado a la ventana, el mismo banner se recortaba distinto
 * en cada monitor y ninguna vista previa podía prometer nada. Con proporciones
 * fijas, lo que el admin ve en el editor es lo que sale en la tienda.
 *
 * Las medidas son las de prisur.cl, la referencia que eligió el cliente porque
 * el 5:2 anterior se veía demasiado alto: 1920 × 416 en computador, de borde a
 * borde, y 8:9 en celular y tablet, con el corte en 992px.
 *
 * Los cortes tienen que coincidir con `View/Banner/Banner.css`.
 */
export const HERO_VIEWS = [
  {
    key: "desktop",
    label: "Computador",
    ratio: 60 / 13,
    ratioLabel: "1920 × 416",
    // Ancho del carrusel en una ventana de 1440px (va de borde a borde): la
    // vista previa se dibuja a ese tamaño y se escala.
    width: 1440,
    frame: "frame",
    recommended: "1920 × 416 px (ideal 3840 × 832)",
  },
  {
    key: "mobile",
    label: "Celular y tablet",
    ratio: 8 / 9,
    ratioLabel: "8:9",
    width: 390,
    frame: "frameMobile",
    recommended: "1080 × 1215 px",
  },
];

/** Hasta este ancho de ventana manda la imagen y el encuadre de celular. */
export const HERO_MOBILE_QUERY = "(max-width: 992px)";

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
