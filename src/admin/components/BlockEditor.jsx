"use client";

import { useState, useTransition } from "react";
import { saveBlockAction } from "../../actions/content";
import { FORMS } from "../forms";
import {
  getAt,
  insertAt,
  moveAt,
  pruneBlankStrings,
  removeAt,
  setAt,
  updateList,
} from "../lib/paths";
import Icon from "./Icon";
import ImageField from "./ImageField";

/**
 * One editor for every block of storefront content.
 *
 * The nine blocks differ in shape but not in kind: each is scalar fields plus
 * some repeatable groups, nested a level or two. So each is described as data
 * in `src/admin/forms.js` and rendered by this component, rather than written
 * out as nine hand-built forms that would drift apart in their handling of
 * adding, removing and reordering.
 *
 * The whole block is held as one draft object and submitted at once. Saving
 * field by field would mean a half-applied hero if a save failed midway.
 */

function Field({ field, value, onChange }) {
  const className = field.wide === false ? undefined : "wide";

  if (field.type === "image") {
    return <ImageField label={field.label} value={value} onChange={onChange} />;
  }

  if (field.type === "select") {
    return (
      <label className={className}>
        {field.label}
        <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "lines") {
    return (
      <label className={className}>
        {field.label}
        <textarea
          rows={field.rows ?? 3}
          value={(Array.isArray(value) ? value : []).join("\n")}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value.split("\n"))}
        />
        {field.hint && <small>{field.hint}</small>}
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className={className}>
        {field.label}
        <textarea
          rows={field.rows ?? 3}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  return (
    <label className={className}>
      {field.label}
      <input
        type={field.type === "number" ? "number" : "text"}
        value={value ?? ""}
        placeholder={field.placeholder}
        onChange={(event) =>
          onChange(
            field.type === "number"
              ? // An emptied number input reads as "", which is not a number and
                // would fail validation on a field the schema requires.
                (event.target.value === "" ? 0 : Number(event.target.value))
              : event.target.value,
          )
        }
      />
      {field.hint && <small>{field.hint}</small>}
    </label>
  );
}

/**
 * A repeatable group. Renders its own nested lists through the same component,
 * so a dropdown inside a nav link inside the navigation block needs no special
 * case.
 */
function ListEditor({ list, draft, path, onChange }) {
  const fullPath = path ? `${path}.${list.name}` : list.name;
  const items = getAt(draft, fullPath) ?? [];

  const mutate = (updater) => onChange(updateList(draft, fullPath, updater));

  return (
    <div className="admin-panel">
      <div className="admin-panel__head">
        <div>
          <h2>{list.label}</h2>
          {list.description && <p>{list.description}</p>}
        </div>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => mutate((current) => insertAt(current, structuredClone(list.blank)))}
        >
          <Icon name="mas" size={14} /> {list.addLabel ?? "Agregar"}
        </button>
      </div>

      {items.length === 0 && <div className="admin-empty">Sin elementos.</div>}

      {items.map((item, index) => (
        <div className="admin-panel" key={`${fullPath}-${String(index)}`}>
          <div className="admin-panel__head">
            <div>
              <h2>{list.itemTitle ? list.itemTitle(item, index) : `#${String(index + 1)}`}</h2>
            </div>
            <div className="admin-row-actions">
              <button type="button" onClick={() => mutate((c) => moveAt(c, index, -1))}>
                ↑
              </button>
              <button type="button" onClick={() => mutate((c) => moveAt(c, index, 1))}>
                ↓
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => mutate((current) => removeAt(current, index))}
              >
                Eliminar
              </button>
            </div>
          </div>

          <div className="admin-form-grid">
            {list.fields.map((field) => {
              const fieldPath = `${fullPath}.${String(index)}.${field.name}`;
              return (
                <Field
                  key={field.name}
                  field={field}
                  value={getAt(draft, fieldPath)}
                  onChange={(value) => onChange(setAt(draft, fieldPath, value))}
                />
              );
            })}
          </div>

          {list.lists?.map((nested) => (
            <ListEditor
              key={nested.name}
              list={nested}
              draft={draft}
              path={`${fullPath}.${String(index)}`}
              onChange={onChange}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Takes the form's key rather than the form itself: the descriptions hold
 * functions (`itemTitle`, `normalize`) and a function cannot cross the
 * server/client boundary as a prop. The page says which block; this side looks
 * up how to render it.
 */
export default function BlockEditor({ formKey, initial }) {
  const form = FORMS[formKey];
  const [draft, setDraft] = useState(initial);
  const [feedback, setFeedback] = useState(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setFeedback(null);

    startTransition(async () => {
      const normalized = form.normalize
        ? form.normalize(pruneBlankStrings(draft))
        : pruneBlankStrings(draft);

      const result = await saveBlockAction(form.key, normalized);

      setFeedback(
        result.status === "ok"
          ? { tone: "ok", message: "✓ Cambios guardados" }
          : { tone: "error", message: result.message },
      );
    });
  };

  return (
    <section className="admin-settings">
      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2>{form.title}</h2>
            {form.description && <p>{form.description}</p>}
          </div>
          {feedback && (
            <span className="admin-saved" role={feedback.tone === "error" ? "alert" : undefined}>
              {feedback.message}
            </span>
          )}
        </div>

        {form.fields.length > 0 && (
          <div className="admin-form-grid">
            {form.fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                value={getAt(draft, field.name)}
                onChange={(value) => setDraft(setAt(draft, field.name, value))}
              />
            ))}
          </div>
        )}
      </div>

      {form.lists?.map((list) => (
        <ListEditor
          key={list.name}
          list={list}
          draft={draft}
          path=""
          onChange={setDraft}
        />
      ))}

      <div className="admin-settings__actions">
        <button type="button" className="admin-button" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </section>
  );
}
