import { buildSrc, buildSrcSet, parseRenditionUrl } from "../../infra/storage/imageKeys";

/**
 * Una imagen del catálogo.
 *
 * Sirve las renditions que el pipeline ya produjo, directo desde el CDN.
 * `next/image` queda deliberadamente fuera: reoptimizaría archivos que ya están
 * óptimos, con un medidor por imagen, delante de un bucket cuyo egreso es
 * gratis.
 *
 * **Acepta cualquier URL.** Si reconoce una URL de rendition arma el `<picture>`
 * con su `srcset`; si no —una URL de proveedor, una foto vieja en `/uploads/`—
 * cae a un `<img>` simple. Esa es la razón de que el catálogo pueda mezclar
 * imágenes procesadas y externas sin que ningún componente sepa cuál es cuál, y
 * de que esto se pueda ir colocando de a poco en vez de en una sola pasada.
 *
 * `width`/`height` salen de la URL cuando están disponibles, así que el
 * navegador reserva la caja correcta antes de que llegue un solo byte. En una
 * grilla de veinte productos eso es la diferencia entre una página que se
 * asienta y una que salta hasta que termina de cargar.
 */
export default function Picture({
  src,
  alt = "",
  sizes = "100vw",
  priority = false,
  className,
  ...rest
}) {
  /*
   * Sin imagen no se dibuja un `<img>` vacío.
   *
   * `src=""` le dice al navegador que vuelva a pedir la página actual, React lo
   * reporta como error, y en desarrollo el overlay de Next se abre encima de
   * todo y bloquea los clics. Un producto sin foto es un caso normal —el
   * importador acepta filas sin columna de imagen— así que se resuelve acá y no
   * en cada sitio que llama.
   */
  if (!src) {
    return <span className={className} aria-hidden="true" data-sin-imagen="" {...rest} />;
  }

  const parsed = parseRenditionUrl(src);

  const img = (
    <img
      src={parsed ? buildSrc(parsed.prefix, parsed.originalWidth, 1024, "webp") : src}
      alt={alt}
      {...(parsed ? { width: parsed.originalWidth, height: parsed.originalHeight } : {})}
      loading={priority ? "eager" : "lazy"}
      // `high` en la imagen principal y `auto` en el resto; si no, el navegador
      // trata cada imagen bajo el pliegue como igual de urgente.
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className={className}
      {...rest}
    />
  );

  if (!parsed) return img;

  return (
    <picture>
      <source
        type="image/avif"
        sizes={sizes}
        srcSet={buildSrcSet(parsed.prefix, parsed.originalWidth, "avif")}
      />
      <source
        type="image/webp"
        sizes={sizes}
        srcSet={buildSrcSet(parsed.prefix, parsed.originalWidth, "webp")}
      />
      {img}
    </picture>
  );
}
