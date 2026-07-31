/**
 * The navbar's dropdown, treated as a product finder rather than a taxonomy.
 *
 * Its items are free text someone types into `/admin/configuracion` —
 * "Detergentes", "Aspiradoras", "Novelas". Products carry a `type` ("químico",
 * "resma") that was never built to line up with them, and no table anywhere
 * relates the two. Matching a menu item against a `type` column would mean
 * every new menu entry needed a matching enum value and a migration.
 *
 * So a menu item is a **search term scoped to its category**: it matches a
 * product whose name, type or description contains it. Someone can add
 * "Guantes de nitrilo" tonight and it works the moment the catalog agrees —
 * and when nothing matches, the page says so instead of 404ing, because an
 * empty shelf is a real answer and a missing route is not.
 *
 * Pure and free of framework imports, so the navbar (a Client Component) and
 * the category route can share exactly one definition of what a slug means.
 * If they disagreed, every link in the menu would point one character away
 * from the page that answers it.
 */

/**
 * Combining marks, spelled as escapes on purpose: written literally these are
 * two invisible characters in the middle of a character class, and the first
 * editor or formatter that touches them breaks the regex silently.
 */
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase();

/** "Lámparas de escritorio" → "lamparas-de-escritorio". */
export function slugify(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Where a dropdown item points: the category page, narrowed by the item. */
export function classificationHref(basePath, item) {
  return `${basePath}/${slugify(item)}`;
}

/**
 * A readable heading for a slug nobody recognises.
 *
 * Only a fallback. Accents do not survive slugification, so "lamparas" can
 * never be turned back into "Lámparas" — which is why `findClassification`
 * below prefers the label the menu actually carries.
 */
export function unslugify(slug) {
  const words = slug.split("-").filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Finds the menu entry a slug came from, for the heading and breadcrumb.
 *
 * Someone who clicked "Lámparas" should read "Lámparas" at the top of the
 * page, not "Lamparas". A slug typed straight into the address bar has no menu
 * entry behind it; that still searches, it just loses the accent.
 */
export function findClassification(navigation, categoryPath, slug) {
  const link = navigation.links.find((entry) => entry.path === categoryPath);

  for (const section of link?.dropdown?.sections ?? []) {
    for (const item of section.items) {
      if (slugify(item) === slug) return { slug, label: item, section: section.title };
    }
  }

  return { slug, label: unslugify(slug), section: null };
}

/**
 * Spanish plurals, folded just far enough to be useful.
 *
 * The menu is written in the plural ("Detergentes") and products are named in
 * the singular ("Detergente Ajax 5L"), so an exact match would find nothing on
 * almost every item in the menu. The length guards keep short words intact —
 * "mouse" must not become "mou", and "cloro" is not a plural at all.
 */
function stem(word) {
  if (word.length > 5 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/**
 * The products in a category that answer a classification.
 *
 * Every word has to match, so a two-word item narrows rather than widens.
 * Matching is on the substring, which errs toward showing too much: a buyer
 * who sees one extra product scrolls past it, while one who sees none assumes
 * the shop does not stock it.
 */
export function filterByClassification(products, slug) {
  const words = slug.split("-").filter(Boolean).map(stem);
  if (words.length === 0) return products;

  return products.filter((product) => {
    const haystack = normalize(
      `${product.name} ${product.type} ${product.description ?? ""}`,
    );
    return words.every((word) => haystack.includes(word));
  });
}
