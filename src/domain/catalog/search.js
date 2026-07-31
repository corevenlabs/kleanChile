import { isValidSkuCode } from "./skuCode.js";

/**
 * Searching the catalogue.
 *
 * Runs in memory over a snapshot rather than in Postgres, for the same reason
 * `buildPlan` takes the catalogue as an argument: it is pure, so what the
 * search returns can be checked without a database, and the snapshot is
 * already cached and tag-invalidated for the pages.
 *
 * That is a decision with a size attached. At forty-six products this is a
 * fraction of a millisecond and one cache read. **Past roughly a thousand it
 * should move to Postgres** — a `tsvector` column with a GIN index, or
 * `pg_trgm` for the fuzzy part. The seam is `getSearchableProducts`: replace
 * what it returns and this file stops being the search.
 *
 * Ranking, not just filtering. A shop where "cloro" returns eleven products in
 * catalogue order has answered the query and not the question; the one whose
 * name is Cloro belongs first.
 */

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase();

/**
 * The forms of a word worth looking for.
 *
 * Spanish plurals, folded the same way the navbar classifications fold them —
 * someone typing "guantes" and someone clicking "Guantes" in the menu are
 * asking the same question and must not get different answers.
 *
 * The `z → c` rule is the one that is not obvious and the one that bit:
 * "lápiz" pluralises to "lápices", so a shop selling "Set de lápices" returned
 * nothing for "lapiz" — the single most likely thing a person types.
 *
 * Returns candidates rather than one stem because these are matched as
 * substrings; the shortest form is the most forgiving, and being forgiving in
 * the direction of showing an extra product is the right way to be wrong.
 */
function variants(word) {
  const forms = new Set([word]);

  if (word.length > 5 && word.endsWith("es")) forms.add(word.slice(0, -2));
  if (word.length > 3 && word.endsWith("s")) forms.add(word.slice(0, -1));
  // lapiz → lapic, which is a prefix of "lapices"; luz → luc, of "luces".
  if (word.length > 3 && word.endsWith("z")) forms.add(`${word.slice(0, -1)}c`);

  return [...forms];
}

/**
 * Words too common to narrow anything.
 *
 * Without this, "papel de cocina" requires "de" to appear in the product, and
 * a two-word query silently becomes a three-word one.
 */
const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "y", "o", "para", "con", "un", "una"]);

export function parseQuery(raw) {
  const text = String(raw ?? "").trim();

  /*
   * Splitting on anything that is not a letter or a digit is also what keeps
   * these safe to put in a `RegExp` below: after this there is nothing left
   * for a user to inject.
   */
  const words = normalize(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((word) => !STOPWORDS.has(word));

  return {
    text,
    // A query of nothing but stopwords — "de la" — is not a search for
    // anything. Falling back to matching them found every product with "de"
    // in its description, which reads as the search being broken.
    words: words.map(variants),
    /** SKUs are typed back from a WhatsApp order, usually in full. */
    sku: isValidSkuCode(text.toUpperCase()) ? text.toUpperCase() : null,
  };
}

/**
 * How well one product answers one word.
 *
 * The weights encode what a buyer means. A hit in the name is the product
 * being asked for; a hit in the description is the product mentioning it in
 * passing — "no contiene cloro" should not outrank the bottle of Cloro.
 */
function scoreForm(product, form) {
  const name = normalize(product.name);
  const type = normalize(product.type);
  const description = normalize(product.description);

  if (name === form) return 100;
  // Word-start beats mid-word: "papel" should find "Papel Higiénico" before
  // anything that merely contains those letters.
  if (new RegExp(`\\b${form}`).test(name)) return 60;
  if (name.includes(form)) return 30;
  if (new RegExp(`\\b${form}`).test(type)) return 18;
  if (description.includes(form)) return 8;
  return 0;
}

/** The best any form of the word can do. */
function scoreWord(product, forms) {
  let best = 0;
  for (const form of forms) best = Math.max(best, scoreForm(product, form));
  return best;
}

/**
 * @param products  the catalogue snapshot
 * @param raw       what the person typed
 * @param limit     0 for everything
 */
export function searchProducts(products, raw, { limit = 0 } = {}) {
  const query = parseQuery(raw);
  if (query.words.length === 0 && !query.sku) return [];

  /*
   * An exact SKU is not a search, it is a lookup.
   *
   * Customers retype these off a WhatsApp order to reorder the same thing.
   * Returning that product alone, rather than ranked among near-misses, is the
   * difference between an answer and a list.
   */
  if (query.sku) {
    const match = products.find((product) => product.skuCode === query.sku);
    if (match) return [{ ...match, score: 1000 }];
  }

  const scored = [];

  for (const product of products) {
    let total = 0;
    let matchedAll = true;

    for (const forms of query.words) {
      const score = scoreWord(product, forms);
      if (score === 0) {
        matchedAll = false;
        break;
      }
      total += score;
    }

    // Every word has to land somewhere. Adding words must narrow the result,
    // or "papel higienico" returns every product that mentions paper.
    if (!matchedAll) continue;

    // A partial SKU still finds the product, just without jumping the queue.
    if (query.sku === null && product.skuCode) {
      const code = normalize(product.skuCode);
      if (query.words.some((forms) => forms.some((form) => code.includes(form)))) total += 40;
    }

    // Out of stock sorts last among equals: still findable, since a buyer
    // asking for it is exactly who should be told it exists and is gone.
    scored.push({ ...product, score: total + (product.inStock ? 2 : 0) });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "es"));

  return limit > 0 ? scored.slice(0, limit) : scored;
}
