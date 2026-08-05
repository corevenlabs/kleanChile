import { z } from "zod";
import { DUAL_POSITIONS, WHY_US_ICONS } from "./vocabulary.js";

/**
 * The shape of every editable block on the storefront.
 *
 * These are the contract between the admin forms, the `content_blocks` table
 * and the components that render the result. A JSONB column will hold whatever
 * it is given; these schemas are what stop that looseness from reaching a
 * component.
 *
 * Two rules run through all of them:
 *
 * **Every field has a default**, so `schema.parse({})` succeeds. A block that
 * has never been saved, or whose row was corrupted, then degrades to an empty
 * section rather than throwing during render — a marketing panel is not worth
 * a 500 on the home page.
 *
 * **Anything a component uses as a lookup key is an enum.** `whyUs.icon`
 * indexes a map of SVG paths and `bestSellers.badge` indexes a map of CSS
 * classes; a free-text value there renders a blank icon or an unstyled badge,
 * which is the kind of bug that reaches production because nothing errors.
 */

/** Ids only exist as React keys, so they are filled in rather than demanded. */
const withNumericIds = (item) =>
  z
    .array(item)
    .default([])
    .transform((list) => list.map((entry, index) => ({ ...entry, id: entry.id ?? index + 1 })));

const withTextIds = (item) =>
  z
    .array(item)
    .default([])
    .transform((list) =>
      list.map((entry, index) => ({ ...entry, id: entry.id ?? `block-${String(index + 1)}` })),
    );

const text = (fallback = "") => z.string().default(fallback);
const optionalId = z.union([z.string(), z.number()]).optional();

// ── Hero carousel ────────────────────────────────────────────────────────────

export const heroSchema = z.object({
  /** Milliseconds between slides. Floored so the carousel cannot busy-loop. */
  interval: z.number().int().min(1000).max(60000).default(3500),
  slides: withNumericIds(
    z.object({
      id: optionalId,
      eyebrow: text(),
      title: text(),
      description: text(),
      cta: text("Ver más"),
      image: text(),
      alt: text(),
      path: text("/"),
    }),
  ),
});

// ── Best sellers rail ────────────────────────────────────────────────────────

/**
 * The best-sellers rail — heading and link only.
 *
 * Which products appear is **not** stored here. They are ranked by units
 * actually sold, so the section maintains itself: a product that starts moving
 * arrives on the home page without anyone remembering to put it there. The
 * only knob is how many to show.
 *
 * This block used to carry its own list of products, duplicating names and
 * prices that also existed in the catalog. Those tiles are now real catalog
 * rows — see the seed script.
 */
export const bestSellersSchema = z.object({
  title: text("Productos más vendidos"),
  linkLabel: text("Ver más productos"),
  linkPath: text("/cleaning"),
  /** Capped: the rail scrolls, but a hundred cards is a slow page, not a shop. */
  limit: z.number().int().min(1).max(24).default(8),
});

// ── Dual banner ──────────────────────────────────────────────────────────────

/**
 * `DualBanner` renders the first block large on the left and stacks the rest on
 * the right, so `position` is a layout slot the CSS keys off, not a free label.
 */
export const dualBannerSchema = z.object({
  blocks: withTextIds(
    z.object({
      id: optionalId,
      position: z.enum(DUAL_POSITIONS).default("top"),
      image: text(),
      alt: text(),
      eyebrow: text(),
      title: text(),
      /** Optional by design: only the large left block carries body copy. */
      description: z.string().nullish().default(null),
      path: text("/"),
      cta: text("Ver productos"),
    }),
  ),
});

// ── Why us ───────────────────────────────────────────────────────────────────

export const whyUsSchema = z.object({
  eyebrow: text("Por qué elegirnos"),
  title: text(),
  subtitle: text(),
  reasons: withNumericIds(
    z.object({
      id: optionalId,
      icon: z.enum(WHY_US_ICONS).default("star"),
      title: text(),
      desc: text(),
    }),
  ),
});

// ── Testimonials ─────────────────────────────────────────────────────────────

/**
 * Field names are Spanish here, unlike everywhere else in the schema layer.
 * They match the JSON this block was seeded from and the property names the
 * component already reads; renaming them would be a migration and a component
 * edit to gain nothing a reader of `testimonial-card__nombre` does not already
 * understand.
 */
export const testimonialsSchema = z.object({
  label: text("testimonios"),
  title: text(),
  subtitle: text(),
  items: withNumericIds(
    z.object({
      id: optionalId,
      nombre: text(),
      cargo: text(),
      empresa: text(),
      comentario: text(),
      fecha: text(),
    }),
  ),
});

// ── Brand strip ──────────────────────────────────────────────────────────────

export const brandsSchema = z.object({
  label: text("Marcas que trabajamos"),
  items: z
    .array(z.object({ name: text(), logo: text() }))
    .default([]),
});

// ── Site chrome ──────────────────────────────────────────────────────────────

const navDropdownSchema = z.object({
  title: text(),
  sections: z
    .array(z.object({ title: text(), items: z.array(z.string()).default([]) }))
    .default([]),
});

export const navigationSchema = z.object({
  brand: text("KleanChile"),
  searchPlaceholder: text("Buscar productos..."),
  links: z
    .array(
      z.object({
        name: text(),
        path: text("/"),
        dropdown: navDropdownSchema.nullish().default(null),
      }),
    )
    .default([]),
});

export const footerSchema = z.object({
  brand: text("KleanChile"),
  description: text(),
  sections: z
    .array(
      z.object({
        title: text(),
        links: z.array(z.object({ label: text(), path: text("/") })).default([]),
      }),
    )
    .default([]),
  /*
   * `prefault`, no `default`, y la diferencia no es cosmética.
   *
   * En Zod 4 el valor de `.default()` es la **salida** y no se vuelve a parsear:
   * `.default({})` entrega literalmente `{}`, sin `title` y sin `items`. La
   * promesa de «todo campo tiene default, así que un bloque nunca guardado
   * degrada a una sección vacía» se cumplía a medias — `parse({})` no tiraba,
   * pero devolvía un objeto al que le faltaban las claves que el componente usa,
   * y el `Footer` reventaba con «Cannot read properties of undefined» al hacer
   * `contact.items.map`.
   *
   * `.prefault({})` sí pasa el valor por el schema, así que los defaults de
   * adentro se aplican. Solo hace falta en objetos anidados: un `.default([])`
   * de arreglo o un `.default("")` de texto ya son el valor final.
   *
   * Esto se vio con una base migrada y sin sembrar, que es exactamente el estado
   * de un despliegue nuevo entre `db:migrate` y la primera edición.
   */
  contact: z
    .object({
      title: text("Contacto"),
      /** Rendered as free lines: email, phone, city. */
      items: z.array(z.string()).default([]),
    })
    .prefault({}),
  location: z
    .object({
      title: text("Ubicación"),
      embedUrl: text(),
      mapUrl: text(),
      mapTitle: text(),
      cta: text("Ver en Google Maps"),
    })
    .prefault({}),
  copyright: text(),
});

export const whatsappSchema = z.object({
  /** Digits only, international format — it goes straight into a wa.me URL. */
  phoneNumber: z
    .string()
    .regex(/^\d*$/, "Usa solo dígitos, en formato internacional")
    .default(""),
  message: text(),
  ariaLabel: text("Chat en WhatsApp"),
  icon: text("/whatsapp-fill.svg"),
  alt: text("WhatsApp"),
});

// ── Registry ─────────────────────────────────────────────────────────────────

/**
 * Every block, by the key its row uses.
 *
 * The admin iterates this to know what it can edit, and the storefront reads
 * through it, so adding a section to the site means adding a schema here and
 * nothing else structural.
 */
export const contentSchemas = {
  hero: heroSchema,
  bestSellers: bestSellersSchema,
  dualBanner: dualBannerSchema,
  whyUs: whyUsSchema,
  testimonials: testimonialsSchema,
  brands: brandsSchema,
  navigation: navigationSchema,
  footer: footerSchema,
  whatsapp: whatsappSchema,
};

export const CONTENT_KEYS = Object.keys(contentSchemas);

/** The block as it looks before anyone has edited it. */
export function defaultBlock(key) {
  return contentSchemas[key].parse({});
}

/**
 * Parses a stored value, falling back to defaults.
 *
 * For reads only. A save path must use `contentSchemas[key].safeParse` and show
 * the person the error — quietly substituting defaults for what they typed
 * would look like the form silently discarding their work.
 */
export function parseBlock(key, value) {
  const schema = contentSchemas[key];
  if (!schema) throw new Error(`Unknown content block: ${key}`);

  const result = schema.safeParse(value);
  return result.success ? result.data : schema.parse({});
}
