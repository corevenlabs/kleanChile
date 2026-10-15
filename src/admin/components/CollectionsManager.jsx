"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteCollectionAction,
  moveCollectionAction,
  saveCollectionAction,
} from "../../actions/collection";
import { slugify } from "../../domain/catalog/classification";
import { collectionPath } from "../../domain/content/links";
import { CATEGORY_LABELS } from "../../domain/content/vocabulary";
import Icon from "./Icon";
import ImageField from "./ImageField";

/**
 * Colecciones: armar grupos de productos para enlazarlos desde el banner o el
 * menú.
 *
 * El trabajo real es elegir productos, así que el editor le da la mitad de la
 * pantalla a eso: un buscador, un filtro por categoría y casillas, con
 * «marcar todos los que se ven» para no hacer veinte clics cuando la búsqueda
 * ya dejó exactamente los que se quieren.
 */

const blank = { id: null, name: "", description: "", image: "", isActive: true, productIds: [], usedIn: [] };

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default function CollectionsManager({ collections, products }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const run = (work, after) => {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      after?.();
      router.refresh();
    });
  };

  const save = (event) => {
    event.preventDefault();
    run(() => saveCollectionAction(editing), () => setEditing(null));
  };

  return (
    <>
      <div className="admin-toolbar">
        <p className="collections__intro">
          Una colección es un grupo de productos con su propia página. Después se elige en{" "}
          <strong>Portada</strong> (el botón de una diapositiva) o en <strong>Configuración → Menú</strong>.
        </p>
        <button type="button" className="admin-button" onClick={() => { setError(null); setEditing({ ...blank }); }}>
          <Icon name="mas" size={14} /> Nueva colección
        </button>
      </div>

      {error && !editing && <p className="collections__error" role="alert">{error}</p>}

      {collections.length === 0 ? (
        <div className="admin-panel admin-empty">
          Todavía no hay colecciones. Crea la primera, por ejemplo «Temporada escolar».
        </div>
      ) : (
        <ul className="collections__grid">
          {collections.map((collection, index) => {
            const visible = collection.productIds.filter((id) => byId.get(id)?.isActive).length;
            return (
              <li key={collection.id} className="collections__card">
                <div className="collections__thumb">
                  {collection.image ? (
                    <img src={collection.image} alt="" />
                  ) : (
                    <div className="collections__mosaic">
                      {collection.productIds.slice(0, 4).map((id) => {
                        const image = byId.get(id)?.image;
                        return image ? <img key={id} src={image} alt="" /> : <span key={id} />;
                      })}
                    </div>
                  )}
                  <span className={`collections__status ${collection.isActive ? "" : "is-hidden"}`}>
                    {collection.isActive ? "Publicada" : "Oculta"}
                  </span>
                </div>
                <div className="collections__body">
                  <h2>{collection.name}</h2>
                  <p>
                    {collection.productIds.length === 1 ? "1 producto" : `${String(collection.productIds.length)} productos`}
                    {visible !== collection.productIds.length && ` · ${String(visible)} visibles`}
                  </p>
                  <p className={`collections__usage ${collection.usedIn.length ? "is-used" : ""}`}>
                    {collection.usedIn.length ? `Enlazada en: ${collection.usedIn.join(", ")}` : "Todavía no se enlaza desde ningún lado."}
                  </p>
                  <a className="collections__url" href={collectionPath(collection.slug)} target="_blank" rel="noreferrer">
                    {collectionPath(collection.slug)} <Icon name="externo" size={12} />
                  </a>
                </div>
                <div className="collections__actions">
                  {confirming === collection.id ? (
                    <>
                      <span>
                        ¿Eliminar «{collection.name}»?
                        {collection.usedIn.length > 0 && (
                          <strong className="collections__warn">
                            {" "}Se usa en {collection.usedIn.join(", ")}: esos enlaces quedarán rotos hasta que los cambies.
                          </strong>
                        )}
                      </span>
                      <button type="button" className="danger" disabled={pending} onClick={() => run(() => deleteCollectionAction(collection.id), () => setConfirming(null))}>
                        Sí, eliminar
                      </button>
                      <button type="button" onClick={() => setConfirming(null)}>No</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="collections__edit" onClick={() => { setError(null); setEditing({ ...collection }); }}>
                        Editar
                      </button>
                      <button type="button" aria-label={`Subir ${collection.name}`} disabled={index === 0 || pending} onClick={() => run(() => moveCollectionAction(collection.id, -1))}><Icon name="arriba" size={14} /></button>
                      <button type="button" aria-label={`Bajar ${collection.name}`} disabled={index === collections.length - 1 || pending} onClick={() => run(() => moveCollectionAction(collection.id, 1))}><Icon name="abajo" size={14} /></button>
                      <button type="button" className="danger" onClick={() => setConfirming(collection.id)}>Eliminar</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <CollectionEditor
          editing={editing}
          setEditing={setEditing}
          products={products}
          onSubmit={save}
          pending={pending}
          error={error}
        />
      )}
    </>
  );
}

function CollectionEditor({ editing, setEditing, products, onSubmit, pending, error }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [onlySelected, setOnlySelected] = useState(false);

  const selected = useMemo(() => new Set(editing.productIds), [editing.productIds]);

  const visible = useMemo(() => {
    const words = normalizeText(query).split(/\s+/).filter(Boolean);
    return products.filter((product) => {
      if (onlySelected && !selected.has(product.id)) return false;
      if (category !== "all" && product.category !== category) return false;
      const haystack = normalizeText(`${product.name} ${product.type} ${product.skuCode ?? ""}`);
      return words.every((word) => haystack.includes(word));
    });
  }, [products, query, category, onlySelected, selected]);

  const setIds = (ids) => setEditing((current) => ({ ...current, productIds: ids }));
  const toggle = (id) => setIds(selected.has(id) ? editing.productIds.filter((x) => x !== id) : [...editing.productIds, id]);
  const allVisibleSelected = visible.length > 0 && visible.every((product) => selected.has(product.id));
  const toggleVisible = () =>
    allVisibleSelected
      ? setIds(editing.productIds.filter((id) => !visible.some((product) => product.id === id)))
      : setIds([...new Set([...editing.productIds, ...visible.map((product) => product.id)])]);

  const slug = editing.id ? editing.slug : slugify(editing.name);

  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
      <form className="admin-modal collections__modal" onSubmit={onSubmit}>
        <div className="admin-modal__head">
          <h2>{editing.id ? `Editar «${editing.name}»` : "Nueva colección"}</h2>
          <button type="button" aria-label="Cerrar" onClick={() => setEditing(null)}>×</button>
        </div>

        <div className="collections__editor">
          <div className="collections__details">
            <label>
              Nombre
              <input
                required
                autoFocus
                value={editing.name}
                placeholder="Ej.: Temporada escolar"
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              />
              <small>
                Dirección: {slug ? collectionPath(slug) : "—"}
                {editing.id ? " (no cambia al renombrar, para no romper los enlaces)" : ""}
              </small>
            </label>
            <label>
              Texto de presentación (opcional)
              <textarea
                rows={3}
                value={editing.description}
                placeholder="Se muestra bajo el título en la página de la colección."
                onChange={(event) => setEditing({ ...editing, description: event.target.value })}
              />
            </label>
            <ImageField
              label="Imagen de encabezado (opcional)"
              value={editing.image}
              onChange={(image) => setEditing((current) => ({ ...current, image }))}
            />
            <label className="collections__toggle">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })}
              />
              <span>
                <strong>Publicada</strong>
                <small>Oculta, su página no se puede abrir, pero no pierde sus productos.</small>
              </span>
            </label>
          </div>

          <div className="collections__picker">
            <div className="collections__picker-head">
              <strong>
                Productos <span className="collections__badge">{editing.productIds.length} elegidos</span>
              </strong>
              <div className="collections__filters">
                <label className="admin-search">
                  <Icon name="buscar" size={15} />
                  <input
                    type="search"
                    aria-label="Buscar productos"
                    placeholder="Buscar por nombre, tipo o SKU"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <select aria-label="Categoría" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="all">Todas las categorías</option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="collections__bulk">
                <label className="collections__check">
                  <input type="checkbox" checked={onlySelected} onChange={(event) => setOnlySelected(event.target.checked)} />
                  Ver solo los elegidos
                </label>
                <button type="button" onClick={toggleVisible} disabled={visible.length === 0}>
                  {allVisibleSelected ? `Quitar los ${String(visible.length)} que se ven` : `Elegir los ${String(visible.length)} que se ven`}
                </button>
              </div>
            </div>

            <ul className="collections__list">
              {visible.length === 0 && <li className="collections__none">Ningún producto coincide.</li>}
              {visible.map((product) => (
                <li key={product.id}>
                  <label className={`collections__row ${selected.has(product.id) ? "is-on" : ""}`}>
                    <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggle(product.id)} />
                    {product.image ? <img src={product.image} alt="" /> : <span className="collections__noimg" />}
                    <span className="collections__row-text">
                      <strong>{product.name}</strong>
                      <small>
                        {CATEGORY_LABELS[product.category]} · {product.type}
                        {product.skuCode ? ` · ${product.skuCode}` : ""}
                        {!product.isActive && " · oculto"}
                      </small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="admin-modal__actions">
          {error && <span className="collections__error" role="alert">{error}</span>}
          <button type="button" className="admin-button admin-button--secondary" onClick={() => setEditing(null)}>
            Cancelar
          </button>
          <button type="submit" className="admin-button" disabled={pending}>
            {pending ? "Guardando…" : "Guardar colección"}
          </button>
        </div>
      </form>
    </div>
  );
}
