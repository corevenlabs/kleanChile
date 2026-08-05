/**
 * A qué puede apuntar una columna de la planilla.
 *
 * Tres cosas tienen que estar de acuerdo sobre esta lista: el selector de
 * mapeo, el validador de filas y la plantilla que se descarga. Por eso vive
 * acá como datos y no repartida por el código — una sola fuente es la forma de
 * que no se desincronicen.
 */

export const FIELDS = [
  {
    key: "sku",
    label: "SKU",
    hint: "Déjalo vacío para crear un producto nuevo. Si viene, actualiza el producto con ese código.",
    aliases: ["sku", "codigo", "código", "cod", "codigo sku", "código sku", "code"],
  },
  {
    key: "name",
    label: "Nombre",
    hint: "Obligatorio al crear.",
    aliases: ["nombre", "producto", "descripcion producto", "descripción producto", "name", "detalle"],
  },
  {
    key: "category",
    label: "Categoría",
    hint: "Limpieza, Librería o Escritorio. Obligatorio al crear.",
    aliases: ["categoria", "categoría", "category", "familia", "rubro"],
  },
  {
    key: "type",
    label: "Tipo",
    hint: "El filtro de la categoría: químico, herramienta, cuaderno… Obligatorio al crear.",
    aliases: ["tipo", "type", "subcategoria", "subcategoría", "subfamilia"],
  },
  {
    key: "price",
    label: "Precio",
    hint: "En pesos. Acepta 12990, 12.990 o $12.990. Obligatorio al crear.",
    aliases: ["precio", "price", "valor", "valor neto", "precio venta", "pvp"],
  },
  {
    key: "stock",
    label: "Stock",
    hint: "Conteo real de unidades, no un ajuste. La diferencia queda en el libro de inventario.",
    aliases: ["stock", "existencia", "existencias", "cantidad", "inventario", "saldo"],
  },
  {
    key: "description",
    label: "Descripción",
    hint: "Texto largo que se muestra en la ficha del producto.",
    aliases: ["descripcion", "descripción", "description", "detalle largo", "glosa"],
  },
  {
    key: "image",
    label: "Imagen (URL)",
    hint: "Dirección de la imagen. Las imágenes se enlazan por URL, no se suben en la planilla.",
    aliases: ["imagen", "image", "foto", "url imagen", "imagen url", "picture"],
  },
  {
    key: "specSheet",
    label: "Ficha técnica (URL)",
    hint: "Enlace al PDF. Si viene, la ficha del producto muestra ese documento en vez de la tabla de especificaciones.",
    aliases: [
      "ficha",
      "ficha tecnica",
      "ficha técnica",
      "ficha tecnica url",
      "hoja tecnica",
      "hoja técnica",
      "pdf",
      "url ficha",
      "spec sheet",
      "datasheet",
      "hds",
    ],
  },
  {
    key: "active",
    label: "Publicado",
    hint: "Sí/No. Vacío deja el producto como está; al crear, se publica.",
    aliases: ["publicado", "activo", "active", "visible", "estado", "habilitado"],
  },
];

/** Los que una fila necesita para poder crear un producto desde cero. */
export const REQUIRED_TO_CREATE = ["name", "category", "type", "price"];

export const FIELD_KEYS = FIELDS.map((field) => field.key);

export const fieldByKey = (key) => FIELDS.find((field) => field.key === key) ?? null;

export const fieldLabel = (key) => fieldByKey(key)?.label ?? key;
