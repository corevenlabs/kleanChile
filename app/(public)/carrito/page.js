import Cart from "../../../src/View/Cart/Cart";
import { resolveCartLines } from "../../../src/infra/db/queries/cart.js";
import { readCart } from "../../../src/lib/cartSession.js";

// Per-visitor, so it has nothing to offer an index.
export const metadata = { title: "Carrito", robots: { index: false, follow: false } };

export default async function Page() {
  // Names and prices come from the database, never from the cookie — it only
  // carries ids and quantities.
  const { lines, dropped } = await resolveCartLines(await readCart());

  return <Cart lines={lines} dropped={dropped} />;
}
