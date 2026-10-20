import { CATEGORY_LABELS } from "../content/vocabulary.js";

/**
 * What a category page tells a search engine it is.
 *
 * The category pages shared the site-wide description, which reads to a crawler as
 * three copies of the same page. Written here rather than in each route so the
 * filtered variants ("Cloro en Limpieza") derive from the same sentence, and so
 * there is one place to change the pitch.
 *
 * Kept out of `content_blocks` on purpose: this is not marketing copy someone
 * will want to tune weekly, and adding a tenth block to the admin for three
 * sentences would cost more attention than it saves.
 */
const PITCH = {
  limpieza:
    "Detergentes, desinfectantes, papel y equipos de aseo para colegios, hoteles, oficinas e industria.",
  libreria:
    "Útiles escolares, papelería y material de oficina por volumen para instituciones.",
  escritorio:
    "Sillas, escritorios, periféricos y organización para puestos de trabajo.",
  ferreteria:
    "Herramientas, fijaciones, cintas y artículos de mantención para edificios, bodegas y talleres.",
  "pausa-del-dia":
    "Café, té, azúcar, endulzantes, vasos y artículos de cafetería para oficinas, salas de profesores y comedores.",
};

export function categoryDescription(category, classification = null) {
  const label = CATEGORY_LABELS[category];

  if (classification) {
    return `${classification.label} en ${label}. ${PITCH[category]} Cotiza por WhatsApp con despacho a todo Chile.`;
  }

  return `${label} para instituciones. ${PITCH[category]} Cotiza por WhatsApp con despacho a todo Chile.`;
}
