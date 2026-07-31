import "server-only";

import { sql } from "drizzle-orm";
import { formatSkuCode } from "../../../domain/catalog/skuCode.js";
import { db } from "../client.js";

/**
 * Allocates SKU codes.
 *
 * The only place a code may be minted. Reading `max(sku_code)` and adding one
 * looks equivalent and is not: two products created in the same instant read
 * the same maximum, build the same code, and the second insert dies on
 * `products_sku_code_idx`. `nextval` hands each caller a distinct number
 * without either waiting on the other.
 *
 * Values are consumed even when the surrounding transaction rolls back — that
 * is what makes a sequence non-blocking. Gaps in the codes are therefore normal
 * and mean nothing.
 */
export async function allocateSkuCode(tx = db) {
  const [row] = await tx.execute(sql`select nextval('sku_code_seq') as value`);
  return formatSkuCode(Number(row.value));
}

/** Allocates several at once, for seeding and backfills. */
export async function allocateSkuCodes(count, tx = db) {
  if (count < 1) return [];

  const rows = await tx.execute(
    sql`select nextval('sku_code_seq') as value from generate_series(1, ${count})`,
  );

  return rows.map((row) => formatSkuCode(Number(row.value)));
}
