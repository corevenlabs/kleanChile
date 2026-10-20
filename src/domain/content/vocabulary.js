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

export const CATEGORIES = ["limpieza", "libreria", "escritorio", "ferreteria", "pausa-del-dia"];

/**
 * Lo que lee el cliente, con tildes, para cada slug.
 *
 * Los slugs son la excepción a «los identificadores van en inglés»: cada uno es
 * también la dirección pública de su página (`/limpieza`, `/pausa-del-dia`), y
 * una URL es texto que el cliente ve y comparte. Por eso van en español y sin
 * tildes, y el valor del enum en la base es el mismo slug.
 */
export const CATEGORY_LABELS = {
  limpieza: "Limpieza",
  libreria: "Librería",
  escritorio: "Escritorio",
  ferreteria: "Ferretería",
  "pausa-del-dia": "Pausa del día",
};
