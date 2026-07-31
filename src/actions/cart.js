"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { placeOrder } from "../infra/db/mutations/order.js";
import { resolveCartLines } from "../infra/db/queries/cart.js";
import {
  addLine,
  clearCart,
  MAX_QUANTITY,
  readCart,
  removeLine,
  setLineQuantity,
  writeCart,
} from "../lib/cartSession.js";

/**
 * Cart mutations and the order request.
 *
 * Every one of these re-reads the cart from the cookie rather than accepting a
 * cart from the form. A cart in a hidden field is a cart an attacker can
 * rewrite; the cookie is `httpOnly` and cannot be touched from the page.
 *
 * The cart button lives in the layout, so each of these revalidates at
 * `layout` scope — otherwise the count in the navbar stays stale on every
 * other route until something else happens to re-render it.
 */

const productId = z.coerce.number().int().positive();
const quantity = z.coerce.number().int().min(0).max(MAX_QUANTITY);

export async function addToCartAction(_previous, formData) {
  const parsed = z
    .object({ productId, quantity: quantity.min(1).default(1) })
    .safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity") ?? 1,
    });

  if (!parsed.success) return { status: "error", message: "Producto inválido." };

  await writeCart(addLine(await readCart(), parsed.data.productId, parsed.data.quantity));

  revalidatePath("/", "layout");
  return { status: "ok" };
}

export async function setCartQuantityAction(_previous, formData) {
  const parsed = z
    .object({ productId, quantity })
    .safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
    });

  if (!parsed.success) return { status: "error", message: "Cantidad inválida." };

  await writeCart(setLineQuantity(await readCart(), parsed.data.productId, parsed.data.quantity));

  revalidatePath("/", "layout");
  return { status: "ok" };
}

export async function removeFromCartAction(_previous, formData) {
  const parsed = productId.safeParse(formData.get("productId"));
  if (!parsed.success) return { status: "error", message: "Producto inválido." };

  await writeCart(removeLine(await readCart(), parsed.data));

  revalidatePath("/", "layout");
  return { status: "ok" };
}

export async function clearCartAction() {
  await clearCart();
  revalidatePath("/", "layout");
}

/**
 * Turns the cart into a requested order.
 *
 * The cart is emptied on success and the customer is sent to their order page,
 * which carries the WhatsApp handoff. Emptying here rather than after the
 * message is sent is deliberate: the order exists in the database at this
 * point, so leaving the cart full would invite a second identical request from
 * anyone who pressed back.
 *
 * `redirect` throws by design, so it must sit outside the try/catch — a catch
 * around it would report a failure on an order that was actually placed.
 */
export async function requestOrderAction(_previous, formData) {
  const name = z
    .string()
    .trim()
    .max(120)
    .optional()
    .safeParse(formData.get("customerName") ?? undefined);

  const items = await readCart();
  if (items.length === 0) {
    return { status: "error", message: "Tu carrito está vacío." };
  }

  // Resolved once here so a cart holding only withdrawn products is reported
  // as such, rather than reaching the mutation and coming back as a bare
  // "no_available_items".
  const { lines } = await resolveCartLines(items);
  if (lines.length === 0) {
    return { status: "error", message: "Los productos de tu carrito ya no están disponibles." };
  }

  const result = await placeOrder({
    items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    customerName: name.success && name.data ? name.data : null,
  });

  if (!result.ok) {
    return { status: "error", message: "No pudimos registrar tu pedido. Inténtalo de nuevo." };
  }

  await clearCart();
  revalidatePath("/", "layout");

  redirect(`/pedido/${result.value.lookupToken}`);
}
