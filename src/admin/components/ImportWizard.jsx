"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { analyzeImportAction, applyImportAction } from "../../actions/import";
import { CATEGORY_LABELS } from "../../domain/content/vocabulary";
import { FIELDS, fieldLabel } from "../../domain/import/fields";
import { formatPrice } from "../../domain/shared/pricing";
import Icon from "./Icon";

/**
 * Asistente de importación: subir → revisar → aplicar.
 *
 * El archivo se queda en el navegador entre pasos y se vuelve a enviar en cada
 * llamada. Es a propósito: el plan nunca viaja de vuelta al servidor, así que
 * lo que se escribe en el catálogo se calcula siempre desde el archivo y no
 * desde algo que pasó por el cliente.
 *
 * Nada se escribe hasta el último paso. El resumen es una simulación completa.
 */

const STATUS_LABEL = {
  created: "Crear",
  updated: "Actualizar",
  skipped: "Sin cambios",
  error: "Error",
};

/**
 * Cómo se muestra un valor en la columna «cambios».
 *
 * La categoría se guarda como slug en inglés — `cleaning` — igual que el resto
 * de los identificadores del sistema. Acá se traduce: quien revisa el resumen
 * escribió «Limpieza» en su planilla y eso es lo que tiene que leer de vuelta.
 */
function showValue(field, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "price") return formatPrice(value);
  if (field === "active") return value ? "Publicado" : "Oculto";
  if (field === "category") return CATEGORY_LABELS[value] ?? String(value);
  return String(value);
}

function Changes({ row }) {
  const entries = Object.entries(row.changes);
  if (entries.length === 0) return <span className="admin-hint">—</span>;

  return (
    <div className="import-changes">
      {entries.map(([field, change]) => (
        <span key={field}>
          <b>{fieldLabel(field)}</b>
          {row.status === "created" ? (
            <> {showValue(field, change.to)}</>
          ) : (
            <>
              {" "}
              {showValue(field, change.from)} <Icon name="chevron" size={11} />{" "}
              {showValue(field, change.to)}
            </>
          )}
        </span>
      ))}
    </div>
  );
}

export default function ImportWizard() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(null);
  const [pending, startTransition] = useTransition();

  const send = (action, overrideMapping) => {
    const body = new FormData();
    body.set("file", file);
    if (overrideMapping) body.set("mapping", JSON.stringify(overrideMapping));
    return action(null, body);
  };

  const analyze = (chosen) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await send(analyzeImportAction, chosen);
      if (result.status === "error") {
        setFeedback(result.message);
        return;
      }
      setAnalysis(result);
      setMapping(result.mapping);
    });
  };

  const pick = (selected) => {
    setAnalysis(null);
    setMapping(null);
    setDone(null);
    setFeedback(null);
    setFile(selected ?? null);
  };

  const apply = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await send(applyImportAction, mapping);
      if (result.status === "error") {
        setFeedback(result.message);
        return;
      }
      setDone(result.counts);
      setAnalysis(null);
      setFile(null);
      router.refresh();
    });
  };

  // El mapeo se edita en el cliente y se vuelve a analizar: cambiar a qué campo
  // apunta una columna cambia el plan entero, así que mostrar el resumen viejo
  // junto al mapeo nuevo sería mentir.
  const remap = (header, target) => {
    const next = { ...mapping };
    if (target === "") delete next[header];
    else {
      for (const [key, value] of Object.entries(next)) {
        if (value === target && key !== header) delete next[key];
      }
      next[header] = target;
    }
    setMapping(next);
    analyze(next);
  };

  const applicable = analysis ? analysis.counts.created + analysis.counts.updated : 0;

  return (
    <>
      {done && (
        <div className="admin-panel import-done">
          <Icon name="ok" size={22} />
          <div>
            <h2>Importación aplicada</h2>
            <p>
              {done.created} productos creados · {done.updated} actualizados ·{" "}
              {done.skipped} sin cambios · {done.error} con error.
            </p>
          </div>
        </div>
      )}

      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2>1 · Elige el archivo</h2>
            <p>Formato .csv o .xlsx. La primera fila debe tener los encabezados.</p>
          </div>
          <a className="admin-button admin-button--secondary" href="/admin/importar/plantilla">
            <Icon name="descargar" size={15} /> Descargar plantilla
          </a>
        </div>

        <div className="admin-form-grid">
          <label className="wide">
            Archivo
            <input
              type="file"
              accept=".csv,.xlsx,.xlsm,.txt"
              disabled={pending}
              onChange={(event) => pick(event.target.files?.[0])}
            />
            <small>
              El SKU se conserva: si ya existe, actualiza ese producto; si no existe, crea uno
              nuevo. Si viene vacío, KleanChile genera un código interno.
            </small>
          </label>
        </div>

        {file && !analysis && !pending && (
          <div className="admin-settings__actions">
            <button type="button" className="admin-button" onClick={() => analyze()}>
              Revisar «{file.name}»
            </button>
          </div>
        )}

        {pending && <p className="admin-hint">Procesando…</p>}
        {feedback && (
          <p className="admin-saved" role="alert">
            {feedback}
          </p>
        )}
      </div>

      {analysis && (
        <>
          <div className="admin-panel">
            <div className="admin-panel__head">
              <div>
                <h2>2 · Revisa las columnas</h2>
                <p>Detectamos esto a partir de los encabezados. Corrige lo que no calce.</p>
              </div>
            </div>

            <div className="import-mapping">
              {analysis.headers.map((header) => (
                <label key={header}>
                  <span className="import-mapping__header">{header}</span>
                  <select
                    value={mapping?.[header] ?? ""}
                    disabled={pending}
                    onChange={(event) => remap(header, event.target.value)}
                  >
                    <option value="">Ignorar esta columna</option>
                    {FIELDS.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel__head">
              <div>
                <h2>3 · Confirma</h2>
                <p>Todavía no se ha escrito nada en el catálogo.</p>
              </div>
            </div>

            <div className="import-counts">
              <div className="import-count import-count--created">
                <strong>{analysis.counts.created}</strong>
                <span>Crear</span>
              </div>
              <div className="import-count import-count--updated">
                <strong>{analysis.counts.updated}</strong>
                <span>Actualizar</span>
              </div>
              <div className="import-count">
                <strong>{analysis.counts.skipped}</strong>
                <span>Sin cambios</span>
              </div>
              <div className="import-count import-count--error">
                <strong>{analysis.counts.error}</strong>
                <span>Con error</span>
              </div>
            </div>

            {analysis.counts.error > 0 && (
              <p className="admin-hint">
                Las filas con error se omiten; el resto se aplica igual. Corrige el archivo y vuelve
                a subirlo si quieres incluirlas.
              </p>
            )}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Acción</th>
                    <th>SKU</th>
                    <th>Cambios</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td>
                        <span className={`admin-chip import-chip--${row.status}`}>
                          {STATUS_LABEL[row.status]}
                        </span>
                      </td>
                      <td>{row.skuCode ?? "—"}</td>
                      <td>
                        {row.status === "error" ? (
                          <span className="import-error">{row.message}</span>
                        ) : (
                          <>
                            <Changes row={row} />
                            {/* Un aviso, no un error: la fila se aplica igual. */}
                            {row.message && row.status === "created" && (
                              <span className="import-warning">
                                <Icon name="alerta" size={12} /> {row.message}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {analysis.truncated && (
              <p className="admin-hint">
                Se muestran las primeras filas y todos los errores. Se aplicará el archivo completo.
              </p>
            )}

            <div className="admin-settings__actions">
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={() => pick(null)}
                disabled={pending}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={apply}
                disabled={pending || applicable === 0}
              >
                {pending ? "Aplicando…" : `Aplicar ${String(applicable)} cambios`}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
