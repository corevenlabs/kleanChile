/**
 * Immutable reads and writes against a dotted path, e.g. `slides.2.title`.
 *
 * The content blocks are nested and irregular — a footer holds sections that
 * hold links, a nav link holds a dropdown that holds sections that hold plain
 * strings. Addressing every field by path is what lets one editor component
 * drive all of them from a declarative description, instead of a bespoke form
 * per block with its own copy of the spread-and-replace logic.
 */

export function getAt(source, path) {
  return path
    .split(".")
    .reduce((current, key) => (current == null ? undefined : current[key]), source);
}

/**
 * Returns a copy of `source` with `path` set to `value`.
 *
 * Missing levels are created on the way down, and a numeric segment creates an
 * array rather than an object with a "0" key — otherwise `slides.0.title` on a
 * fresh block would produce `{slides: {0: …}}`, which renders as nothing and
 * fails validation with a message about the wrong type.
 */
export function setAt(source, path, value) {
  const [head, ...rest] = path.split(".");
  const base = source ?? (/^\d+$/.test(head) ? [] : {});
  const next = rest.length === 0 ? value : setAt(base[head], rest.join("."), value);

  if (Array.isArray(base)) {
    const copy = base.slice();
    copy[Number(head)] = next;
    return copy;
  }
  return { ...base, [head]: next };
}

/** Replaces the array at `path` with the result of `updater`. */
export function updateList(source, path, updater) {
  const current = getAt(source, path);
  return setAt(source, path, updater(Array.isArray(current) ? current : []));
}

export const insertAt = (list, item) => [...list, item];

export const removeAt = (list, index) => list.filter((_, position) => position !== index);

/** Moves an item one slot in `direction`; a no-op at either end. */
export function moveAt(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;

  const copy = list.slice();
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/**
 * Drops blank entries from arrays of strings, everywhere in the draft.
 *
 * Those arrays are edited as one-line-per-item textareas, so a trailing newline
 * or a gap left while rearranging arrives as `""`. Rendered, that is an empty
 * contact line or a nameless dropdown entry. Stripping them at save time keeps
 * the textarea usable while typing, which filtering on every keystroke would
 * not — you could never press Enter.
 */
export function pruneBlankStrings(value) {
  if (Array.isArray(value)) {
    const cleaned = value.map(pruneBlankStrings);
    return cleaned.every((entry) => typeof entry === "string")
      ? cleaned.filter((entry) => entry.trim() !== "")
      : cleaned;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, pruneBlankStrings(entry)]),
    );
  }

  return value;
}
