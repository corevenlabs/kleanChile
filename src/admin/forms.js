import { DUAL_POSITIONS, WHY_US_ICONS } from "../domain/content/vocabulary";

/**
 * How each block of storefront content is edited.
 *
 * One entry per key in `contentSchemas`, describing fields and repeatable
 * groups; `BlockEditor` turns it into a form. Keeping this as data means adding
 * a field to a marketing section is a line here, not a new component.
 *
 * Field names are paths into the block (`dropdown.title`), so the form shape
 * does not have to mirror the storage shape one level at a time.
 */

const options = (values, labels = {}) =>
  values.map((value) => ({ value, label: labels[value] ?? value }));

const IMAGE = { name: "image", label: "Imagen", type: "image" };
const ALT = { name: "alt", label: "Texto alternativo (accesibilidad)" };

export const FORMS = {
  hero: {
    key: "hero",
    title: "Carrusel principal",
    description: "Las diapositivas grandes al inicio de la portada.",
    fields: [
      {
        name: "interval",
        label: "Intervalo entre diapositivas (ms)",
        type: "number",
        wide: false,
        hint: "3500 = 3,5 segundos.",
      },
    ],
    lists: [
      {
        name: "slides",
        label: "Diapositivas",
        addLabel: "Nueva diapositiva",
        itemTitle: (slide, index) => slide.title || `Diapositiva ${String(index + 1)}`,
        blank: {
          eyebrow: "",
          title: "",
          description: "",
          cta: "Ver más",
          image: "",
          alt: "",
          path: "/",
        },
        fields: [
          { name: "eyebrow", label: "Antetítulo", wide: false },
          { name: "title", label: "Título", wide: false },
          { name: "description", label: "Descripción", type: "textarea" },
          { name: "cta", label: "Texto del botón", wide: false },
          {
            name: "path",
            label: "El botón lleva a",
            type: "link",
            hint: "Para mostrar un grupo de productos, elige «Una colección». Las colecciones se arman en Colecciones.",
          },
          IMAGE,
          ALT,
        ],
      },
    ],
  },

  bestSellers: {
    key: "bestSellers",
    title: "Productos más vendidos",
    description:
      "Los productos se ordenan solos según lo que se ha vendido en pedidos confirmados. Aquí solo se ajusta cómo se presenta la sección.",
    fields: [
      { name: "title", label: "Título de la sección", wide: false },
      {
        name: "limit",
        label: "Cuántos mostrar",
        type: "number",
        wide: false,
        hint: "Entre 1 y 24.",
      },
      { name: "linkLabel", label: "Texto del enlace", wide: false },
      { name: "linkPath", label: "El enlace lleva a", type: "link" },
    ],
  },

  dualBanner: {
    key: "dualBanner",
    title: "Banner doble",
    description:
      "El primer bloque ocupa la columna izquierda; los siguientes se apilan a la derecha.",
    fields: [],
    lists: [
      {
        name: "blocks",
        label: "Bloques",
        addLabel: "Nuevo bloque",
        itemTitle: (block, index) => block.title || `Bloque ${String(index + 1)}`,
        blank: {
          position: "top",
          image: "",
          alt: "",
          eyebrow: "",
          title: "",
          description: "",
          path: "/",
          cta: "Ver productos",
        },
        fields: [
          {
            name: "position",
            label: "Posición",
            type: "select",
            wide: false,
            options: options(DUAL_POSITIONS, {
              left: "Izquierda (grande)",
              top: "Derecha superior",
              bottom: "Derecha inferior",
            }),
          },
          { name: "eyebrow", label: "Antetítulo", wide: false },
          { name: "title", label: "Título", wide: false },
          { name: "cta", label: "Texto del botón", wide: false },
          {
            name: "description",
            label: "Descripción (solo el bloque grande la muestra)",
            type: "textarea",
          },
          { name: "path", label: "El botón lleva a", type: "link" },
          IMAGE,
          ALT,
        ],
      },
    ],
  },

  whyUs: {
    key: "whyUs",
    title: "Por qué elegirnos",
    fields: [
      { name: "eyebrow", label: "Antetítulo", wide: false },
      { name: "title", label: "Título", wide: false },
      { name: "subtitle", label: "Subtítulo", type: "textarea" },
    ],
    lists: [
      {
        name: "reasons",
        label: "Razones",
        addLabel: "Nueva razón",
        itemTitle: (reason, index) => reason.title || `Razón ${String(index + 1)}`,
        blank: { icon: "star", title: "", desc: "" },
        fields: [
          {
            name: "icon",
            label: "Ícono",
            type: "select",
            wide: false,
            options: options(WHY_US_ICONS, {
              star: "Estrella",
              arrow: "Flecha",
              shield: "Escudo",
              clock: "Reloj",
              price: "Precio",
              catalog: "Catálogo",
            }),
          },
          { name: "title", label: "Título", wide: false },
          { name: "desc", label: "Descripción", type: "textarea" },
        ],
      },
    ],
  },

  testimonials: {
    key: "testimonials",
    title: "Testimonios",
    fields: [
      { name: "label", label: "Etiqueta", wide: false },
      { name: "title", label: "Título", wide: false },
      { name: "subtitle", label: "Subtítulo", type: "textarea" },
    ],
    lists: [
      {
        name: "items",
        label: "Testimonios",
        addLabel: "Nuevo testimonio",
        itemTitle: (item, index) => item.nombre || `Testimonio ${String(index + 1)}`,
        blank: { nombre: "", cargo: "", empresa: "", comentario: "", fecha: "" },
        fields: [
          { name: "nombre", label: "Nombre", wide: false },
          { name: "cargo", label: "Cargo", wide: false },
          { name: "empresa", label: "Empresa", wide: false },
          { name: "fecha", label: "Fecha", wide: false, placeholder: "15 Jun 2026" },
          { name: "comentario", label: "Comentario", type: "textarea", rows: 4 },
        ],
      },
    ],
  },

  brands: {
    key: "brands",
    title: "Marcas",
    description: "La cinta de logotipos. Si un logo no carga, se muestra el nombre.",
    fields: [{ name: "label", label: "Título de la sección" }],
    lists: [
      {
        name: "items",
        label: "Logotipos",
        addLabel: "Nueva marca",
        itemTitle: (brand, index) => brand.name || `Marca ${String(index + 1)}`,
        blank: { name: "", logo: "" },
        fields: [
          { name: "name", label: "Nombre", wide: false },
          { name: "logo", label: "Logotipo", type: "image" },
        ],
      },
    ],
  },

  /*
   * El menú no está acá: tiene su propio editor, `NavigationEditor`. Sus ítems
   * llevan cada uno un destino, y la forma genérica de listas dentro de listas
   * dentro de listas era justamente la parte del panel que nadie entendía.
   */

  footer: {
    key: "footer",
    title: "Pie de página",
    fields: [
      { name: "brand", label: "Nombre comercial", wide: false },
      { name: "copyright", label: "Texto de copyright", wide: false },
      { name: "description", label: "Descripción", type: "textarea" },
      { name: "contact.title", label: "Título de contacto", wide: false },
      {
        name: "contact.items",
        label: "Datos de contacto",
        type: "lines",
        hint: "Uno por línea: correo, teléfono, ciudad.",
      },
      { name: "location.title", label: "Título de ubicación", wide: false },
      { name: "location.cta", label: "Texto del enlace al mapa", wide: false },
      {
        name: "location.embedUrl",
        label: "URL del mapa incrustado",
        hint: "La dirección «output=embed» de Google Maps.",
      },
      { name: "location.mapUrl", label: "URL del mapa (enlace externo)" },
      { name: "location.mapTitle", label: "Título del mapa (accesibilidad)" },
    ],
    lists: [
      {
        name: "sections",
        label: "Columnas de enlaces",
        addLabel: "Nueva columna",
        itemTitle: (section, index) => section.title || `Columna ${String(index + 1)}`,
        blank: { title: "", links: [] },
        fields: [{ name: "title", label: "Título de la columna" }],
        lists: [
          {
            name: "links",
            label: "Enlaces",
            addLabel: "Nuevo enlace",
            itemTitle: (link, index) => link.label || `Enlace ${String(index + 1)}`,
            blank: { label: "", path: "/" },
            fields: [
              { name: "label", label: "Texto", wide: false },
              { name: "path", label: "Lleva a", type: "link" },
            ],
          },
        ],
      },
    ],
  },

  whatsapp: {
    key: "whatsapp",
    title: "Botón de WhatsApp",
    description: "El botón flotante presente en todas las páginas públicas.",
    fields: [
      {
        name: "phoneNumber",
        label: "Número",
        wide: false,
        placeholder: "56912345678",
        hint: "Solo dígitos, en formato internacional y sin el signo +.",
      },
      { name: "ariaLabel", label: "Etiqueta de accesibilidad", wide: false },
      { name: "message", label: "Mensaje inicial", type: "textarea" },
      { name: "icon", label: "Ícono", type: "image" },
      { name: "alt", label: "Texto alternativo del ícono" },
    ],
  },
};

/** The blocks that make up the public home page, in the order they appear. */
export const HOME_BLOCKS = [
  "hero",
  "bestSellers",
  "dualBanner",
  "testimonials",
  "whyUs",
  "brands",
];

/** Los bloques de Configuración que se editan con `BlockEditor` (el menú tiene el suyo). */
export const SITE_BLOCKS = ["footer", "whatsapp"];
