import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const { contentSchemas } = await import("../src/domain/content/schemas.js");
const { formatSkuCode, parseSkuCode } = await import("../src/domain/catalog/skuCode.js");

/**
 * Copia el contenido de una base a otra.
 *
 * Existe para arrancar producción: dejar la portada de Neon idéntica a la que se
 * armó en local, con algunos productos para que la tienda no se vea vacía.
 *
 *   SOURCE_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kleanchile" \
 *   TARGET_DATABASE_URL="<neon>" \
 *   node --conditions=react-server scripts/copy-content.js --products 3
 *
 * `TARGET_DATABASE_URL` cae a `DATABASE_URL` si no se define, que es lo cómodo
 * cuando `.env.local` ya apunta a producción.
 *
 * ── Por qué esto y no `db:seed` contra Neon ──────────────────────────────────
 *
 * El seed lee `public/data/*.json`, que es el sitio **original**. Todo lo que se
 * arregló después vive en migraciones de datos (`0003`–`0005`) o se editó desde
 * el panel, y nada de eso está en el JSON. Sembrar producción reescribiría los
 * bloques con la versión vieja y desharía justamente esas correcciones. Copiar
 * las filas reales es lo único que reproduce lo que hay.
 *
 * ── Lo que no copia, y por qué ───────────────────────────────────────────────
 *
 * Ni pedidos, ni usuarios, ni sesiones, ni la tabla `media`. Un pedido de prueba
 * en producción es basura con la que después hay que lidiar; las cuentas se
 * crean con `admin:create`, que es la única puerta por diseño; y `media` describe
 * un bucket que no es el mismo.
 */

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const SOURCE = process.env.SOURCE_DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL;

if (!SOURCE || !TARGET) {
  console.error("Faltan SOURCE_DATABASE_URL y/o TARGET_DATABASE_URL.");
  process.exit(1);
}

if (SOURCE === TARGET) {
  console.error("El origen y el destino son la misma base.");
  process.exit(1);
}

const howMany = Number.parseInt(flag("products", "1"), 10);
const onlySkus = flag("skus", "")
  .split(",")
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);
const dryRun = args.includes("--dry-run");

const host = (url) => new URL(url).host;
console.log(`  origen:  ${host(SOURCE)}`);
console.log(`  destino: ${host(TARGET)}${dryRun ? "   (SIMULACIÓN)" : ""}\n`);

const source = postgres(SOURCE, { max: 1 });
const target = postgres(TARGET, { max: 1 });

/** El destino tiene que estar migrado; si no, el error sale desde adentro del driver. */
const [{ exists }] = await target`
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'content_blocks'
  ) as exists
`;
if (!exists) {
  console.error("El destino no está migrado. Corre primero:  DATABASE_URL=\"<destino>\" npm run db:migrate");
  process.exit(1);
}

// ── Bloques de contenido ─────────────────────────────────────────────────────

const blocks = await source`select key, value from content_blocks order by key`;

for (const block of blocks) {
  /*
   * Se parsea al pasar, no se copia el JSON crudo.
   *
   * Si el origen quedó con una forma que el schema de hoy ya no acepta, el sitio
   * de producción la renderizaría con los defaults y nadie se enteraría. Acá
   * falla, con el nombre del bloque.
   */
  const schema = contentSchemas[block.key];
  if (!schema) {
    console.log(`  ~ ${block.key.padEnd(14)} bloque desconocido, omitido`);
    continue;
  }

  const parsed = schema.parse(block.value);

  if (!dryRun) {
    await target`
      insert into content_blocks ${target({ key: block.key, value: parsed })}
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `;
  }
  console.log(`  ✓ ${block.key}`);
}
console.log(`\n  ${String(blocks.length)} bloques de contenido.\n`);

// ── Productos ────────────────────────────────────────────────────────────────

const candidates = onlySkus.length
  ? await source`select * from products where sku_code = any(${onlySkus}) order by id`
  : await source`
      select * from products
      where is_active and image_url <> '' and image_url not like '/uploads/%'
      order by category, position, id
      limit ${howMany}
    `;

if (candidates.length === 0) {
  console.log("  Ningún producto para copiar.");
} else {
  const existing = await target`select sku_code from products where sku_code is not null`;
  const already = new Set(existing.map((row) => row.sku_code));

  for (const product of candidates) {
    if (already.has(product.sku_code)) {
      console.log(`  ~ ${product.sku_code}  ya existe en el destino, omitido`);
      continue;
    }

    /*
     * Una imagen en `/uploads/` es un archivo del disco de esta máquina. En un
     * host serverless ese disco no existe, así que el producto llegaría con una
     * imagen rota. Se avisa en vez de copiarla en silencio.
     */
    if (product.image_url.startsWith("/uploads/")) {
      console.log(`  ! ${product.sku_code}  imagen en disco local; súbela de nuevo desde el panel`);
    }

    if (!dryRun) {
      await target.begin(async (tx) => {
        const [row] = await tx`
          insert into products ${tx({
            category: product.category,
            sku_code: product.sku_code,
            name: product.name,
            type: product.type,
            price_clp: product.price_clp,
            image_url: product.image_url,
            description: product.description,
            specs: product.specs,
            spec_sheet_url: product.spec_sheet_url,
            stock_on_hand: product.stock_on_hand,
            is_active: product.is_active,
            position: product.position,
          })}
          returning id
        `;

        /*
         * El saldo inicial lleva su asiento.
         *
         * La única invariante del inventario es que los movimientos de un
         * producto sumen su `stock_on_hand`. Copiar el saldo sin el movimiento
         * la rompería en la primera fila, y la primera persona que pregunte por
         * qué un conteo no cuadra encontraría un historial que empieza de la
         * nada.
         */
        if (product.stock_on_hand > 0) {
          await tx`
            insert into inventory_movements ${tx({
              product_id: row.id,
              delta: product.stock_on_hand,
              balance_after: product.stock_on_hand,
              reason: "restock",
              note: "Saldo inicial (copia desde local)",
            })}
          `;
        }
      });
    }

    console.log(`  ✓ ${product.sku_code}  ${product.name.slice(0, 50)}`);
  }

  /*
   * La secuencia se adelanta más allá del código más alto que se copió.
   *
   * Los códigos vienen del origen, pero `sku_code_seq` en el destino sigue en 1.
   * Sin esto, el primer producto que alguien cree en producción recibiría un
   * código ya usado y moriría contra `products_sku_code_idx` — un fallo que
   * aparece semanas después, cuando nadie recuerda esta copia.
   */
  const highest = Math.max(
    0,
    ...candidates.map((product) => parseSkuCode(product.sku_code) ?? 0),
  );

  if (highest > 0 && !dryRun) {
    await target`select setval('sku_code_seq', ${highest}, true)`;
    console.log(`\n  sku_code_seq → ${String(highest)} (el próximo será ${formatSkuCode(highest + 1)})`);
  }
}

await source.end();
await target.end();

console.log("\n  Listo. Si el sitio ya estaba desplegado, vuelve a desplegar:");
console.log("  las lecturas están cacheadas por etiqueta y escribir por SQL no las invalida.\n");
process.exit(0);
