/**
 * Where this site lives, for the URLs that have to be absolute.
 *
 * Canonical tags, `og:image`, `og:url` and the sitemap are all read by machines
 * that never saw the request — a relative path in any of them either resolves
 * against the crawler's own origin or is dropped. So the origin has to be
 * configured rather than inferred.
 *
 * `NEXT_PUBLIC_` because the metadata is also rendered on pages that ship to
 * the browser. It is an origin, not a secret.
 *
 * The localhost fallback keeps `npm run dev` working without a `.env.local`
 * entry. It is deliberately obvious: seeing `localhost:3000` in a production
 * `og:url` says "this was never configured" far faster than a subtly wrong
 * domain would.
 */

export const SITE_NAME = "KleanChile";

export const SITE_DESCRIPTION =
  "Productos de limpieza, librería y artículos de escritorio para colegios, hoteles, oficinas e industria. Despacho a todo Chile.";

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  // Trailing slashes make `${origin}${path}` produce `//producto`, which some
  // crawlers treat as a protocol-relative URL to a host called "producto".
  return (configured || "http://localhost:3000").replace(/\/+$/, "");
}

/** An absolute URL for a path that starts with "/". */
export function absoluteUrl(path = "/") {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Product images are supplier URLs as often as they are our own uploads, so
 * this has to pass absolute URLs through untouched and only resolve the
 * relative ones.
 */
export function absoluteImage(src) {
  if (!src) return null;
  return /^https?:\/\//i.test(src) ? src : absoluteUrl(src);
}
