"use client";

import { useRef, useState } from "react";
import { uploadImageAction } from "../../actions/media";

/**
 * An image: a URL, with an upload button that fills it in.
 *
 * The URL stays editable rather than being hidden behind the file picker,
 * because most of this catalog points at images hosted elsewhere and retyping
 * one is the common case. Uploading writes the file and puts its path in the
 * same box, so both routes end at "the field holds a URL".
 */
export default function ImageField({ label, value, onChange, wide = true }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const upload = async (file) => {
    if (!file) return;

    setBusy(true);
    setError(null);

    const body = new FormData();
    body.set("file", file);
    const result = await uploadImageAction(body);

    setBusy(false);
    if (result.status === "ok") onChange(result.url);
    else setError(result.message);

    // Cleared so picking the same file twice in a row still fires a change.
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      <input
        type="text"
        value={value ?? ""}
        placeholder="https://… o /uploads/…"
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(event) => upload(event.target.files?.[0])}
      />
      {busy && <small>Subiendo…</small>}
      {error && <small role="alert">{error}</small>}
      {value && <img className="admin-image-preview" src={value} alt="Vista previa" />}
    </label>
  );
}
