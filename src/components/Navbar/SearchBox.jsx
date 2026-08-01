"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The navbar search.
 *
 * A real `<form method="get" action="/buscar">` underneath everything else.
 * That is what makes it work before React has hydrated, with JavaScript off,
 * and for anyone who submits with Enter and never sees the suggestions — the
 * dropdown is an accelerator on top of a form that already works, not the
 * mechanism itself.
 *
 * The dropdown follows the ARIA combobox pattern: the input keeps focus
 * throughout and `aria-activedescendant` moves the screen reader's cursor
 * through the options. Moving real focus into the list instead would be
 * simpler to write and would break typing, which is the one thing this control
 * exists to support.
 */

const MIN_CHARS = 2;
const DEBOUNCE_MS = 180;

export default function SearchBox({ placeholder = "Buscar productos...", onDone }) {
  const router = useRouter();
  const listId = useId();
  const optionId = (index) => `${listId}-opt-${String(index)}`;

  const [value, setValue] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const inputRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const term = value.trim();
    if (term.length < MIN_CHARS) {
      setResults([]);
      setOpen(false);
      return undefined;
    }

    /*
     * Every keystroke cancels the request before it. Without the abort, a slow
     * response for "det" can land after the one for "detergente" and repaint
     * the list with results for a query the person has already moved past.
     */
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/buscar?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setResults(data.results);
        setOpen(true);
        setActive(-1);
      } catch {
        // An aborted request is the normal path, not a failure. A real network
        // error leaves the previous list up; the form still submits.
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  // Clicking away closes the list. `mousedown` rather than `click` so it fires
  // before an option's own handler cannot.
  useEffect(() => {
    const onDown = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (href) => {
    setOpen(false);
    onDone?.();
    router.push(href);
  };

  const submit = (event) => {
    event.preventDefault();
    /*
     * Enter on a highlighted suggestion opens that product; Enter on the typed
     * text runs the full search. Both are what the person meant, and the
     * difference is whether they had arrowed into the list.
     */
    if (active >= 0 && results[active]) {
      go(`/product/${String(results[active].id)}`);
      return;
    }
    if (value.trim()) go(`/buscar?q=${encodeURIComponent(value.trim())}`);
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
    }
  };

  const expanded = open && results.length > 0;

  return (
    <div className="navbar__search" ref={boxRef}>
      <form action="/buscar" method="get" role="search" onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          {placeholder}
        </label>

        <div className="navbar__search-field">
          <svg className="navbar__search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
          </svg>

          <input
            id={`${listId}-input`}
            ref={inputRef}
            /* `name="q"` is what makes the no-JavaScript submit land on
               /buscar?q=… — the same URL the router pushes. */
            name="q"
            type="search"
            autoComplete="off"
            placeholder={placeholder}
            value={value}
            autoFocus
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
        </div>

        {/*
          The "ver todos" row sits outside the listbox on purpose. A
          `role="option"` may not contain a button, and it is not one of the
          options the arrow keys walk — it is the way out of the list.
        */}
        <div className="search-menu" hidden={!expanded}>
          <ul id={listId} role="listbox" aria-label="Sugerencias">
          {results.map((product, index) => (
            <li
              key={product.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              className={`search-menu__item ${index === active ? "search-menu__item--active" : ""}`}
              /* `mousedown` and not `click`: the input blurs on mousedown, and
                 anything that closes the list on blur would remove this row
                 before the click could land on it. */
              onMouseDown={(event) => {
                event.preventDefault();
                go(`/product/${String(product.id)}`);
              }}
              onMouseEnter={() => setActive(index)}
            >
              {product.image && <img src={product.image} alt="" width={40} height={40} loading="lazy" />}
              <span className="search-menu__text">
                <strong>{product.name}</strong>
                <small>
                  {product.skuCode && <span className="k-sku">{product.skuCode}</span>}
                  {!product.inStock && <span className="search-menu__out">Sin stock</span>}
                </small>
              </span>
              <span className="search-menu__price">{product.price}</span>
            </li>
          ))}
          </ul>

          {/* Into everything that matched, not just the six shown. */}
          <div className="search-menu__all">
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                if (value.trim()) go(`/buscar?q=${encodeURIComponent(value.trim())}`);
              }}
            >
              Ver todos los resultados de «{value.trim()}»
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
