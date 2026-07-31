"use client";

import { useRef, useState } from "react";
import { uploadImageFile } from "../lib/uploadImage";
import Icon from "./Icon";

/**
 * Una imagen: una URL, con un botón de subir que la rellena.
 *
 * La URL queda editable en vez de esconderse detrás del selector de archivo,
 * porque buena parte de este catálogo apunta a imágenes alojadas en otro lado y
 * pegar una es el caso común. Subir escribe el archivo y pone su URL en la
 * misma caja, así que los dos caminos terminan en «el campo tiene una URL».
 *
 * ── Por qué está armado así ──────────────────────────────────────────────────
 *
 * La versión anterior era el `<input type="file">` nativo con la vista previa
 * debajo, y en el modal de productos eso quedaba al final de un formulario que
 * scrollea: había que bajar para encontrarlo, y **el resultado aparecía por
 * debajo del borde visible del modal**. Se elegía una foto y desde donde estaba
 * mirando la persona no cambiaba nada. Funcionaba y parecía roto.
 *
 * Ahora es un control compacto —miniatura y botón en una fila— con un estado
 * que se ve: subiendo, listo, o el error. Y al terminar se desplaza solo hasta
 * quedar a la vista, porque el cambio no sirve de nada si ocurre fuera de
 * pantalla.
 */
export default function ImageField({ label, value, onChange, wide = true }) {
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const upload = async (file) => {
    if (!file) return;

    setBusy(true);
    setError(null);
    setDone(null);

    let result;
    try {
      result = await uploadImageFile(file);
    } catch (cause) {
      // Sin esto una excepción del Server Action dejaba el componente en
      // «subiendo» para siempre y sin decir nada — el peor de los dos fallos.
      result = { ok: false, message: cause instanceof Error ? cause.message : "Error inesperado." };
    }

    setBusy(false);

    if (result.ok) {
      onChange(result.url);
      setDone(
        result.renditions
          ? `Listo · ${String(result.renditions)} versiones · ${String(result.width)}×${String(result.height)} · ${(result.bytes / 1024).toFixed(0)} KB`
          : "Listo · guardada en el servidor",
      );
    } else {
      setError(result.message ?? "No se pudo subir la imagen.");
    }

    // El resultado tiene que quedar a la vista aunque el campo esté al final de
    // un formulario que scrollea.
    boxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    // Se limpia para que elegir el mismo archivo dos veces seguidas siga
    // disparando el cambio.
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <label className={wide ? "wide" : undefined} ref={boxRef}>
      {label}

      <div className="admin-image-field">
        <div className="admin-image-field__thumb">
          {value ? (
            <img src={value} alt="" />
          ) : (
            <Icon name="portada" size={20} />
          )}
        </div>

        <div className="admin-image-field__body">
          <input
            type="text"
            value={value ?? ""}
            placeholder="https://… o sube un archivo"
            onChange={(event) => onChange(event.target.value)}
          />

          <div className="admin-image-field__actions">
            {/*
              El `<input type=file>` va oculto y lo dispara un botón nuestro. El
              nativo no se puede estilar más allá de su botón, y con dos campos
              dentro del mismo <label> su punto de clic es confuso. El botón
              además puede decir en qué estado está, que es lo que faltaba.
            */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(event) => upload(event.target.files?.[0])}
            />
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="descargar" size={14} />
              {busy ? "Subiendo…" : value ? "Reemplazar imagen" : "Subir imagen"}
            </button>

            {value && !busy && (
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => {
                  onChange("");
                  setDone(null);
                }}
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>

      {busy && <small>Subiendo y procesando…</small>}
      {done && !busy && <small className="admin-image-field__done">{done}</small>}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
