"use client";

import { useEffect, useRef } from "react";
import { buildSrc, parseRenditionUrl } from "../../infra/storage/imageKeys";

/*
 * Cuánto amplía el panel respecto de la foto tal como se ve en la página.
 *
 * Depende de la foto: tanto como su resolución real permita, dentro de este
 * rango. La mayoría del catálogo hoy viene de proveedores en menos de 600px
 * —menos que la caja donde se muestra—, y ampliar eso 3× es mostrar píxeles;
 * 2× al menos se lee. Una foto de 1600px llega a 3× y se ve nítida.
 */
const MIN_ZOOM = 2;
const MAX_ZOOM = 3;
const PANE_GAP = 24;
const PANE_MAX_WIDTH = 600;
/** Por debajo de este ancho libre a la derecha, el panel no se abre y la foto se amplía en su lugar. */
const PANE_MIN_WIDTH = 320;
const INLINE_ZOOM = 2.2;

/**
 * Zoom de la foto del producto, al estilo Amazon.
 *
 * Con mouse, un recuadro sigue al cursor sobre la foto y un panel a la derecha
 * muestra esa zona ampliada. El panel tapa la columna de información mientras
 * dura el hover, que es lo que hace Amazon: el cliente está mirando el
 * producto, no el precio. Si a la derecha no cabe un panel útil —una ventana
 * angosta— la foto se amplía dentro de su propio marco, siguiendo al cursor.
 *
 * **Solo con un puntero fino que pueda flotar.** En un teléfono no existe el
 * hover: el `:hover` de CSS que había antes se quedaba pegado al primer toque,
 * con la foto ampliada al centro y sin forma de soltarla. Esto se activa con
 * `pointerType === "mouse"`, así que un toque no hace nada.
 *
 * **El panel usa la rendition más grande que exista**, no la que eligió el
 * `srcset` para la caja de 420px. Ampliar 2,5× esa otra es ver píxeles. Una URL
 * de proveedor no trae renditions y se usa tal cual.
 *
 * Todo el seguimiento escribe estilos directo en el DOM dentro de un
 * `requestAnimationFrame`: un `setState` por cada `pointermove` re-renderizaría
 * el componente decenas de veces por segundo para mover un rectángulo.
 */
export default function ProductZoom({ src, enhanced = false, children }) {
  const rootRef = useRef(null);
  const boxRef = useRef(null);
  const lensRef = useRef(null);
  const paneRef = useRef(null);
  const state = useRef({ mode: null, frame: 0, paneWidth: 0, zoom: MIN_ZOOM });

  const parsed = src ? parseRenditionUrl(src) : null;
  const zoomSrc = parsed ? buildSrc(parsed.prefix, parsed.originalWidth, 1600, "webp") : src;

  useEffect(() => () => cancelAnimationFrame(state.current.frame), []);

  // Sin foto no hay nada que ampliar, pero la caja se dibuja igual.
  if (!src) return <div className="product-image-box">{children}</div>;

  const image = () => boxRef.current?.querySelector("img");

  /*
   * La foto usa `object-fit: contain`, así que el `<img>` mide toda la caja y la
   * imagen visible es un rectángulo menor centrado adentro. El zoom se calcula
   * sobre ese rectángulo; con el del elemento, el recuadro podría pararse sobre
   * el blanco de los costados y el panel mostraría nada.
   */
  const contentRect = (img) => {
    const r = img.getBoundingClientRect();
    if (!img.naturalWidth || !img.naturalHeight) return r;
    const scale = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    return {
      left: r.left + (r.width - width) / 2,
      top: r.top + (r.height - height) / 2,
      width,
      height,
    };
  };

  const start = (event) => {
    if (event.pointerType !== "mouse") return;
    const box = boxRef.current.getBoundingClientRect();
    const room = window.innerWidth - box.right - PANE_GAP - 16;
    const s = state.current;
    s.mode = room >= PANE_MIN_WIDTH ? "pane" : "inline";
    s.paneWidth = Math.min(PANE_MAX_WIDTH, room);
    rootRef.current.dataset.zoom = s.mode;
    const img = image();
    if (img) {
      // Ancho real de la imagen que va al panel, contra el ancho con que se ve.
      const natural = parsed ? parsed.originalWidth : img.naturalWidth;
      const shown = contentRect(img).width;
      s.zoom = clamp(shown > 0 ? natural / shown : MIN_ZOOM, MIN_ZOOM, MAX_ZOOM);
    }
    if (s.mode === "pane") {
      const pane = paneRef.current.style;
      pane.width = `${String(s.paneWidth)}px`;
      pane.height = `${String(box.height)}px`;
      /*
       * La imagen grande se pide recién aquí, no al cargar la página: la
       * mayoría de las visitas nunca pasa el mouse por la foto. Debajo va la
       * que ya está en pantalla —en caché, aparece al instante— para que el
       * primer hover no muestre un panel en blanco mientras llega la otra.
       */
      if (!pane.backgroundImage) {
        const current = image()?.currentSrc;
        pane.backgroundImage = [zoomSrc, current]
          .filter(Boolean)
          .map((url) => `url("${url}")`)
          .join(", ");
      }
    }
    track(event);
  };

  const stop = () => {
    const s = state.current;
    cancelAnimationFrame(s.frame);
    s.mode = null;
    delete rootRef.current.dataset.zoom;
    const img = image();
    if (img) img.style.transformOrigin = "";
  };

  const track = (event) => {
    const s = state.current;
    if (!s.mode) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(s.frame);
    s.frame = requestAnimationFrame(() => {
      const img = image();
      if (!img) return;
      const c = contentRect(img);

      if (s.mode === "inline") {
        const x = clamp((clientX - c.left) / c.width, 0, 1);
        const y = clamp((clientY - c.top) / c.height, 0, 1);
        img.style.transformOrigin = `${String(x * 100)}% ${String(y * 100)}%`;
        return;
      }

      const box = boxRef.current.getBoundingClientRect();
      const paneHeight = box.height;
      const lensW = Math.min(s.paneWidth / s.zoom, c.width);
      const lensH = Math.min(paneHeight / s.zoom, c.height);
      // Centrado en el cursor, pero sin salirse de la foto visible.
      const left = clamp(clientX - lensW / 2, c.left, c.left + c.width - lensW);
      const top = clamp(clientY - lensH / 2, c.top, c.top + c.height - lensH);

      const lens = lensRef.current.style;
      lens.width = `${String(lensW)}px`;
      lens.height = `${String(lensH)}px`;
      lens.transform = `translate(${String(left - box.left)}px, ${String(top - box.top)}px)`;

      const pane = paneRef.current.style;
      pane.backgroundSize = `${String(c.width * s.zoom)}px ${String(c.height * s.zoom)}px`;
      pane.backgroundPosition = `${String(-(left - c.left) * s.zoom)}px ${String(-(top - c.top) * s.zoom)}px`;
    });
  };

  return (
    <div className="pdp-zoom" ref={rootRef} style={{ "--pdp-zoom-inline": INLINE_ZOOM }}>
      <div
        className="product-image-box"
        ref={boxRef}
        onPointerEnter={start}
        onPointerMove={track}
        onPointerLeave={stop}
      >
        {children}
        <span className="pdp-zoom__lens" ref={lensRef} aria-hidden="true" />
      </div>
      <div
        className={`pdp-zoom__pane ${enhanced ? "product-image--enhanced" : ""}`}
        ref={paneRef}
        aria-hidden="true"
      />
      <p className="pdp-zoom__hint">Pasa el mouse sobre la imagen para ampliarla</p>
    </div>
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
