/**
 * The closed sets of values the storefront components can actually render.
 *
 * Kept apart from `schemas.js` so the admin forms can offer them as dropdown
 * options without dragging Zod into the browser bundle. One definition, two
 * consumers: the schema validates against these, the form offers exactly these.
 */

/** `BestSellers` maps each to a colour class; anything else renders unstyled. */
export const BADGES = ["Más vendido", "Oferta", "Nuevo"];

/** Layout slots in the dual banner: one large block, then two stacked. */
export const DUAL_POSITIONS = ["left", "top", "bottom"];

/** The icons `WhyUs` has SVG paths for. */
export const WHY_US_ICONS = ["star", "arrow", "shield", "clock", "price", "catalog"];

export const CATEGORIES = ["cleaning", "bookshop", "desktop"];

/** Spanish labels for the category slugs, which are English like every other identifier. */
export const CATEGORY_LABELS = {
  cleaning: "Limpieza",
  bookshop: "Librería",
  desktop: "Escritorio",
};
