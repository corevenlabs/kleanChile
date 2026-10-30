import { HERO_MOBILE_QUERY, frameVars } from "../../domain/content/heroFrame.js";

/**
 * La imagen de una diapositiva, ya encuadrada.
 *
 * La misma pieza dibuja la portada y la vista previa del panel, que es lo que
 * hace que la vista previa no mienta: no hay una segunda implementación del
 * encuadre que pueda derivar de la primera.
 *
 * El encuadre de computador y el de celular viajan juntos como variables CSS
 * (`--d-*`, `--m-*`) y `Banner.css` elige cuál aplica con una media query. La
 * vista previa pasa el mismo encuadre en los dos y una sola imagen, así que se
 * ve igual sin importar el ancho de la ventana del panel.
 *
 * `contain` dibuja detrás una copia desenfocada de la misma foto en vez de
 * franjas negras: es la misma URL, así que no cuesta una descarga más.
 */
export default function HeroSlideMedia({
  image,
  imageMobile = "",
  frame,
  frameMobile,
  alt = "",
  active = true,
  hidden = false,
  eager = false,
}) {
  if (!image && !imageMobile) return null;

  const main = image || imageMobile;
  const contain = frame?.fit === "contain" || frameMobile?.fit === "contain";

  const sources = (className, imgAlt, extra = {}) => (
    <picture className={className}>
      {imageMobile && <source media={HERO_MOBILE_QUERY} srcSet={imageMobile} />}
      <img src={main} alt={imgAlt} draggable={false} {...extra} />
    </picture>
  );

  return (
    <div
      className={`hero__slide ${active ? "active" : ""}`}
      style={{ ...frameVars(frame, "d-"), ...frameVars(frameMobile ?? frame, "m-") }}
    >
      {contain && sources("hero__backdrop", "", { "aria-hidden": "true" })}
      {sources("hero__picture", hidden ? "" : alt, {
        className: "hero__img",
        "aria-hidden": hidden ? "true" : undefined,
        loading: eager ? "eager" : "lazy",
        fetchPriority: eager ? "high" : "low",
      })}
    </div>
  );
}
