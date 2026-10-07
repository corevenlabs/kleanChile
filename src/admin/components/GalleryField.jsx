"use client";

import { useRef, useState } from "react";
import { uploadImageFile } from "../lib/uploadImage";
import Icon from "./Icon";

const MAX_IMAGES = 12;

/** Lo que `admin.css` le da a `.admin-page label`. */
const LABEL_LOOK = { display: "grid", gap: 7, fontSize: 11, fontWeight: 650, color: "#526076" };

/**
 * Las fotos adicionales de un producto, después de la principal.
 *
 * Cada una es una URL editable, igual que en `ImageField`: se puede pegar un
 * enlace o subir un archivo, y los dos caminos terminan en «la lista tiene una
 * URL». Se pueden elegir varios archivos de una vez —quien carga un producto
 * nuevo suele tener tres o cuatro fotos a mano— y se suben de a uno, en orden,
 * para que la galería quede en el orden en que se eligieron.
 *
 * «Usar como principal» intercambia con la imagen de arriba en vez de borrarla:
 * la principal es la que muestran las tarjetas, el carrito y Google, y cambiarla
 * no debería costar perder la anterior.
 */
export default function GalleryField({ value = [], onChange, mainImage, onMakeMain }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [errors, setErrors] = useState([]);

  const room = MAX_IMAGES - value.length;
  const busy = progress !== null;

  const set = (index, url) => onChange(value.map((item, i) => (i === index ? url : item)));
  const remove = (index) => onChange(value.filter((_, i) => i !== index));
  const move = (index, delta) => {
    const next = [...value];
    const target = index + delta;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const makeMain = (index) => {
    const promoted = value[index];
    // La principal anterior ocupa el lugar de la promovida, no se pierde.
    const rest = mainImage ? value.map((item, i) => (i === index ? mainImage : item)) : value.filter((_, i) => i !== index);
    onMakeMain(promoted, rest);
  };

  const uploadMany = async (fileList) => {
    const files = Array.from(fileList ?? []).slice(0, room);
    if (files.length === 0) return;

    setErrors([]);
    const added = [];
    const failed = [];

    for (const [index, file] of files.entries()) {
      setProgress({ current: index + 1, total: files.length });
      let result;
      try {
        result = await uploadImageFile(file);
      } catch (cause) {
        console.error("[subida]", cause);
        result = { ok: false, message: "No pudimos subir la imagen. Intenta de nuevo." };
      }
      if (result.ok) added.push(result.url);
      else failed.push(`${file.name}: ${result.message}`);
    }

    setProgress(null);
    setErrors(failed);
    // Sobre la lista vigente, no la del inicio: la subida tarda, y mientras
    // tanto alguien pudo quitar o reordenar otra foto.
    if (added.length > 0) onChange((current) => [...current, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    /*
     * Un <div> con la apariencia del <label> de los demás campos, y no un
     * <label>: tiene varios controles adentro, y con la lista vacía el primero
     * es el selector de archivos oculto — un clic en el título lo abriría.
     */
    <div className="wide" role="group" aria-labelledby="gallery-field-title" style={LABEL_LOOK}>
      <span id="gallery-field-title">Más imágenes</span>

      <div style={{ display: "grid", gap: 8 }}>
        {value.map((url, index) => (
          <div className="admin-image-field" key={index}>
            <div className="admin-image-field__thumb">
              {url ? <img src={url} alt="" /> : <Icon name="portada" size={20} />}
            </div>
            <div className="admin-image-field__body">
              <input
                type="text"
                value={url}
                placeholder="https://… o súbela con el botón de abajo"
                aria-label={`Imagen adicional ${String(index + 1)}`}
                onChange={(event) => set(index, event.target.value)}
              />
              <div className="admin-image-field__actions">
                {url && (
                  <button type="button" className="admin-button admin-button--secondary" onClick={() => makeMain(index)}>
                    Usar como principal
                  </button>
                )}
                <button
                  type="button"
                  className="admin-button admin-button--ghost"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Mover antes"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-button admin-button--ghost"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Mover después"
                >
                  ↓
                </button>
                <button type="button" className="admin-button admin-button--ghost" onClick={() => remove(index)}>
                  Quitar
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="admin-image-field__actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={busy || room <= 0}
            onChange={(event) => uploadMany(event.target.files)}
          />
          <button
            type="button"
            className="admin-button admin-button--secondary"
            disabled={busy || room <= 0}
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="descargar" size={14} />
            {busy
              ? `Subiendo ${String(progress.current)} de ${String(progress.total)}…`
              : "Subir imágenes"}
          </button>
          <button
            type="button"
            className="admin-button admin-button--ghost"
            disabled={busy || room <= 0}
            onClick={() => onChange([...value, ""])}
          >
            Agregar por URL
          </button>
        </div>
      </div>

      <small className="admin-hint">
        {room > 0
          ? "Puedes elegir varias a la vez. Se muestran en la página del producto, después de la principal."
          : `Llegaste al máximo de ${String(MAX_IMAGES)} imágenes adicionales.`}
      </small>
      {errors.map((message) => (
        <small role="alert" key={message} className="admin-hint" style={{ color: "#c94141" }}>
          {message}
        </small>
      ))}
    </div>
  );
}
