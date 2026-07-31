import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const { parseSpreadsheet } = await import("../src/infra/import/parseSpreadsheet.js");
const { detectMapping, applyMapping, mappedFields, validateMapping } = await import(
  "../src/domain/import/columnMapping.js"
);
const { buildPlan } = await import("../src/domain/import/plan.js");
const { snapshotBySku } = await import("../src/infra/db/queries/imports.js");
const { applyImportPlan } = await import("../src/infra/db/mutations/catalogImport.js");
const { db } = await import("../src/infra/db/client.js");
const { products, inventoryMovements } = await import("../src/infra/db/schema/index.js");
const { sql } = await import("drizzle-orm");

/**
 * Prueba el importador de punta a punta contra la base real.
 *
 *   node --conditions=react-server scripts/verify-import.js <archivo> [--apply]
 *
 * Sin `--apply` solo simula, que es exactamente lo que hace la pantalla antes
 * de que la persona confirme. Con `--apply` escribe y después comprueba la
 * invariante del inventario: los movimientos de cada producto tienen que sumar
 * su saldo.
 */

const file = process.argv[2];
if (!file) {
  console.error("Uso: node --conditions=react-server scripts/verify-import.js <archivo> [--apply]");
  process.exit(1);
}
const shouldApply = process.argv.includes("--apply");

const buffer = await readFile(file);
const parsed = await parseSpreadsheet(path.basename(file), buffer);
if (!parsed.ok) {
  console.error("No se pudo leer:", parsed.error);
  process.exit(1);
}

const { headers, rows } = parsed.value;
console.log(`\nArchivo: ${path.basename(file)} — ${String(rows.length)} filas\n`);

const mapping = detectMapping(headers);
console.log("Mapeo detectado:");
for (const header of headers) {
  console.log(`   ${header.padEnd(24)} -> ${mapping[header] ?? "(ignorada)"}`);
}

const checked = validateMapping(mapping);
if (!checked.ok) {
  console.error("\nMapeo inválido:", checked.error);
  process.exit(1);
}

const { bySku, byName } = await snapshotBySku();
const plan = buildPlan({
  rows: rows.map((row, index) => ({ rowNumber: index + 2, values: applyMapping(mapping, row) })),
  present: mappedFields(mapping),
  bySku,
  byName,
});

console.log("\nResumen:", plan.counts, "\n");
for (const row of plan.rows) {
  const detail =
    row.status === "error"
      ? row.message
      : Object.entries(row.changes)
          .map(([field, change]) => `${field}: ${String(change.from)} -> ${String(change.to)}`)
          .join(", ") || "sin cambios";
  const note = row.status !== "error" && row.message ? `  ⚠ ${row.message}` : "";
  console.log(`  fila ${String(row.rowNumber)}  ${row.status.padEnd(8)} ${(row.skuCode ?? "").padEnd(10)} ${detail}${note}`);
}

if (!shouldApply) {
  console.log("\n(simulación: no se escribió nada)\n");
  process.exit(0);
}

const before = await db.select({ n: sql`count(*)::int` }).from(products);
const applied = await applyImportPlan({
  plan,
  fileName: path.basename(file),
  mapping,
  actorId: null,
});
const after = await db.select({ n: sql`count(*)::int` }).from(products);

console.log(`\nAplicado. Productos: ${String(before[0].n)} -> ${String(after[0].n)}`);
console.log("Lote:", applied.batchId);

const [drift] = await db.execute(sql`
  select count(*)::int as n
  from ${products} p
  left join (select product_id, sum(delta) s from ${inventoryMovements} group by product_id) m
    on m.product_id = p.id
  where coalesce(m.s, 0) <> p.stock_on_hand
`);
console.log(
  Number(drift.n) === 0
    ? "Invariante de inventario: OK (movimientos = saldo en todos los productos)"
    : `INVARIANTE ROTA en ${String(drift.n)} productos`,
);

process.exit(0);
