import "server-only";

import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "../client.js";
import { contentBlocks, products } from "../schema/index.js";

/** Figures for the admin dashboard. Uncached — it is a view of right now. */
export async function getAdminStats() {
  const [totals] = await db
    .select({
      total: count(),
      active: sql`count(*) filter (where ${products.isActive})::int`,
    })
    .from(products);

  const byCategory = await db
    .select({ category: products.category, total: count() })
    .from(products)
    .where(eq(products.isActive, true))
    .groupBy(products.category);

  const [lastEdit] = await db
    .select({ key: contentBlocks.key, updatedAt: contentBlocks.updatedAt })
    .from(contentBlocks)
    .orderBy(desc(contentBlocks.updatedAt))
    .limit(1);

  return {
    products: totals?.total ?? 0,
    activeProducts: totals?.active ?? 0,
    byCategory: Object.fromEntries(byCategory.map((row) => [row.category, row.total])),
    lastEdit: lastEdit ?? null,
  };
}
