"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_FRAME, HERO_VIEWS, frameSharpness } from "../../domain/content/heroFrame";
import HeroSlideMedia from "../../View/Banner/HeroSlideMedia";
import ImageField from "./ImageField";

/**
 * Imagen, imagen de celular y encuadre de una diapositiva, con vista previa.
 *
 * ── Por qué así ─────────────────────────────────────────────────────────────
 *
 * El carrusel recortaba cada foto con `object-fit: cover` contra un marco cuyo
 * alto dependía de la ventana, sin ningún control. Un banner con texto propio
 * perdía los bordes, y uno chico se agrandaba hasta verse pixelado; desde el
 * panel no había forma de saberlo antes de publicar.
 *
 * Ahora el marco tiene proporciones fijas y cada diapositiva guarda cómo se
 * encuadra en cada una (`frame` para computador, `frameMobile` para celular
 * y tablet): llenar el marco o mostrar la imagen completa, qué punto queda a la
 * vista y cuánto se acerca. Nunca se estira: el zoom escala los dos ejes por
 * igual, así que «distorsionar» deja de ser posible.
 *
 * La vista previa es el carrusel de verdad —las mismas clases y el mismo
 * `HeroSlideMedia`— dibujado al ancho real y escalado. Los textos del carrusel
 * responden al ancho del carrusel (`@container`), no al de la ventana, y por
 * eso la vista de celular muestra los mismos cortes de línea que un teléfono.
 *
 * Mientras se arrastra, el encuadre vive en estado local y se entrega al soltar:
 * entregarlo en cada movimiento re-renderizaba el formulario entero sesenta
 * veces por segundo.
 */

const STEP = 1;
const BIG_STEP = 5;
const ZOOM_STEP = 10;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const round1 = (n) => Math.round(n * 10) / 10;

function useNaturalSize(src) {
  const [size, setSize] = useState(null);

  useEffect(() => {
    if (!src) return undefined;
    let alive = true;
    const probe = new Image();
    probe.onload = () => {
      if (alive) setSize({ src, naturalWidth: probe.naturalWidth, naturalHeight: probe.naturalHeight });
    };
    probe.onerror = () => {
      if (alive) setSize({ src, failed: true });
    };
    probe.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  // Una medida de la imagen anterior no sirve para la actual.
  return size?.src === src ? size : null;
}

/** El carrusel real, dibujado al ancho de `view` y escalado al de su caja. */
function HeroPreview({ view, slide, image, frame, children }) {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const measure = () => setScale(box.clientWidth / view.width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [view.width]);

  const bare = !slide.title && !slide.description;

  return (
    <div ref={boxRef} className="hero-preview" style={{ aspectRatio: String(view.ratio) }}>
      <div
        className="hero hero--preview"
        aria-hidden="true"
        style={{
          width: view.width,
          height: view.width / view.ratio,
          transform: `scale(${String(scale ?? 0)})`,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        <div className="hero__bg">
          <HeroSlideMedia image={image} frame={frame} frameMobile={frame} eager />
          <div className={`hero__overlay ${bare ? "hero__overlay--bare" : ""}`} />
        </div>
        <div className="hero__content">
          {slide.eyebrow && <div className="hero__eyebrow">{slide.eyebrow}</div>}
          {slide.title && <div className="hero__title">{slide.title}</div>}
          {slide.description && <div className="hero__desc">{slide.description}</div>}
          {slide.cta && <span className="hero__cta">{slide.cta}</span>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function HeroSlideMediaField({ label, slide, onChange }) {
  const [viewKey, setViewKey] = useState("desktop");
  // El encuadre mientras se arrastra; null cuando manda el guardado en el borrador.
  const [live, setLive] = useState(null);
  const drag = useRef(null);
  const stageRef = useRef(null);

  const view = HERO_VIEWS.find((entry) => entry.key === viewKey);
  const imageFor = (entry) =>
    entry.frame === "frameMobile" ? slide.imageMobile || slide.image : slide.image || slide.imageMobile;
  const frameFor = (entry) => ({ ...DEFAULT_FRAME, ...slide[entry.frame] });

  const image = imageFor(view);
  const stored = frameFor(view);
  const frame = live ?? stored;
  const contain = frame.fit === "contain";
  const size = useNaturalSize(image);

  const commit = (next) => {
    onChange({ ...slide, [view.frame]: next });
  };
  const patch = (changes) => commit({ ...frame, ...changes });

  /*
   * Cuánto se mueve `x`/`y` por píxel arrastrado, para que la foto siga al
   * puntero exactamente. Con `object-position` en x% y el zoom anclado en ese
   * mismo punto, la foto se corre (anchoDibujado − anchoMarco)/100 píxeles por
   * cada 1 % — lineal, así que basta invertirlo.
   */
  const slack = () => {
    if (!size?.naturalWidth) return null;
    const boxW = view.width;
    const boxH = view.width / view.ratio;
    const cover = Math.max(boxW / size.naturalWidth, boxH / size.naturalHeight) * (frame.zoom / 100);
    return { x: size.naturalWidth * cover - boxW, y: size.naturalHeight * cover - boxH };
  };

  const onPointerDown = (event) => {
    // Un segundo dedo no reinicia el arrastre: sin esto la foto salta al
    // cambiar de dedo.
    if (contain || drag.current || !size?.naturalWidth) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      from: frame,
      scale: stageRef.current ? stageRef.current.clientWidth / view.width : 1,
      slack: slack(),
    };
  };

  const onPointerMove = (event) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = (event.clientX - d.startX) / d.scale;
    const dy = (event.clientY - d.startY) / d.scale;
    setLive({
      ...d.from,
      x: d.slack.x > 0.5 ? round1(clamp(d.from.x - (dx * 100) / d.slack.x, 0, 100)) : d.from.x,
      y: d.slack.y > 0.5 ? round1(clamp(d.from.y - (dy * 100) / d.slack.y, 0, 100)) : d.from.y,
    });
  };

  const endDrag = (event) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (live) commit(live);
    setLive(null);
  };

  const onKeyDown = (event) => {
    if (contain) return;
    const step = event.shiftKey ? BIG_STEP : STEP;
    // Las flechas mueven la foto, igual que arrastrarla.
    const moves = {
      ArrowLeft: { x: clamp(frame.x + step, 0, 100) },
      ArrowRight: { x: clamp(frame.x - step, 0, 100) },
      ArrowUp: { y: clamp(frame.y + step, 0, 100) },
      ArrowDown: { y: clamp(frame.y - step, 0, 100) },
      "+": { zoom: clamp(frame.zoom + ZOOM_STEP, 100, 300) },
      "=": { zoom: clamp(frame.zoom + ZOOM_STEP, 100, 300) },
      "-": { zoom: clamp(frame.zoom - ZOOM_STEP, 100, 300) },
    };
    const change = moves[event.key];
    if (!change) return;
    event.preventDefault();
    patch(change);
  };

  const sharpness = size?.naturalWidth
    ? frameSharpness(size, frame, view.width, view.width / view.ratio)
    : null;

  const hasImage = Boolean(slide.image || slide.imageMobile);

  return (
    <div className="wide slide-media">
      <div className="slide-media__sources">
        <ImageField
          label={label}
          value={slide.image}
          onChange={(value) => onChange({ ...slide, image: value })}
        />
        <ImageField
          label="Imagen para celular (opcional)"
          value={slide.imageMobile}
          onChange={(value) => onChange({ ...slide, imageMobile: value })}
        />
      </div>

      {hasImage && (
        <div className="frame-editor">
          <div className="frame-editor__head">
            <div>
              <strong>Encuadre</strong>
              <span>Elige un tamaño de pantalla y arrastra la imagen para elegir qué se ve.</span>
            </div>
          </div>

          <div className="frame-editor__views" role="tablist" aria-label="Tamaño de pantalla">
            {HERO_VIEWS.map((entry) => {
              const selected = entry.key === viewKey;
              return (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`frame-editor__view ${selected ? "is-active" : ""}`}
                  style={{ "--thumb-w": `${String(Math.round(84 * Math.sqrt(entry.ratio)))}px` }}
                  onClick={() => {
                    setLive(null);
                    setViewKey(entry.key);
                  }}
                >
                  <HeroPreview
                    view={entry}
                    slide={slide}
                    image={imageFor(entry)}
                    frame={entry.key === viewKey ? frame : frameFor(entry)}
                  />
                  <span>
                    {entry.label}
                    <small>{entry.ratioLabel}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={`frame-editor__stage frame-editor__stage--${view.key}`}
            ref={stageRef}
          >
            <HeroPreview view={view} slide={slide} image={image} frame={frame}>
              <div
                className={`frame-editor__grab ${contain ? "is-static" : ""} ${live ? "is-dragging" : ""}`}
                role="application"
                tabIndex={0}
                aria-label={
                  contain
                    ? "Vista previa. La imagen se muestra completa."
                    : "Encuadre: arrastra la imagen, o usa las flechas para moverla y + o − para acercar."
                }
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={onKeyDown}
              >
                {!contain && <span className="frame-editor__hint">Arrastra para mover</span>}
              </div>
            </HeroPreview>
          </div>

          <div className="frame-editor__controls">
            <div className="frame-editor__seg" role="group" aria-label="Cómo se ajusta la imagen">
              <button
                type="button"
                aria-pressed={!contain}
                onClick={() => patch({ fit: "cover" })}
              >
                Llenar el marco
              </button>
              <button
                type="button"
                aria-pressed={contain}
                onClick={() => patch({ fit: "contain" })}
              >
                Imagen completa
              </button>
            </div>

            <div className={`frame-editor__zoom ${contain ? "is-disabled" : ""}`}>
              <span aria-hidden="true">Zoom</span>
              <button
                type="button"
                aria-label="Alejar"
                disabled={contain || frame.zoom <= 100}
                onClick={() => patch({ zoom: clamp(frame.zoom - ZOOM_STEP, 100, 300) })}
              >
                −
              </button>
              <input
                type="range"
                min={100}
                max={300}
                step={1}
                value={frame.zoom}
                disabled={contain}
                aria-label="Zoom"
                onChange={(event) => patch({ zoom: Number(event.target.value) })}
              />
              <button
                type="button"
                aria-label="Acercar"
                disabled={contain || frame.zoom >= 300}
                onClick={() => patch({ zoom: clamp(frame.zoom + ZOOM_STEP, 100, 300) })}
              >
                +
              </button>
              <output>{String(Math.round(frame.zoom))}%</output>
            </div>

            <button
              type="button"
              className="admin-button admin-button--ghost frame-editor__reset"
              onClick={() => patch({ x: 50, y: 50, zoom: 100 })}
              disabled={contain}
            >
              Centrar
            </button>
          </div>

          <ul className="frame-editor__notes">
            {contain && (
              <li>
                La imagen se ve entera, con la misma foto desenfocada a los costados. Úsalo para
                banners que traen su propio texto y no se pueden recortar.
              </li>
            )}
            {view.key === "mobile" && !slide.imageMobile && (
              <li>
                En celular y tablet se usa la misma imagen, encuadrada aparte. Si el banner trae
                texto, conviene subir una versión vertical (8:9) en «Imagen para celular».
              </li>
            )}
            {size?.failed && <li className="is-warn">No pudimos cargar esta imagen para medirla.</li>}
            {size?.naturalWidth && (
              <li className={sharpness !== null && sharpness < 1 ? "is-warn" : undefined}>
                Tu imagen: {String(size.naturalWidth)} × {String(size.naturalHeight)} px · recomendado{" "}
                {view.recommended} o más.
                {sharpness !== null && sharpness < 1 &&
                  (frame.zoom > 100 && !contain
                    ? " Con este zoom es más chica que el marco y se verá borrosa: acerca menos o sube una más grande."
                    : " Es más chica que el marco y se verá borrosa.")}
                {sharpness !== null && sharpness >= 1 && sharpness < 1.5 && (
                  <> Se verá bien; en pantallas de alta resolución puede verse algo suave.</>
                )}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
