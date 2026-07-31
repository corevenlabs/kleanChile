import "server-only";

import { cookies } from "next/headers";

/**
 * The cart, kept in a cookie.
 *
 * It holds product ids and quantities and nothing else — no names, no prices.
 * Those are read from the database wherever the cart is rendered or an order is
 * placed, so the browser never gets to state what something costs. A cart of
 * ids is also tiny, which matters when the whole thing has to fit in a 4 KB
 * cookie.
 *
 * There is no `carts` table because there is nothing for one to do here: no
 * stock is reserved, no order exists until the customer asks for one, and the
 * cookie is exactly as device-bound as a cart token would be. If abandoned
 * carts ever need to be visible in the admin, that is the moment to add one.
 *
 * `httpOnly` keeps it away from any script on the page. `sameSite: lax` rather
 * than `strict` so the cart survives the return trip from WhatsApp, which is
 * the one navigation this whole flow depends on.
 */

const COOKIE = "klean_cart";
const MAX_AGE_DAYS = 30;
const MAX_LINES = 50;
const MAX_QUANTITY = 99;

/** Stored compactly — `p` and `q` — because the budget is 4 KB. */
function serialize(items) {
  return JSON.stringify(items.map((item) => ({ p: item.productId, q: item.quantity })));
}

/**
 * Parses whatever is in the cookie into something safe to use.
 *
 * Treats any malformed value as an empty cart rather than throwing. The cookie
 * is old data from a browser we do not control; the failure mode for a cart
 * that cannot be read is an empty cart, never a 500 on the home page.
 */
function parse(raw) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => ({
        productId: Number(entry?.p),
        quantity: Math.trunc(Number(entry?.q)),
      }))
      .filter(
        (entry) =>
          Number.isInteger(entry.productId) &&
          entry.productId > 0 &&
          Number.isInteger(entry.quantity) &&
          entry.quantity > 0,
      )
      .slice(0, MAX_LINES)
      .map((entry) => ({ ...entry, quantity: Math.min(entry.quantity, MAX_QUANTITY) }));
  } catch {
    return [];
  }
}

/** The cart's contents. Safe in a read path — writes nothing. */
export async function readCart() {
  const store = await cookies();
  return parse(store.get(COOKIE)?.value);
}

/**
 * Replaces the cart.
 *
 * Only callable from a Server Action or Route Handler: Next forbids writing a
 * cookie while rendering, and rightly so — a page that mints state as a side
 * effect of being rendered would do it for every crawler that visits.
 */
export async function writeCart(items) {
  const store = await cookies();

  if (items.length === 0) {
    store.delete(COOKIE);
    return;
  }

  store.set(COOKIE, serialize(items.slice(0, MAX_LINES)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export async function clearCart() {
  await writeCart([]);
}

/** Adds to an existing line rather than creating a duplicate of it. */
export function addLine(items, productId, quantity) {
  const existing = items.find((item) => item.productId === productId);

  if (existing) {
    return items.map((item) =>
      item.productId === productId
        ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_QUANTITY) }
        : item,
    );
  }

  return [...items, { productId, quantity: Math.min(quantity, MAX_QUANTITY) }];
}

/** Setting a quantity of zero removes the line — that is what a stepper at 0 means. */
export function setLineQuantity(items, productId, quantity) {
  if (quantity <= 0) return items.filter((item) => item.productId !== productId);

  return items.map((item) =>
    item.productId === productId
      ? { ...item, quantity: Math.min(quantity, MAX_QUANTITY) }
      : item,
  );
}

export const removeLine = (items, productId) =>
  items.filter((item) => item.productId !== productId);

export const countItems = (items) =>
  items.reduce((total, item) => total + item.quantity, 0);

export { MAX_QUANTITY };
