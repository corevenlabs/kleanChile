import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const { db } = await import("../src/infra/db/client.js");
const { contentBlocks, inventoryMovements, orders, products } = await import(
  "../src/infra/db/schema/index.js"
);
const { contentSchemas } = await import("../src/domain/content/schemas.js");
const { parseClp } = await import("../src/domain/shared/money.js");
const { allocateSkuCodes } = await import("../src/infra/db/mutations/skuCodes.js");

/**
 * Loads the storefront's original JSON into the database.
 *
 * The point is that seeding changes nothing a visitor sees: this is the same
 * content the site shipped with, moved somewhere it can be edited. Run it once
 * after the first migration.
 *
 *   npm run db:seed            # fills in what is missing
 *   npm run db:seed -- --reset # wipes content and catalog first
 *
 * Admin accounts are deliberately not seeded — see scripts/create-admin.js.
 */

const reset = process.argv.includes("--reset");
const dataDir = path.join(process.cwd(), "public", "data");

const readJson = async (name) =>
  JSON.parse(await readFile(path.join(dataDir, name), "utf8"));

const [banner, home, site, navigation, catalogs, details] = await Promise.all([
  readJson("banner.json"),
  readJson("home.json"),
  readJson("site.json"),
  readJson("navigation.json"),
  readJson("catalogs.json"),
  readJson("product-details.json"),
]);

// ── Content blocks ───────────────────────────────────────────────────────────

const blocks = {
  hero: banner,
  bestSellers: {
    title: home.bestSellers.title,
    linkLabel: home.bestSellers.linkLabel,
    linkPath: home.bestSellers.linkPath,
    /*
     * The block no longer carries a product list. Its eight tiles became real
     * catalog rows below, and which ones appear on the home page is now decided
     * by what has sold — see `getBestSellers`.
     */
    limit: home.bestSellers.products.length,
  },
  dualBanner: home.dualBanner,
  whyUs: home.whyUs,
  testimonials: home.testimonials,
  brands: home.brands,
  navigation,
  footer: site.footer,
  whatsapp: { ...site.whatsapp, phoneNumber: seedPhoneNumber(site.whatsapp.phoneNumber) },
};

/**
 * The JSON shipped "569XXXXXXXX" — a placeholder, not a number.
 *
 * It produced a `wa.me/569XXXXXXXX` link that went nowhere, and the schema now
 * rejects it outright. Seeding it as empty rather than as stripped digits
 * ("569") is the honest version: there is no number until someone sets one, and
 * the admin has a field for it.
 */
function seedPhoneNumber(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length >= 8) return digits;

  console.warn(
    `\n  ⚠  WhatsApp: "${raw}" is a placeholder, seeded as empty.\n     Set a real number in /admin/configuracion.\n`,
  );
  return "";
}

// ── Catalog ──────────────────────────────────────────────────────────────────

/*
 * `product-details.json` held two records with full copy and a spec sheet.
 * Their ids and prices line up with the first two cleaning products, so they
 * are the same items described twice — the catalog entry was the summary. They
 * are merged rather than kept apart, which is also what fixes the old
 * behaviour where every product except those two led to "Producto no
 * encontrado": there is now one row per product, and all of them have a page.
 */
const detailsById = new Map(details.map((detail) => [detail.id, detail]));

const catalogRows = Object.entries(catalogs).flatMap(([category, items]) =>
  items.map((item, index) => {
    const detail = category === "cleaning" ? detailsById.get(item.id) : undefined;

    return {
      category,
      name: detail?.name ?? item.name,
      type: item.type,
      priceClp: detail?.price ?? item.price,
      imageUrl: detail?.image ?? item.image,
      description: detail?.description ?? item.description ?? "",
      specs: detail?.especificaciones ?? {},
      position: index,
    };
  }),
);

/*
 * The eight tiles that used to live inside the `bestSellers` block.
 *
 * They were always real products — Fabuloso, Ajax, Axion, Suavitel — described
 * a second time inside a content block, with their prices as display strings.
 * Now that the home page ranks by what sells, they have to be catalog rows like
 * anything else: a tile with no product behind it cannot be previewed, added to
 * a cart, or counted as sold.
 *
 * Their `type` in the block was a pack format — "Limpiador Multiusos · 900ml".
 * That cannot transfer, because `type` is the catalogue's filter dimension:
 * copying it across would put one chip per pack size in the filter bar, which
 * is nine near-unique buttons that filter to one product each. These are all
 * cleaning chemicals, so they take that type, and the format stays in the
 * description where a buyer actually reads it.
 */
const featuredRows = home.bestSellers.products.map((product, index) => ({
  category: "cleaning",
  name: product.name,
  type: "químico",
  priceClp: parseClp(product.price) ?? 0,
  imageUrl: product.image,
  description: `${product.name} — ${product.type}.`,
  specs: {},
  position: catalogs.cleaning.length + index,
}));

/*
 * Opening stock, spread rather than uniform.
 *
 * A demo where everything has the same 25 units never exercises the low-stock
 * note or the shortfall path on confirmation, which are exactly the parts worth
 * seeing before launch. Deterministic so reseeding gives the same shop.
 */
const openingStock = (index) => 3 + ((index * 7) % 45);

const productRows = [...catalogRows, ...featuredRows];

// ── Write ────────────────────────────────────────────────────────────────────

if (reset) {
  // Orders first: `order_items.product_id` is ON DELETE SET NULL, so dropping
  // products underneath them would leave a pile of orders whose lines point at
  // nothing — worse than no orders at all in a database being reset.
  await db.delete(orders);
  await db.delete(products);
  await db.delete(contentBlocks);
  console.log("Wiped content_blocks, products and orders.");
}

for (const [key, value] of Object.entries(blocks)) {
  // Parsed on the way in, so a malformed seed fails here rather than becoming a
  // row the storefront quietly renders as defaults.
  const parsed = contentSchemas[key].parse(value);

  await db
    .insert(contentBlocks)
    .values({ key, value: parsed })
    .onConflictDoUpdate({
      target: contentBlocks.key,
      set: { value: parsed, updatedAt: new Date() },
    });
}
console.log(`Seeded ${String(Object.keys(blocks).length)} content blocks.`);

const existing = await db.select({ id: products.id }).from(products).limit(1);
if (existing.length > 0) {
  console.log("Products already present — left untouched. Use --reset to replace them.");
} else {
  const codes = await allocateSkuCodes(productRows.length);

  const inserted = await db
    .insert(products)
    .values(
      productRows.map((row, index) => ({
        ...row,
        skuCode: codes[index],
        stockOnHand: openingStock(index),
      })),
    )
    .returning({ id: products.id, stockOnHand: products.stockOnHand });

  /*
   * The opening balance gets a ledger row too.
   *
   * The invariant the whole inventory design rests on is that a product's
   * movements sum to its `stock_on_hand`. Seeding the balance without a
   * movement would break that on row one, and the first person to ask why a
   * count disagrees would find a history that starts from nowhere.
   */
  await db.insert(inventoryMovements).values(
    inserted.map((row) => ({
      productId: row.id,
      delta: row.stockOnHand,
      balanceAfter: row.stockOnHand,
      reason: "restock",
      note: "Stock inicial (seed)",
    })),
  );

  console.log(
    `Seeded ${String(productRows.length)} products (${String(catalogRows.length)} del catálogo + ${String(featuredRows.length)} destacados) con SKU y stock inicial.`,
  );
}

process.exit(0);
