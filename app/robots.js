import { absoluteUrl } from "../src/lib/site.js";

/**
 * Replaces the static `public/robots.txt`, which was Create React App's default
 * — allow everything, mention no sitemap, and know nothing about the routes
 * this site actually has.
 *
 * The disallowed paths are not secrets; `/admin` is behind a session and every
 * action re-checks it. They are excluded because they are worthless in an index
 * and actively harmful in one: `/carrito` is per-visitor, `/pedido/<token>` is
 * one customer's order, and a crawler spending its budget there is a crawler
 * not reading the catalogue. The pages carry `noindex` as well — robots.txt
 * asks a crawler not to fetch, which is not the same as asking it not to list.
 */
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      /*
       * `/buscar` is not listed. It carries `noindex, follow`, which needs the
       * page to be *fetched* to be obeyed — disallowing it here would hide the
       * instruction and leave the URLs eligible to be listed anyway. `/api` is
       * blocked because there is nothing there for a reader.
       */
      disallow: ["/admin", "/admin/", "/login", "/carrito", "/pedido/", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
