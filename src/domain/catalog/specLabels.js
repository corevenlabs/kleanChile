/**
 * Cómo se llama una especificación cuando se la muestra.
 *
 * Las claves de `products.specs` son las que trajo el catálogo original
 * —`contenido_neto`, `advertencias_uso`— y son libres: un producto nuevo puede
 * estrenar una que nadie previó. Por eso esto es un mapa con un respaldo que
 * funciona siempre, y no una lista cerrada: una clave desconocida se muestra
 * con guiones bajos por espacios y en mayúscula inicial, que casi siempre es lo
 * correcto y nunca es una celda vacía.
 *
 * Vive en `domain/` porque lo usan dos cosas que no se conocen entre sí: la
 * ficha del producto en la tienda y el PDF que se genera al vuelo. Cuando
 * estaban duplicadas, agregar una etiqueta significaba acordarse de los dos
 * lugares, y el PDF era el que se iba a quedar atrás.
 */

const LABELS = {
  marca: "Marca",
  advertencias_almacenamiento: "Advertencias de Almacenamiento",
  advertencias_uso: "Advertencias de Uso",
  beneficios_uso: "Beneficios de Uso",
  contenido_neto: "Contenido Neto",
  denominacion_variedad: "Denominación/Variedad",
  modo_uso: "Modo de Uso",
  tipo_producto: "Tipo de Producto",
  concentrado: "Concentrado",
  unidades_por_paquete: "Unidades por Paquete",
  estado_producto: "Estado de Producto",
  formato: "Formato",
  presentacion_empaque: "Presentación/Empaque",
};

export function specLabel(key) {
  return LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Las especificaciones listas para dibujar: `[[etiqueta, valor]]`.
 *
 * Descarta las de valor vacío. Una clave que quedó sin valor en el editor es un
 * renglón a medio escribir, y en una tabla de dos columnas se ve como un dato
 * que falta en vez de como un dato que no aplica.
 */
export function specEntries(specs) {
  return Object.entries(specs ?? {})
    .filter(([, value]) => String(value ?? "").trim() !== "")
    .map(([key, value]) => [specLabel(key), String(value)]);
}
