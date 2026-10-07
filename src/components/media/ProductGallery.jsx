"use client";

import { useState } from "react";
import Picture from "./Picture";
import ProductZoom from "./ProductZoom";

/**
 * La foto del producto y, si tiene más de una, sus miniaturas.
 *
 * Pasar el mouse por una miniatura cambia la foto grande, igual que hacer clic:
 * es lo que hace Amazon y lo que la gente ya espera. El clic queda para el
 * teclado y para el teléfono, donde no hay hover.
 *
 * `ProductZoom` se vuelve a montar con cada foto (`key`): guarda la imagen
 * grande del panel la primera vez que se usa, y sin eso el zoom seguiría
 * mostrando la foto anterior.
 */
export default function ProductGallery({ images, alt, enhanced = false }) {
  const [active, setActive] = useState(0);
  const src = images[active] ?? images[0] ?? "";
  const many = images.length > 1;

  return (
    <ProductZoom
      key={src}
      src={src}
      enhanced={enhanced}
      below={
        many && (
          <ul className="pdp-thumbs" aria-label="Fotos del producto">
            {images.map((url, index) => (
              <li key={url}>
                <button
                  type="button"
                  className="pdp-thumbs__item"
                  aria-label={`Ver foto ${String(index + 1)} de ${String(images.length)}`}
                  aria-pressed={index === active}
                  onClick={() => setActive(index)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setActive(index);
                  }}
                >
                  <Picture src={url} alt="" sizes="72px" />
                </button>
              </li>
            ))}
          </ul>
        )
      }
    >
      <div className="product-image-wrapper">
        {/* La principal de la página: `priority` para que no espere detrás de la
        heurística de carga diferida. */}
        <Picture
          src={src}
          alt={many ? `${alt} — foto ${String(active + 1)} de ${String(images.length)}` : alt}
          className={enhanced ? "product-image--enhanced" : undefined}
          sizes="(max-width: 900px) 100vw, 520px"
          priority
        />
      </div>
    </ProductZoom>
  );
}
