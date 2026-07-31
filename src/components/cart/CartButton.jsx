import Link from "next/link";
import { countItems, readCart } from "../../lib/cartSession.js";

/**
 * The cart button in the navbar.
 *
 * Reading the cart cookie here is what makes every public route render on
 * demand rather than prerender. That is the deliberate cost of a live count in
 * the header: the alternative — fetching the number from the browser after
 * hydration — keeps the pages static but shows an empty badge on first paint
 * and needs its own refresh path after every add.
 *
 * The page data itself is still cached by tag, so a dynamic render is a render,
 * not a round trip to Postgres.
 */
export default async function CartButton() {
  const count = countItems(await readCart());

  return (
    <Link href="/carrito" className="cart-button" aria-label={`Carrito, ${String(count)} productos`}>
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M3 5h2l2.4 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21.5 9H6" />
        <circle cx="10" cy="21" r="1.2" />
        <circle cx="18" cy="21" r="1.2" />
      </svg>
      <span className="cart-button__label">Carrito</span>
      {count > 0 && <span className="cart-button__count">{count}</span>}
    </Link>
  );
}
