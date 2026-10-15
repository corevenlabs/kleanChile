import { CATEGORIES, CATEGORY_LABELS } from "./vocabulary.js";

/**
 * Hacia dónde lleva un enlace del sitio, en el idioma del panel.
 *
 * Todo lo que el admin enlaza —el botón de una diapositiva, un ítem del menú,
 * un enlace del pie— se sigue guardando como **una ruta de texto**, igual que
 * antes. Lo que cambia es cómo se elige: en vez de escribir `/coleccion/…` a
 * mano, se elige «Colección → Temporada escolar» y esto arma la ruta. Al
 * revés, una ruta guardada se lee de vuelta como esa elección.
 *
 * Que el almacenamiento no cambie es lo que permite adoptarlo sin migrar
 * ningún bloque: las rutas que ya existen se reconocen solas, y una que no
 * calza en ningún tipo queda como «Enlace personalizado», tal cual.
 *
 * Puro y sin dependencias, porque lo usan el panel (cliente) y el servidor.
 */

export const COLLECTION_BASE = "/coleccion";

export const collectionPath = (slug) => `${COLLECTION_BASE}/${slug}`;

/** Las páginas fijas del sitio que tiene sentido enlazar. */
export const SITE_PAGES = [
  { path: "/", label: "Inicio" },
  { path: "/contact", label: "Contacto" },
  { path: "/nosotros", label: "Nosotros" },
  { path: "/carrito", label: "Carrito" },
];

export const LINK_KINDS = [
  { value: "collection", label: "Una colección" },
  { value: "category", label: "Una categoría" },
  { value: "search", label: "Una búsqueda" },
  { value: "page", label: "Una página del sitio" },
  { value: "custom", label: "Enlace personalizado" },
];

export const categoryOptions = () =>
  CATEGORIES.map((slug) => ({ value: `/${slug}`, label: CATEGORY_LABELS[slug] }));

/**
 * Una ruta guardada → `{ kind, value }`.
 *
 * `value` es lo que muestra el segundo control: el slug de la colección, la
 * ruta de la categoría, el texto buscado o la ruta tal cual.
 */
export function readLink(path) {
  const raw = String(path ?? "").trim();
  if (raw === "") return { kind: "custom", value: "" };

  if (raw.startsWith(`${COLLECTION_BASE}/`)) {
    const slug = raw.slice(COLLECTION_BASE.length + 1).split(/[?#]/)[0];
    if (slug) return { kind: "collection", value: decodeURIComponent(slug) };
  }

  if (CATEGORIES.some((slug) => raw === `/${slug}`)) return { kind: "category", value: raw };

  if (raw.startsWith("/buscar")) {
    const query = new URLSearchParams(raw.split("?")[1] ?? "").get("q") ?? "";
    return { kind: "search", value: query };
  }

  if (SITE_PAGES.some((page) => page.path === raw)) return { kind: "page", value: raw };

  return { kind: "custom", value: raw };
}

/** `{ kind, value }` → la ruta que se guarda. */
export function buildLink(kind, value) {
  const text = String(value ?? "").trim();
  switch (kind) {
    case "collection":
      return text ? collectionPath(text) : "";
    // Sin recortar: se arma en cada tecla, y recortar ahí impediría escribir
    // el espacio entre dos palabras.
    case "search":
      return text ? `/buscar?q=${encodeURIComponent(String(value))}` : "/buscar";
    case "custom":
      return String(value ?? "");
    case "category":
    case "page":
    default:
      return text;
  }
}

/**
 * Una frase corta para el resumen de un enlace: «Colección: Temporada escolar».
 * `collections` es la lista `{ slug, name }` que conoce el panel.
 */
export function describeLink(path, collections = []) {
  const { kind, value } = readLink(path);
  switch (kind) {
    case "collection": {
      const found = collections.find((collection) => collection.slug === value);
      return found ? `Colección: ${found.name}` : `Colección que ya no existe (${value})`;
    }
    case "category":
      return `Categoría: ${categoryOptions().find((option) => option.value === value)?.label ?? value}`;
    case "search":
      return value ? `Búsqueda: «${value}»` : "Página de búsqueda";
    case "page":
      return `Página: ${SITE_PAGES.find((page) => page.path === value)?.label ?? value}`;
    default:
      return value || "Sin enlace";
  }
}
