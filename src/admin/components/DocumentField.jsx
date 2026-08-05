"use client";

import { useRef, useState } from "react";
import { uploadDocumentFile } from "../lib/uploadDocument";
import { documentNameFromUrl } from "../../infra/storage/documentKeys";
import Icon from "./Icon";

/**
 * La ficha técnica en PDF: una URL, con un botón que la rellena.
 *
 * Gemelo de `ImageField` a propósito, hasta en la disposición: son la misma
 * clase de campo —un archivo que termina siendo una URL— y que se comporten
 * igual es lo que hace que aprender uno alcance para los dos.
 *
 * La caja de la URL queda editable por la misma razón que allá: buena parte de
 * las fichas técnicas ya viven publicadas en el sitio del fabricante, y pegar
 * ese enlace es tan válido como subir el archivo.
 *
 * Lo que este campo tiene y el otro no es la advertencia: subir un PDF **cambia
 * lo que ve el cliente en la ficha del producto**, que pasa a mostrar el
 * documento en vez de la tabla de especificaciones. Es una consecuencia que no
 * se deduce de un botón que dice «Subir PDF», así que está escrita.
 */
export default function DocumentField({ label, value, onChange, hint }) {
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
      result = await uploadDocumentFile(file);
    } catch (cause) {
      // Sin esto una excepción del Server Action deja el campo en «subiendo»
      // para siempre y sin decir nada — el peor de los dos fallos.
      result = { ok: false, message: cause instanceof Error ? cause.message : "Error inesperado." };
    }

    setBusy(false);

    if (result.ok) {
      onChange(result.url);
      setDone(
        result.bytes
          ? `Listo · ${(result.bytes / 1024).toFixed(0)} KB`
          : "Listo · guardada en el servidor",
      );
    } else {
      setError(result.message ?? "No se pudo subir el archivo.");
    }

    boxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    // Se limpia para que elegir el mismo archivo dos veces seguidas siga
    // disparando el cambio.
    if (inputRef.current) inputRef.current.value = "";
  };

  const fileName = documentNameFromUrl(value);

  return (
    <label className="wide" ref={boxRef}>
      {label}

      <div className="admin-image-field">
        <div className="admin-image-field__thumb admin-image-field__thumb--doc">
          <Icon name="archivo" size={20} />
        </div>

        <div className="admin-image-field__body">
          <input
            type="text"
            value={value ?? ""}
            placeholder="https://… o sube un PDF"
            onChange={(event) => onChange(event.target.value)}
          />

          <div className="admin-image-field__actions">
            {/* Oculto y disparado por un botón nuestro, igual que en la imagen:
                el nativo no se puede estilar y con dos campos dentro del mismo
                <label> su punto de clic es ambiguo. */}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
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
              {busy ? "Subiendo…" : value ? "Reemplazar PDF" : "Subir PDF"}
            </button>

            {value && !busy && (
              <>
                {/* Abrir lo que está enlazado es la única forma de comprobar que
                    el enlace pegado a mano apunta de verdad a la ficha correcta. */}
                <a
                  className="admin-button admin-button--ghost"
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver
                </a>
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
              </>
            )}
          </div>
        </div>
      </div>

      {fileName && !busy && <small className="admin-doc-field__name">{fileName}</small>}
      {hint && <small>{hint}</small>}
      {busy && <small>Subiendo…</small>}
      {done && !busy && <small className="admin-image-field__done">{done}</small>}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
