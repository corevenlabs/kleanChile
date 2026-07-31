"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { cancelOrder, confirmOrder } from "../infra/db/mutations/order.js";
import { setStockLevel } from "../infra/db/mutations/inventory.js";
import { CATALOG_TAG, SALES_TAG } from "../infra/db/queries/catalog.js";
import { requireUser } from "../lib/adminSession.js";

/** Admin actions on orders and stock. Each guards itself. */

const uuid = z.string().uuid();

/**
 * Confirms an order, which is what moves stock.
 *
 * A shortfall comes back naming the products and the counts, because "no hay
 * stock" alone leaves whoever is on the phone with the customer unable to say
 * what to drop.
 */
export async function confirmOrderAction(orderId) {
  const user = await requireUser();

  const parsed = uuid.safeParse(orderId);
  if (!parsed.success) return { status: "error", message: "Pedido inválido." };

  const result = await confirmOrder({ orderId: parsed.data, actorId: user.id });

  if (!result.ok) {
    if (result.error.kind === "insufficient_stock") {
      const detail = result.error.shortfalls
        .map((s) => `${s.name} (pedidas ${String(s.requested)}, hay ${String(s.available)})`)
        .join("; ");
      return { status: "error", message: `Stock insuficiente: ${detail}` };
    }
    if (result.error.kind === "already_confirmed") {
      return { status: "error", message: "Este pedido ya estaba confirmado." };
    }
    if (result.error.kind === "cancelled") {
      return { status: "error", message: "Este pedido está anulado." };
    }
    return { status: "error", message: "No se encontró el pedido." };
  }

  // Stock changed, so both the catalog and the sales ranking are stale.
  revalidateTag(CATALOG_TAG);
  revalidateTag(SALES_TAG);
  revalidatePath("/admin/pedidos");

  return { status: "ok", message: `Pedido ${result.value.number} confirmado.` };
}

export async function cancelOrderAction(orderId, note) {
  const user = await requireUser();

  const parsed = uuid.safeParse(orderId);
  if (!parsed.success) return { status: "error", message: "Pedido inválido." };

  const result = await cancelOrder({
    orderId: parsed.data,
    actorId: user.id,
    note: typeof note === "string" && note.trim() !== "" ? note.trim() : null,
  });

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.error.kind === "already_cancelled"
          ? "Este pedido ya estaba anulado."
          : "No se encontró el pedido.",
    };
  }

  revalidateTag(CATALOG_TAG);
  revalidateTag(SALES_TAG);
  revalidatePath("/admin/pedidos");

  return { status: "ok", message: `Pedido ${result.value.number} anulado.` };
}

/**
 * A counted stock level from the admin.
 *
 * Takes the number on the shelf rather than a delta, because that is what the
 * person is holding. The ledger still records the movement that got there.
 */
export async function setStockAction(productId, newLevel) {
  const user = await requireUser();

  const parsed = z
    .object({
      productId: z.number().int().positive(),
      newLevel: z.coerce.number().int().min(0).max(1_000_000),
    })
    .safeParse({ productId, newLevel });

  if (!parsed.success) return { status: "error", message: "Cantidad inválida." };

  const result = await setStockLevel({
    productId: parsed.data.productId,
    newLevel: parsed.data.newLevel,
    note: `Ajuste manual por ${user.name}`,
    actorId: user.id,
  });

  if (!result.ok) return { status: "error", message: "No se encontró el producto." };

  revalidateTag(CATALOG_TAG);
  return { status: "ok", message: `Stock actualizado a ${String(parsed.data.newLevel)}.` };
}
