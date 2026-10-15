"use client";

import { useState, useTransition } from "react";
import { saveBlockAction } from "../../actions/content";
import { describeLink } from "../../domain/content/links";
import Icon from "./Icon";
import LinkPicker from "./LinkPicker";

/**
 * El editor del menú superior.
 *
 * Antes era el editor genérico de bloques: enlaces que contenían un desplegable
 * que contenía columnas que contenían un textarea de «un ítem por línea». Tres
 * niveles de tarjetas iguales, y ninguna forma de decir adónde llevaba cada
 * ítem. Este lo ordena como se ve en la tienda:
 *
 *   izquierda  los enlaces de la barra, en orden — se elige uno
 *   derecha    ese enlace: su texto, adónde lleva y su desplegable, columna
 *              por columna, con cada ítem y su destino
 *
 * y una vista previa del desplegable al lado, para no tener que guardar e ir a
 * la tienda a ver cómo quedó.
 *
 * Todo el menú se guarda de una vez, como antes: guardar ítem por ítem dejaría
 * un menú a medio aplicar si un guardado fallara a la mitad.
 */

const blankLink = () => ({ name: "Nuevo enlace", path: "/", dropdown: null });
const blankSection = () => ({ title: "", items: [{ label: "", path: "" }] });

const move = (list, index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

/**
 * Lo que se guarda: ítems sin texto fuera, y un desplegable sin título ni
 * columnas guardado como `null` — `Navbar` abre el panel según `dropdown` sea
 * verdadero, así que un objeto vacío abriría un panel en blanco.
 */
function normalize(draft) {
  return {
    ...draft,
    links: draft.links
      .filter((link) => link.name.trim() !== "")
      .map((link) => {
        if (!link.dropdown) return { ...link, dropdown: null };
        const sections = link.dropdown.sections
          .map((section) => ({
            title: section.title.trim(),
            items: section.items
              .filter((item) => item.label.trim() !== "")
              .map((item) => ({ label: item.label.trim(), path: item.path.trim() })),
          }))
          .filter((section) => section.title !== "" || section.items.length > 0);
        const title = link.dropdown.title.trim();
        return { ...link, dropdown: title === "" && sections.length === 0 ? null : { title, sections } };
      }),
  };
}

export default function NavigationEditor({ initial, collections = [] }) {
  const [draft, setDraft] = useState(initial);
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [pending, startTransition] = useTransition();

  const update = (next) => {
    setDraft(next);
    setDirty(true);
    setFeedback(null);
  };

  const links = draft.links;
  const index = Math.min(selected, links.length - 1);
  const link = links[index] ?? null;

  const setLinks = (next) => update({ ...draft, links: next });
  const setLink = (patch) => setLinks(links.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  const setDropdown = (patch) => setLink({ dropdown: { ...link.dropdown, ...patch } });
  const setSections = (sections) => setDropdown({ sections });
  const setSection = (sectionIndex, patch) =>
    setSections(link.dropdown.sections.map((section, i) => (i === sectionIndex ? { ...section, ...patch } : section)));
  const setItems = (sectionIndex, items) => setSection(sectionIndex, { items });

  const save = () => {
    startTransition(async () => {
      const value = normalize(draft);
      const result = await saveBlockAction("navigation", value);
      if (result.status === "ok") {
        setDraft(value);
        setDirty(false);
        setFeedback({ tone: "ok", message: "✓ Menú guardado" });
      } else {
        setFeedback({ tone: "error", message: result.message });
      }
    });
  };

  return (
    <div className="nav-editor">
      <div className="nav-editor__layout">
        {/* ── La barra ─────────────────────────────────────────────── */}
        <aside className="nav-editor__bar">
          <div className="nav-editor__bar-head">
            <h2>Enlaces de la barra</h2>
            <p>En el orden en que se ven. Elige uno para editarlo.</p>
          </div>

          <ol className="nav-editor__links">
            {links.map((entry, i) => (
              <li key={i} className={i === index ? "is-selected" : undefined}>
                <button type="button" className="nav-editor__link" onClick={() => setSelected(i)}>
                  <strong>{entry.name || "Sin texto"}</strong>
                  <small>
                    {describeLink(entry.path, collections)}
                    {entry.dropdown ? ` · ${String(entry.dropdown.sections.reduce((n, s) => n + s.items.length, 0))} ítems` : ""}
                  </small>
                </button>
                <span className="nav-editor__order">
                  <button type="button" aria-label={`Subir ${entry.name}`} disabled={i === 0} onClick={() => { setLinks(move(links, i, -1)); setSelected(i - 1); }}><Icon name="arriba" size={14} /></button>
                  <button type="button" aria-label={`Bajar ${entry.name}`} disabled={i === links.length - 1} onClick={() => { setLinks(move(links, i, 1)); setSelected(i + 1); }}><Icon name="abajo" size={14} /></button>
                </span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            className="admin-button admin-button--secondary nav-editor__add"
            onClick={() => { setLinks([...links, blankLink()]); setSelected(links.length); }}
          >
            <Icon name="mas" size={14} /> Agregar enlace
          </button>

          <div className="nav-editor__general">
            <label>
              Nombre de la marca
              <input value={draft.brand} onChange={(event) => update({ ...draft, brand: event.target.value })} />
            </label>
            <label>
              Texto del buscador
              <input
                value={draft.searchPlaceholder}
                onChange={(event) => update({ ...draft, searchPlaceholder: event.target.value })}
              />
            </label>
          </div>
        </aside>

        {/* ── El enlace elegido ─────────────────────────────────────── */}
        {link ? (
          <section key={index} className="nav-editor__detail" aria-label={`Editar ${link.name}`}>
            <div className="nav-editor__card">
              <div className="nav-editor__card-head">
                <h2>{link.name || "Sin texto"}</h2>
                <button
                  type="button"
                  className="nav-editor__danger"
                  onClick={() => { setLinks(links.filter((_, i) => i !== index)); setSelected(Math.max(0, index - 1)); }}
                >
                  Quitar de la barra
                </button>
              </div>
              <div className="nav-editor__grid">
                <label>
                  Texto en la barra
                  <input value={link.name} onChange={(event) => setLink({ name: event.target.value })} />
                </label>
                <LinkPicker
                  label="Al hacer clic lleva a"
                  value={link.path}
                  onChange={(path) => setLink({ path })}
                  collections={collections}
                />
              </div>

              <label className="nav-editor__switch">
                <input
                  type="checkbox"
                  checked={Boolean(link.dropdown)}
                  onChange={(event) =>
                    setLink({ dropdown: event.target.checked ? { title: "", sections: [blankSection()] } : null })
                  }
                />
                <span>
                  <strong>Mostrar un menú desplegable</strong>
                  <small>Se abre al pasar el mouse sobre «{link.name || "el enlace"}».</small>
                </span>
              </label>
            </div>

            {link.dropdown && (
              <div className="nav-editor__dropdown">
                <div className="nav-editor__card">
                  <div className="nav-editor__card-head">
                    <div>
                      <h2>Menú desplegable</h2>
                      <p>
                        Cada ítem puede llevar a una colección, una búsqueda o cualquier página. Si lo dejas en
                        «Buscar el texto en {link.name}», muestra los productos de esa categoría que lo mencionan.
                      </p>
                    </div>
                  </div>

                  <label>
                    Título del desplegable (opcional)
                    <input value={link.dropdown.title} onChange={(event) => setDropdown({ title: event.target.value })} />
                  </label>

                  <div className="nav-editor__sections">
                    {link.dropdown.sections.map((section, sectionIndex) => (
                      <div className="nav-editor__section" key={sectionIndex}>
                        <div className="nav-editor__section-head">
                          <input
                            className="nav-editor__section-title"
                            aria-label="Título de la columna"
                            placeholder="Título de la columna"
                            value={section.title}
                            onChange={(event) => setSection(sectionIndex, { title: event.target.value })}
                          />
                          <span className="nav-editor__order">
                            <button type="button" aria-label="Columna a la izquierda" disabled={sectionIndex === 0} onClick={() => setSections(move(link.dropdown.sections, sectionIndex, -1))}><Icon name="izquierda" size={14} /></button>
                            <button type="button" aria-label="Columna a la derecha" disabled={sectionIndex === link.dropdown.sections.length - 1} onClick={() => setSections(move(link.dropdown.sections, sectionIndex, 1))}><Icon name="derecha" size={14} /></button>
                            <button type="button" className="nav-editor__x" aria-label="Quitar columna" onClick={() => setSections(link.dropdown.sections.filter((_, i) => i !== sectionIndex))}><Icon name="cerrar" size={14} /></button>
                          </span>
                        </div>

                        <ul className="nav-editor__items">
                          {section.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="nav-editor__item">
                              <div className="nav-editor__item-top">
                                <input
                                  aria-label="Texto del ítem"
                                  placeholder="Texto del ítem, ej.: Temporada escolar"
                                  value={item.label}
                                  onChange={(event) =>
                                    setItems(sectionIndex, section.items.map((entry, i) => (i === itemIndex ? { ...entry, label: event.target.value } : entry)))
                                  }
                                />
                                <span className="nav-editor__order">
                                  <button type="button" aria-label="Subir ítem" disabled={itemIndex === 0} onClick={() => setItems(sectionIndex, move(section.items, itemIndex, -1))}><Icon name="arriba" size={14} /></button>
                                  <button type="button" aria-label="Bajar ítem" disabled={itemIndex === section.items.length - 1} onClick={() => setItems(sectionIndex, move(section.items, itemIndex, 1))}><Icon name="abajo" size={14} /></button>
                                  <button type="button" className="nav-editor__x" aria-label="Quitar ítem" onClick={() => setItems(sectionIndex, section.items.filter((_, i) => i !== itemIndex))}><Icon name="cerrar" size={14} /></button>
                                </span>
                              </div>
                              <LinkPicker
                                label="Lleva a"
                                value={item.path}
                                onChange={(path) =>
                                  setItems(sectionIndex, section.items.map((entry, i) => (i === itemIndex ? { ...entry, path } : entry)))
                                }
                                collections={collections}
                                autoLabel={`Buscar el texto en ${link.name || "la categoría"}`}
                              />
                            </li>
                          ))}
                        </ul>

                        <button
                          type="button"
                          className="nav-editor__add-item"
                          onClick={() => setItems(sectionIndex, [...section.items, { label: "", path: "" }])}
                        >
                          <Icon name="mas" size={13} /> Agregar ítem
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="nav-editor__add-section"
                      onClick={() => setSections([...link.dropdown.sections, blankSection()])}
                    >
                      <Icon name="mas" size={16} />
                      Agregar columna
                    </button>
                  </div>
                </div>

                {/* Vista previa: una versión simplificada del panel de la tienda. */}
                <div className="nav-editor__preview" aria-hidden="true">
                  <span className="nav-editor__preview-label">Vista previa</span>
                  <div className="nav-editor__preview-panel">
                    {link.dropdown.title && <p className="nav-editor__preview-title">{link.dropdown.title}</p>}
                    <div className="nav-editor__preview-cols">
                      {link.dropdown.sections.map((section, i) => (
                        <div key={i}>
                          <h4>{section.title || "Sin título"}</h4>
                          {section.items.filter((item) => item.label.trim()).map((item, j) => (
                            <span key={j} className={item.path ? "has-target" : undefined}>
                              {item.label}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                    <span className="nav-editor__preview-all">Ver todo en {link.name}</span>
                  </div>
                  <small>Los ítems en azul llevan a un destino propio. Los demás buscan su texto en la categoría.</small>
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="admin-empty">La barra no tiene enlaces. Agrega el primero.</div>
        )}
      </div>

      <div className={`nav-editor__save ${dirty ? "is-dirty" : ""}`}>
        <span role={feedback?.tone === "error" ? "alert" : "status"}>
          {feedback ? feedback.message : dirty ? "Hay cambios sin guardar." : "Sin cambios pendientes."}
        </span>
        <button type="button" className="admin-button" onClick={save} disabled={pending || !dirty}>
          {pending ? "Guardando…" : "Guardar menú"}
        </button>
      </div>
    </div>
  );
}
