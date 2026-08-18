/**
 * Las fotos del catálogo, desde donde estén, hacia R2.
 *
 *     node scripts/import-catalog-images.js --xlsx "PRODUCTOS WEB.xlsx"
 *     node scripts/import-catalog-images.js --xlsx "PRODUCTOS WEB.xlsx" --apply
 *
 * Atiende dos orígenes en la misma corrida, porque el catálogo llegó por dos
 * caminos distintos y el destino es uno solo:
 *
 * - **La planilla del proveedor.** Las fotos vienen incrustadas, ancladas sobre
 *   la fila del producto. No hay columna con una URL.
 * - **`public/uploads/`.** Lo que quedó de importaciones anteriores, cuando no
 *   había bucket.
 *
 * Sin `--apply` no escribe nada: mismo corte que `buildPlan`/`applyImportPlan`
 * en el importador de planillas, para mirar el resultado antes de aceptarlo.
 *
 * Cada original pasa por `processImage` —el mismo pipeline que usa el panel— así
 * que una foto importada acá y una subida a mano quedan indistinguibles: mismas
 * claves direccionadas por contenido, mismo escalón AVIF/WebP, y `Picture` arma
 * el `<picture>` con `srcset` en vez de caer al `<img>` simple.
 *
 * Un original que ya está en el bucket no se vuelve a subir: la clave es el hash
 * de sus bytes, así que repetir la corrida converge en los mismos objetos.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import ExcelJS from "exceljs";

config({ path: ".env.local" });

const { rawSql } = await import("../src/infra/db/client.js");
const { processImage } = await import("../src/infra/storage/imagePipeline.js");
const { objectExists, publicUrl, uploadObject } = await import("../src/infra/storage/r2.js");
const { db } = await import("../src/infra/db/client.js");
const { media } = await import("../src/infra/db/schema/index.js");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const xlsxPath = args.includes("--xlsx") ? args[args.indexOf("--xlsx") + 1] : null;

const CONTENT_TYPE = { avif: "image/avif", webp: "image/webp" };

/** Columna A: la única que trae el producto. Las demás son adjuntos de ejemplo. */
const COLUMNA_FOTO = 0;
const COLUMNA_SKU = 2;
const COLUMNA_NOMBRE = 3;

/**
 * Filas que la planilla trae cruzadas entre sí.
 *
 * En «PRODUCTOS WEB.xlsx» las pastillas de lavanda y de vainilla tienen la foto
 * de la otra. Se corrige por SKU y no por número de fila para que la lista siga
 * queriendo decir lo mismo si alguien agrega una fila más arriba.
 */
const INTERCAMBIOS = [["501082", "501083"]];

const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const problemas = [];

/**
 * Las fotos incrustadas de una planilla, ya emparejadas con su fila.
 *
 * Dos cosas de Excel obligan a lo que hace esto, y las dos fueron un error
 * primero:
 *
 * 1. **No toda imagen es una foto de producto.** La hoja también trae adjuntos
 *    de ejemplo en las columnas de ficha técnica. Sólo la columna A —"IMAGEN
 *    REFERENCIA"— es el artículo; sin filtrar por columna sobran imágenes y la
 *    correspondencia con las filas se corre.
 *
 * 2. **Un ancla abarca un rango de filas, no una fila.** Cuando la foto es más
 *    alta que su celda, su rango pisa a la vecina. "Usar la primera fila" y
 *    "usar la última" fallan en direcciones distintas sobre esta misma hoja. Como
 *    hay tantas fotos en la columna A como productos, la respuesta correcta no
 *    es una heurística sino el emparejamiento que le da a cada fila exactamente
 *    una foto dentro de su rango.
 */
async function leerPlanilla(archivo) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(archivo);
  const hoja = libro.worksheets[0];
  if (!hoja) throw new Error("El libro no contiene hojas.");

  const filas = [];
  for (let numero = 2; numero <= hoja.rowCount; numero += 1) {
    const sku = hoja.getCell(numero, COLUMNA_SKU).text.trim();
    const nombre = hoja.getCell(numero, COLUMNA_NOMBRE).text.trim().replace(/\s+/g, " ");
    if (sku || nombre) filas.push({ numero, sku, nombre });
  }

  const fotos = hoja
    .getImages()
    .filter((puesta) => puesta.range.tl.nativeCol === COLUMNA_FOTO)
    .map((puesta) => ({
      desde: puesta.range.tl.nativeRow + 1,
      hasta: (puesta.range.br?.nativeRow ?? puesta.range.tl.nativeRow) + 1,
      imagen: libro.getImage(puesta.imageId),
    }));

  console.log(
    `planilla: ${String(filas.length)} filas de producto, ${String(fotos.length)} fotos en la columna A`,
  );

  // Emparejamiento por caminos aumentantes: si la fila que quiero ya está
  // tomada, le pido a su dueña actual que se corra a otra de las suyas. Con
  // rangos de una o dos filas converge de inmediato.
  const numerosDeFila = new Set(filas.map((fila) => fila.numero));
  const asignadas = new Map();

  function emparejar(foto, visitadas) {
    for (let numero = foto.desde; numero <= foto.hasta; numero += 1) {
      if (!numerosDeFila.has(numero) || visitadas.has(numero)) continue;
      visitadas.add(numero);
      const dueña = asignadas.get(numero);
      if (!dueña || emparejar(dueña, visitadas)) {
        asignadas.set(numero, foto);
        return true;
      }
    }
    return false;
  }

  // Los rangos más estrechos primero: fijan lo que no admite duda antes de que
  // lo ambiguo se quede con una fila que era de otro.
  for (const foto of [...fotos].sort((a, b) => a.hasta - a.desde - (b.hasta - b.desde))) {
    if (!emparejar(foto, new Set())) {
      problemas.push(`Sobra una foto anclada entre las filas ${String(foto.desde)} y ${String(foto.hasta)}.`);
    }
  }
  for (const fila of filas) {
    if (!asignadas.has(fila.numero)) {
      problemas.push(`Fila ${String(fila.numero)} (${fila.sku}): ninguna foto la alcanza.`);
    }
    fila.buffer = asignadas.get(fila.numero)?.imagen.buffer ?? null;
  }

  // Las que la planilla trae cambiadas entre sí. El nombre del producto manda
  // sobre la posición de la imagen.
  for (const [unSku, otroSku] of INTERCAMBIOS) {
    const uno = filas.find((fila) => fila.sku === unSku);
    const otro = filas.find((fila) => fila.sku === otroSku);
    if (!uno || !otro) continue;
    [uno.buffer, otro.buffer] = [otro.buffer, uno.buffer];
    console.log(`corregido: se intercambian las fotos de ${unSku} y ${otroSku} (venían cruzadas en la planilla)`);
  }

  return filas;
}

const desdePlanilla = xlsxPath ? await leerPlanilla(xlsxPath) : [];

const catalogo = await rawSql`select id, sku_code, name, image_url from products order by id`;

/*
 * A qué producto pertenece cada fila de la planilla.
 *
 * El SKU del proveedor no siempre es el `sku_code` guardado: cuando dos rubros
 * repiten un código, el catálogo desempata con un sufijo (`564778-LIM`). Por eso
 * se buscan candidatos por prefijo y decide el nombre, que es lo que de verdad
 * identifica al artículo.
 */
const porSku = new Map();
for (const producto of catalogo) {
  const base = producto.sku_code.replace(/-[A-Z]+$/, "");
  if (!porSku.has(base)) porSku.set(base, []);
  porSku.get(base).push(producto);
}

const origenes = new Map(); // id de producto -> { buffer, desde }

for (const fila of desdePlanilla) {
  const candidatos = porSku.get(fila.sku) ?? [];
  let producto = candidatos.find((c) => normalizar(c.name) === normalizar(fila.nombre));
  if (!producto && candidatos.length === 1) producto = candidatos[0];
  if (!producto) {
    problemas.push(
      candidatos.length === 0
        ? `Fila ${String(fila.numero)}: no hay ningún producto con SKU ${fila.sku}.`
        : `Fila ${String(fila.numero)}: ${String(candidatos.length)} productos comparten el SKU ${fila.sku} y ninguno coincide en nombre.`,
    );
    continue;
  }
  if (!fila.buffer) continue;
  origenes.set(producto.id, { buffer: fila.buffer, desde: "planilla" });
}

/*
 * Lo que quedó en disco de importaciones anteriores.
 *
 * La planilla manda cuando la tiene: sus PNG son el original, y los archivos de
 * `public/uploads/` ya son una codificación con pérdida. Pasar esos por el
 * pipeline sería una segunda generación encima de la primera.
 */
for (const producto of catalogo) {
  if (origenes.has(producto.id)) continue;
  if (!producto.image_url?.startsWith("/uploads/")) continue;
  const archivo = path.join(process.cwd(), "public", producto.image_url.replace(/^\//, ""));
  try {
    origenes.set(producto.id, { buffer: await readFile(archivo), desde: "disco" });
  } catch {
    problemas.push(`${producto.sku_code}: ${producto.image_url} no está en disco.`);
  }
}

if (problemas.length > 0) {
  console.error(`\nNo se migra nada:\n${problemas.map((p) => `  · ${p}`).join("\n")}`);
  process.exit(1);
}

const porId = new Map(catalogo.map((producto) => [producto.id, producto]));
const desdeDisco = [...origenes.values()].filter((o) => o.desde === "disco").length;
console.log(
  `\na migrar: ${String(origenes.size)} imágenes (${String(origenes.size - desdeDisco)} de la planilla, ${String(desdeDisco)} de public/uploads/)`,
);

if (!apply) {
  console.log("\nPlan solamente. Repetí con --apply para procesar y subir.");
  await rawSql.end();
  process.exit(0);
}

let subidos = 0;
let omitidos = 0;
let bytes = 0;
const cambios = [];

for (const [id, origen] of origenes) {
  const producto = porId.get(id);
  const procesada = await processImage(origen.buffer);

  for (const rendition of procesada.renditions) {
    // La clave es el hash del contenido, así que si ya está es idéntica.
    if (await objectExists(rendition.key)) {
      omitidos += 1;
      continue;
    }
    await uploadObject({
      key: rendition.key,
      body: rendition.data,
      contentType: CONTENT_TYPE[rendition.format],
    });
    subidos += 1;
    bytes += rendition.byteSize;
  }

  // `media` registra qué hay en el bucket; nada de lo que se dibuja depende de
  // ella. Sirve para responder "qué subimos y por qué el bucket pesa esto".
  await db
    .insert(media)
    .values({
      storageKey: procesada.prefix,
      originalWidth: procesada.originalWidth,
      originalHeight: procesada.originalHeight,
      byteSize: procesada.totalBytes,
      fileName: `${producto.sku_code}.png`,
      uploadedBy: null,
    })
    .onConflictDoNothing({ target: media.storageKey });

  // La de 1024 como `src`: es la que usa un navegador que ignore el `srcset`, y
  // la que se ve si alguien copia la URL a otro lado.
  const anchos = procesada.renditions
    .filter((rendition) => rendition.format === "avif")
    .map((rendition) => rendition.width);
  const elegido = anchos.find((ancho) => ancho >= 1024) ?? anchos[anchos.length - 1];
  const url = publicUrl(`${procesada.prefix}/${String(elegido)}.avif`);

  if (producto.image_url !== url) cambios.push({ id, url, sku: producto.sku_code });
  process.stdout.write(`\r  procesadas ${String(cambios.length)}/${String(origenes.size)}   `);
}

console.log(`\n\nobjetos subidos: ${String(subidos)}  ya presentes: ${String(omitidos)}  ${(bytes / 1048576).toFixed(1)} MB nuevos`);

for (const cambio of cambios) {
  await rawSql`update products set image_url = ${cambio.url}, updated_at = now() where id = ${cambio.id}`;
}
console.log(`actualizados ${String(cambios.length)} image_url`);

// Que lo que la base afirma se pueda pedir de verdad. Una fila que apunta a un
// objeto que no está es exactamente igual a que la migración hubiera fallado.
let rotas = 0;
const finales = await rawSql`select sku_code, image_url from products where image_url like 'http%'`;
for (const producto of finales) {
  const res = await fetch(producto.image_url, { method: "HEAD" });
  if (!res.ok) {
    rotas += 1;
    console.log(`  ${producto.sku_code} -> ${String(res.status)} ${producto.image_url}`);
  }
}
console.log(
  rotas === 0
    ? `verificado: las ${String(finales.length)} URL remotas responden.`
    : `${String(rotas)} URL sin objeto detrás.`,
);

/*
 * El catálogo se lee por `unstable_cache`, y este script escribe por fuera de
 * Next: no hay `revalidateTag` que llamar desde acá. Hasta que alguien guarde
 * algo en el panel —o se reinicie el servidor— la tienda sigue sirviendo las
 * rutas viejas, que es igual a que la importación hubiera fallado.
 */
console.log("\nFalta invalidar el caché: guardá cualquier producto en /admin/productos, o reiniciá el servidor.");

await rawSql.end();
