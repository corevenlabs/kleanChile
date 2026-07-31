"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProductAction,
  saveProductAction,
  setProductActiveAction,
} from "../../actions/product";
import { setStockAction } from "../../actions/order";
import { CATEGORIES, CATEGORY_LABELS } from "../../domain/content/vocabulary";
import { formatClp } from "../../domain/shared/money";
import Icon from "./Icon";
import ImageField from "./ImageField";

/**
 * The catalog table and its editor.
 *
 * Not a `BlockEditor` form: products are rows to be searched, filtered and
 * edited one at a time, not one document saved whole. `router.refresh()` after
 * each mutation re-runs the page's server query rather than patching a local
 * copy, so what the table shows is what the database holds.
 */

const emptyProduct = {
  id: null,
  category: "cleaning",
  name: "",
  type: "",
  price: "",
  image: "",
  description: "",
  specs: {},
  isActive: true,
  position: 0,
  stock: 0,
};

/**
 * Specs are edited as "clave: valor" lines.
 *
 * The set of keys varies per product and grows over time, so a fixed set of
 * inputs would be wrong the first time someone sells something with a
 * dimension the form does not have.
 */
const specsToText = (specs) =>
  Object.entries(specs ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

const textToSpecs = (text) =>
  Object.fromEntries(
    text
      .split("\n")
      .map((line) => {
        const separator = line.indexOf(":");
        if (separator === -1) return null;
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();
        return key === "" ? null : [key, value];
      })
      .filter(Boolean),
  );

/**
 * Qué movimiento va a quedar en el libro.
 *
 * El campo pide un nivel absoluto y el sistema guarda una diferencia, así que
 * sin esto la persona tiene que hacer la resta de cabeza para saber qué está
 * por hacer. Escribir 7 donde había 12 no es «cargar 7»: es dar de baja 5.
 */
function StockDelta({ before, after }) {
  const level = Number(after);
  if (!Number.isInteger(level) || level < 0)
    return <small role="alert">Cantidad inválida.</small>;
  if (level === before) return <small>Sin cambios. Actual: {before}.</small>;

  const delta = level - before;
  return (
    <small>
      Actual: {before}. Se registrará{" "}
      {delta > 0
        ? `una entrada de ${String(delta)}`
        : `una salida de ${String(-delta)}`}
      .
    </small>
  );
}

export default function ProductsManager({ products }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState(null);
  const [stockBefore, setStockBefore] = useState(null);
  const [specsText, setSpecsText] = useState("");
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          (category === "all" || product.category === category) &&
          product.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search, category],
  );

  /*
   * `stock` entra al formulario como el nivel contado que hay hoy, y se guarda
   * aparte el valor original. Es lo único que permite distinguir «no toqué el
   * stock» de «lo dejé igual a propósito», y sin esa distinción cada guardado
   * escribiría un movimiento de cero en el libro de inventario.
   */
  const open = (product) => {
    setError(null);
    setEditing({
      ...product,
      stock: product.id ? product.stockOnHand : product.stock,
    });
    setStockBefore(product.id ? product.stockOnHand : null);
    setSpecsText(specsToText(product.specs));
  };

  const run = (work) => {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  };

  /**
   * Guardar es una acción; ajustar stock es otra.
   *
   * `saveProductAction` no toca el stock a propósito: el saldo solo se mueve
   * por el libro de inventario, nunca por un UPDATE directo. Así que si el
   * número cambió, se manda después como nivel contado y queda su movimiento
   * registrado.
   *
   * Son dos llamadas, así que pueden fallar por separado. Si la segunda falla,
   * el mensaje lo dice — «se guardó pero el stock no» es información que quien
   * está mirando la pantalla necesita, y callarla dejaría un producto guardado
   * con un stock que la persona cree haber corregido.
   */
  const submit = (event) => {
    event.preventDefault();
    setError(null);

    const level = Number(editing.stock);
    const stockChanged =
      editing.id !== null && Number.isInteger(level) && level !== stockBefore;

    startTransition(async () => {
      const saved = await saveProductAction({
        ...editing,
        specs: textToSpecs(specsText),
      });
      if (saved.status === "error") {
        setError(saved.message);
        return;
      }

      if (stockChanged) {
        const moved = await setStockAction(editing.id, editing.stock);
        if (moved.status === "error") {
          setError(`Se guardó el producto, pero el stock no: ${moved.message}`);
          router.refresh();
          return;
        }
      }

      setEditing(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="admin-toolbar">
        <label className="admin-search">
          <Icon name="buscar" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar productos..."
            type="search"
          />
        </label>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
        <span className="admin-count">{filtered.length} productos</span>
      </div>

      {error && !editing && (
        <p className="admin-saved" role="alert">
          {error}
        </p>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="admin-product">
                    <img src={product.image} alt="" />
                    <div>
                      <strong>{product.name}</strong>
                      <small>#{product.id}</small>
                    </div>
                  </div>
                </td>
                <td>{product.skuCode ?? "—"}</td>
                <td>
                  <span className="admin-chip">
                    {CATEGORY_LABELS[product.category]}
                  </span>
                </td>
                <td>
                  <strong>{formatClp(product.price)}</strong>
                </td>
                {/* Solo lectura. El stock se ajusta en el editor, donde el
                    campo dice cuánto había y qué movimiento va a registrar. */}
                <td>
                  <span
                    className={
                      product.stockOnHand === 0
                        ? "admin-stock--zero"
                        : undefined
                    }
                  >
                    {product.stockOnHand}
                  </span>
                </td>
                <td>{product.isActive ? "Publicado" : "Oculto"}</td>
                <td>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => open({ ...product })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          setProductActiveAction(product.id, !product.isActive),
                        )
                      }
                    >
                      {product.isActive ? "Ocultar" : "Publicar"}
                    </button>
                    <button
                      type="button"
                      className="danger"
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Eliminar «${product.name}» definitivamente?`,
                          )
                        ) {
                          run(() => deleteProductAction(product.id));
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="admin-empty">No se encontraron productos.</div>
        )}
      </div>

      <div className="admin-settings__actions">
        <button
          type="button"
          className="admin-button"
          onClick={() => open({ ...emptyProduct })}
        >
          <Icon name="mas" size={15} /> Nuevo producto
        </button>
      </div>

      {editing && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={() => setEditing(null)}
        >
          <form
            className="admin-modal"
            onSubmit={submit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-modal__head">
              <div>
                <p className="admin-kicker">PRODUCTO</p>
                <h2>{editing.id ? "Editar producto" : "Nuevo producto"}</h2>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                ×
              </button>
            </div>

            <div className="admin-form-grid">
              <label className="wide">
                Nombre
                <input
                  required
                  value={editing.name}
                  onChange={(event) =>
                    setEditing({ ...editing, name: event.target.value })
                  }
                />
              </label>
              <label>
                Precio (pesos)
                <input
                  required
                  inputMode="numeric"
                  value={editing.price}
                  placeholder="12000"
                  onChange={(event) =>
                    setEditing({ ...editing, price: event.target.value })
                  }
                />
              </label>
              <label>
                Categoría
                <select
                  value={editing.category}
                  onChange={(event) =>
                    setEditing({ ...editing, category: event.target.value })
                  }
                >
                  {CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo
                <input
                  required
                  value={editing.type}
                  placeholder="químico"
                  onChange={(event) =>
                    setEditing({ ...editing, type: event.target.value })
                  }
                />
              </label>
              {/*
                Pide el nivel contado, no una diferencia: es lo que la persona
                tiene delante — una repisa con siete cajas. El libro deriva el
                movimiento, y se muestra acá para que nadie escriba 7 creyendo
                que suma siete.
              */}
              <label>
                {editing.id ? "Stock contado" : "Stock inicial"}
                <input
                  type="number"
                  min={0}
                  value={editing.stock}
                  onChange={(event) =>
                    setEditing({ ...editing, stock: event.target.value })
                  }
                />
                {editing.id !== null && (
                  <StockDelta before={stockBefore} after={editing.stock} />
                )}
              </label>
              <label>
                Estado
                <select
                  value={editing.isActive ? "1" : "0"}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      isActive: event.target.value === "1",
                    })
                  }
                >
                  <option value="1">Publicado</option>
                  <option value="0">Oculto</option>
                </select>
              </label>
              <label className="wide">
                Descripción
                <textarea
                  rows="4"
                  value={editing.description}
                  onChange={(event) =>
                    setEditing({ ...editing, description: event.target.value })
                  }
                />
              </label>
              <label className="wide">
                Especificaciones
                <textarea
                  rows="6"
                  value={specsText}
                  placeholder={"marca: EXCELL\ncontenido_neto: 750 cc"}
                  onChange={(event) => setSpecsText(event.target.value)}
                />
                <small>Una por línea, con el formato «clave: valor».</small>
              </label>
              <ImageField
                label="Imagen"
                value={editing.image}
                onChange={(value) => setEditing({ ...editing, image: value })}
              />
            </div>

            {error && (
              <p className="admin-saved" role="alert">
                {error}
              </p>
            )}

            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button className="admin-button" disabled={pending}>
                {pending ? "Guardando…" : "Guardar producto"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
