"use client";

import { useRef, useState } from "react";
import { uploadImageFile } from "../lib/uploadImage";

/**
 * Una imagen: una URL, con un botón de subir que la rellena.
 *
 * La URL queda editable en vez de esconderse detrás del selector de archivo,
 * porque buena parte de este catálogo apunta a imágenes alojadas en otro lado y
 * pegar una es el caso común. Subir escribe el archivo y pone su URL en la
 * misma caja, así que los dos caminos terminan en «el campo tiene una URL».
 *
 * Con R2 configurado, subir además genera el escalón AVIF/WebP y lo que queda
 * en el campo es una URL de la que la tienda puede derivar un `srcset` — ver
 * `infra/storage/imageKeys.js`.
 */
export default function ImageField({ label, value, onChange, wide = true }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  const upload = async (file) => {
    if (!file) return;

    setBusy(true);
    setError(null);
    setDetail(null);

    const result = await uploadImageFile(file);

    setBusy(false);
    if (result.ok) {
      onChange(result.url);
      // Se muestra qué se generó: es la única señal de que el pipeline corrió y
      // de que la foto de 4 MB que acaba de arrastrar ya no pesa eso.
      if (result.renditions) {
        setDetail(
          `${String(result.renditions)} versiones · ${String(result.width)}×${String(result.height)} · ${(result.bytes / 1024).toFixed(0)} KB en total`,
        );
      }
    } else {
      setError(result.message ?? "No se pudo subir la imagen.");
    }

    // Se limpia para que elegir el mismo archivo dos veces seguidas siga
    // disparando el cambio.
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      <input
        type="text"
        value={value ?? ""}
        placeholder="https://… o sube un archivo"
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(event) => upload(event.target.files?.[0])}
      />
      {busy && <small>Subiendo y procesando…</small>}
      {detail && <small>{detail}</small>}
      {error && <small role="alert">{error}</small>}
      {value && <img className="admin-image-preview" src={value} alt="Vista previa" />}
    </label>
  );
}
