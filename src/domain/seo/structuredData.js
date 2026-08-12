/**
 * Schema.org payloads, built as plain objects.
 *
 * This is what turns a search result from a blue link into a row with a price,
 * a stock state and a SKU — the difference that decides whether a buyer
 * comparing three suppliers clicks this one. Google reads it; so do WhatsApp,
 * Bing and every price aggregator.
 *
 * Pure, and given everything it needs as arguments, for the same reason the
 * import planner is: what a page claims to search engines is worth being able
 * to check without booting a browser.
 *
 * The rule throughout is that nothing is asserted that the site does not know.
 * Structured data that disagrees with the page is a manual penalty, not a
 * ranking boost, so an absent field is left absent rather than guessed.
 */

import { isPriceOnRequest } from "../shared/pricing.js";

const CURRENCY = "CLP";

/**
 * The shop itself.
 *
 * `Organization` rather than `LocalBusiness`: this is an institutional supplier
 * whose customers order by WhatsApp, and `LocalBusiness` invites opening hours
 * and a service area that nobody here has stated.
 */
export function organizationLd({ url, name, description, logo, contact }) {
  const telephone = contact?.find((line) => /^[+()\d\s.-]{7,}$/.test(line));
  const email = contact?.find((line) => line.includes("@") && !line.includes(" "));

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}#organization`,
    name,
    url,
    description,
    logo,
    image: logo,
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
  };
}

/**
 * One product.
 *
 * `availability` comes from the ledger balance, so it tells the truth by
 * construction. Claiming `InStock` for something that is out is the fastest way
 * to lose rich results altogether, and this site already knows the answer.
 *
 * `priceValidUntil` is deliberately omitted: prices here change when someone
 * edits them, and inventing a date would be inventing a commitment.
 *
 * Un producto a cotizar no lleva `offers` **en absoluto**. La tentación es
 * emitir `price: "0"` porque es lo que dice la columna, y el resultado sería
 * que Google publique el producto como gratis: un resultado enriquecido que
 * miente, que es exactamente lo que esta capa existe para no hacer. Schema.org
 * no tiene forma de decir "precio a consultar" — un `Product` sin oferta es
 * válido, pierde la fila de precio en el buscador, y eso es lo correcto: la
 * página tampoco publica uno.
 */
export function productLd({ product, url, image, brand }) {
  const offers = isPriceOnRequest(product.price)
    ? {}
    : {
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: CURRENCY,
          // Whole pesos: CLP has no minor unit, so no decimal point belongs here.
          price: String(product.price),
          availability: product.inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        },
      };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    ...(product.description ? { description: product.description } : {}),
    ...(image ? { image: [image] } : {}),
    ...(product.skuCode ? { sku: product.skuCode } : {}),
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    ...(product.type ? { category: product.type } : {}),
    ...offers,
  };
}

/** The trail the page already shows, in the form a crawler reads. */
export function breadcrumbLd(trail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: step.url,
    })),
  };
}

/**
 * A category or classification listing.
 *
 * Positions only — the products' own pages carry their prices. Repeating them
 * here would mean two places that have to agree about what something costs.
 */
export function itemListLd({ name, url, products, urlFor }) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: urlFor(product),
    })),
  };
}
