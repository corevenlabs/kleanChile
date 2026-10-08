/**
 * The shop's name, set the way the logo sets it.
 *
 * The client's lockup draws "Ruta" heavy and rounded and "Corp" thin, and the
 * gradient runs **per letter**: every glyph goes from cyan at its bottom-left to
 * navy at its top-right, which is why the "u", the "o" and the "p" each have a
 * light side of their own. One gradient across the word reads flat and pale next
 * to it, so each letter gets its own box.
 *
 * Splitting into letters would make some screen readers spell the name out, so
 * the letters are `aria-hidden` and the whole name sits beside them as text for
 * assistive technology — still real text, selectable and read as one word.
 *
 * The name is editable in the admin, so it is split rather than hard-coded: at
 * the second capital ("RutaCorp" → "Ruta" + "Corp"). A name with no second
 * capital is set whole in the heavy cut, which is what the logo leads with.
 */
export default function Wordmark({ name, className = "" }) {
  const text = name ?? "";
  const [lead, rest] = splitName(text);

  return (
    <span className={`wordmark ${className}`.trim()}>
      <span className="sr-only">{text}</span>
      <span className="wordmark__lead" aria-hidden="true">
        {letters(lead)}
      </span>
      {rest && (
        <span className="wordmark__rest" aria-hidden="true">
          {letters(rest)}
        </span>
      )}
    </span>
  );
}

export function splitName(name) {
  const match = /^(\p{Lu}[^\p{Lu}\s]+)\s?(\p{Lu}.*)$/u.exec(name.trim());
  return match ? [match[1], match[2]] : [name, ""];
}

function letters(word) {
  return Array.from(word).map((char, index) => (
    <span className="wordmark__ch" key={index}>
      {char}
    </span>
  ));
}
