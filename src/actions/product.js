"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import {
  isAcceptableTypedSku,
  isReservedSkuShape,
  normalizeTypedSku,
} from "../domain/catalog/skuCode.js";
import { parseClp } from "../domain/shared/money.js";
import {
  createProduct,
  deleteProduct,
  setProductActive,
  updateProduct,
} from "../infra/db/mutations/product.js";
import { setStockLevel } from "../infra/db/mutations/inventory.js";
import { allocateSkuCode } from "../infra/db/mutations/skuCodes.js";
import { CATALOG_TAG } from "../infra/db/queries/catalog.js";
import { requireUser } from "../lib/adminSession.js";

/** Catalog mutations. Each one guards itself — see `lib/adminSession.js`. */

const productInput = z.object({
  id: z.number().int().positive().nullish(),
  /**
   * Only read when creating. Blank mints a KC code from the sequence; a
   * supplier's code is kept as typed, except in the system's own shape — see
   * `isReservedSkuShape`.
   */
  sku: z
    .string()
    .default("")
    .transform(normalizeTypedSku)
    .refine(isAcceptableTypedSku, "El SKU tiene caracteres no válidos o es demasiado largo.")
    .refine(
      (code) => !isReservedSkuShape(code),
      "Los códigos KC los asigna el sistema. Deja el SKU vacío para generar uno, o usa el código del proveedor.",
    ),
  category: z.enum(["cleaning", "bookshop", "desktop"]),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  type: z.string().trim().min(1, "El tipo es obligatorio"),
  /**
   * Accepts what a Chilean keyboard produces. "12.000" is twelve thousand
   * pesos here, not twelve — `parseClp` is what knows that.
   */
  price: z
    .union([z.string(), z.number()])
    .transform((value) => parseClp(value))
    .refine((value) => value !== null && value >= 0, "Precio inválido"),
  image: z.string().trim().default(""),
  /**
   * Fotos adicionales, en orden. Las vacías se descartan: un campo agregado y
   * nunca llenado no es una foto, y sin el filtro la galería dibujaría una
   * miniatura en blanco.
   */
  gallery: z
    .array(z.string().trim())
    .default([])
    .transform((urls) => urls.filter(Boolean))
    .refine((urls) => urls.length <= 12, "Máximo 12 imágenes adicionales por producto."),
  description: z.string().trim().default(""),
  specs: z.record(z.string(), z.string()).default({}),
  /**
   * La ficha técnica en PDF. Una URL, como la imagen — puede ser un archivo
   * subido acá o un enlace al documento del fabricante.
   */
  specSheet: z.string().trim().default(""),
  isActive: z.boolean().default(true),
  position: z.number().int().default(0),
  /** Opening stock, only meaningful when creating. */
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

export async function saveProductAction(input) {
  const user = await requireUser();

  const parsed = productInput.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { status: "error", message: first?.message ?? "Datos inválidos." };
  }

  // `sku` is pulled out here so it can never reach an UPDATE: see below.
  const { id, sku, price, image, gallery, specSheet, stock, ...rest } = parsed.data;
  const row = {
    ...rest,
    priceClp: price,
    imageUrl: image,
    galleryUrls: gallery,
    specSheetUrl: specSheet,
  };

  if (id) {
    // Stock is deliberately not part of an edit. It moves only through the
    // ledger — the table's stock button and order confirmation — so that a
    // typo in this form can never silently rewrite a counted balance.
    //
    // Neither is the SKU, for a related reason: past orders and WhatsApp
    // messages quote it, so changing it would orphan every one of them. The
    // editor shows it read-only; this is what actually enforces that.
    await updateProduct(id, row);
  } else {
    // A blank code is minted here rather than defaulted in the column, because
    // only the sequence can guarantee two simultaneous creations get different
    // ones. A typed code can still collide with an existing product — the
    // unique index is the check, so there is no window between asking and
    // inserting.
    let newId;
    try {
      newId = await createProduct({ ...row, skuCode: sku || (await allocateSkuCode()) });
    } catch (error) {
      if (isSkuConflict(error)) {
        return { status: "error", message: `El SKU ${sku} ya lo usa otro producto.` };
      }
      throw error;
    }

    if (stock > 0) {
      await setStockLevel({
        productId: newId,
        newLevel: stock,
        note: `Stock inicial por ${user.name}`,
        actorId: user.id,
      });
    }
  }

  revalidateTag(CATALOG_TAG);
  return { status: "ok" };
}

export async function setProductActiveAction(id, isActive) {
  await requireUser();

  const parsed = z.number().int().positive().safeParse(id);
  if (!parsed.success) return { status: "error", message: "Producto inválido." };

  await setProductActive(parsed.data, Boolean(isActive));
  revalidateTag(CATALOG_TAG);
  return { status: "ok" };
}

export async function deleteProductAction(id) {
  await requireUser();

  const parsed = z.number().int().positive().safeParse(id);
  if (!parsed.success) return { status: "error", message: "Producto inválido." };

  await deleteProduct(parsed.data);
  revalidateTag(CATALOG_TAG);
  return { status: "ok" };
}

/**
 * Whether an insert failed on `products_sku_code_idx`.
 *
 * Drizzle wraps the driver's error, so the Postgres fields may be on the error
 * itself or on its `cause`.
 */
function isSkuConflict(error) {
  const pg = error?.cause ?? error;
  return pg?.code === "23505" && String(pg?.constraint_name ?? pg?.constraint ?? "").includes("sku_code");
}
