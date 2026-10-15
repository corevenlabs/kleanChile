"use client";

import { useState } from "react";
import {
  buildLink,
  categoryOptions,
  LINK_KINDS,
  readLink,
  SITE_PAGES,
} from "../../domain/content/links";

/**
 * «Llevar a»: elegir el destino de un enlace sin escribir rutas.
 *
 * Primero qué tipo de destino (una colección, una categoría, una búsqueda…) y
 * después cuál. Lo que se guarda sigue siendo la ruta de texto de siempre —
 * ver `domain/content/links.js` — así que una ruta escrita a mano antes se lee
 * de vuelta como la elección que corresponde.
 *
 * `autoLabel` agrega un primer tipo que guarda la ruta vacía. Lo usa el menú:
 * un ítem sin ruta busca su propio texto dentro de la categoría.
 *
 * El tipo vive en estado propio y no solo derivado de la ruta: al cambiar a
 * «Una colección» todavía no hay ninguna elegida, y una ruta vacía se leería
 * de vuelta como «Enlace personalizado».
 */
export default function LinkPicker({ label = "Llevar a", value, onChange, collections = [], autoLabel = null, hint }) {
  // Con una ruta, el tipo sale de ella; el estado propio solo cuenta mientras
  // la ruta está vacía. Así el control no queda desfasado cuando la lista que
  // lo contiene se reordena o pierde un elemento y React lo reutiliza.
  const [pendingKind, setKind] = useState(autoLabel ? "auto" : "custom");
  const kind = value ? readLink(value).kind : pendingKind;
  const shown = value ? readLink(value).value : "";

  const kinds = autoLabel ? [{ value: "auto", label: autoLabel }, ...LINK_KINDS] : LINK_KINDS;

  const changeKind = (next) => {
    setKind(next);
    if (next === "auto") return onChange("");
    // Con una sola opción obvia se elige sola; si no, se espera la elección.
    if (next === "collection") return onChange(collections.length === 1 ? buildLink(next, collections[0].slug) : "");
    if (next === "category") return onChange(categoryOptions()[0].value);
    if (next === "page") return onChange(SITE_PAGES[0].path);
    return onChange(buildLink(next, ""));
  };

  const set = (next) => onChange(buildLink(kind, next));

  return (
    <div className="link-picker">
      <span className="link-picker__label">{label}</span>
      <div className="link-picker__row">
        <select aria-label={`${label}: tipo de destino`} value={kind} onChange={(event) => changeKind(event.target.value)}>
          {kinds.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {kind === "collection" &&
          // Sin colecciones se ofrece crear una — salvo que el enlace ya apunte a
          // una que se borró: eso tiene que verse, no esconderse tras el aviso.
          (collections.length === 0 && !shown ? (
            <a className="link-picker__empty" href="/admin/colecciones">
              Todavía no hay colecciones. Crear una →
            </a>
          ) : (
            <select aria-label={`${label}: colección`} value={shown} onChange={(event) => set(event.target.value)}>
              <option value="" disabled>
                Elige una colección…
              </option>
              {collections.map((collection) => (
                <option key={collection.slug} value={collection.slug}>
                  {collection.name}
                  {collection.isActive === false ? " (oculta)" : ""}
                </option>
              ))}
              {shown && !collections.some((collection) => collection.slug === shown) && (
                <option value={shown}>Ya no existe: {shown}</option>
              )}
            </select>
          ))}

        {kind === "category" && (
          <select aria-label={`${label}: categoría`} value={shown} onChange={(event) => set(event.target.value)}>
            {categoryOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {kind === "page" && (
          <select aria-label={`${label}: página`} value={shown} onChange={(event) => set(event.target.value)}>
            {SITE_PAGES.map((page) => (
              <option key={page.path} value={page.path}>
                {page.label}
              </option>
            ))}
          </select>
        )}

        {kind === "search" && (
          <input
            aria-label={`${label}: texto a buscar`}
            value={shown}
            placeholder="Ej.: rhein"
            onChange={(event) => set(event.target.value)}
          />
        )}

        {kind === "custom" && (
          <input
            aria-label={`${label}: dirección`}
            value={shown}
            placeholder="/ruta o https://…"
            onChange={(event) => set(event.target.value)}
          />
        )}
      </div>
      {hint && <small>{hint}</small>}
      {kind !== "auto" && value && <small className="link-picker__path">Dirección: {value}</small>}
    </div>
  );
}
