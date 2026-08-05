/**
 * El origen del bucket al que el navegador hace PUT.
 *
 * Se lee de `process.env` directo y no de `src/env.js`: este archivo corre
 * antes que la app, así que el módulo validado todavía no existe. Con
 * `R2_ENDPOINT` puesto (MinIO) se usa ese; si no, el comodín de R2, porque el
 * subdominio lleva el account id y no queremos que la política lo repita.
 */
function uploadOrigin() {
  const endpoint = process.env.R2_ENDPOINT;
  if (!endpoint) return "https://*.r2.cloudflarestorage.com";
  try {
    return new URL(endpoint).origin;
  } catch {
    return "https://*.r2.cloudflarestorage.com";
  }
}

/**
 * El origen desde el que se sirven nuestras propias imágenes.
 *
 * En producción es redundante con el `https:` de `img-src`. Está por el caso
 * local: MinIO habla **http**, así que sin nombrarlo la miniatura de una foto
 * recién subida queda bloqueada y parece que la subida falló cuando en realidad
 * salió perfecta.
 */
function cdnOrigin() {
  const url = process.env.NEXT_PUBLIC_CDN_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/**
 * Content Security Policy.
 *
 * Cabecera estática, no middleware por petición: un nonce obligaría a que cada
 * respuesta fuera dinámica, y acá no hay un solo script de terceros que
 * justifique el costo.
 *
 * Cuatro permisos son deliberados y cada uno tiene su razón:
 *
 * - **`img-src` acepta cualquier `https:`.** Es la única directiva que no se
 *   puede cerrar sin romper el proyecto: *una imagen es una URL*, el catálogo
 *   sembrado apunta a fotos de proveedores, el importador toma una columna de
 *   enlaces y el editor deja pegar cualquiera. Restringirlo al CDN dejaría en
 *   blanco la mitad de la tienda. La mitigación es que una etiqueta `<img>` no
 *   ejecuta nada — lo peor que consigue un enlace hostil es no cargar.
 *
 * - **`frame-src` permite Google Maps.** El pie y la página de contacto
 *   incrustan el mapa de la sucursal. La URL la escribe un admin, así que si
 *   algún día se cambia por otro proveedor de mapas hay que agregarlo acá; el
 *   síntoma es un recuadro en blanco.
 *
 * - **`connect-src` permite el bucket.** La subida del panel hace PUT directo
 *   desde el navegador. Sin esto la CSP rompería justo la función que
 *   pretende proteger.
 *
 * - **`'unsafe-inline'` en scripts y estilos.** Next inserta su arranque de
 *   hidratación en línea y nosotros emitimos JSON-LD igual; sin nonce no hay
 *   forma de distinguirlos de una inyección. Lo que lo hace tolerable es que
 *   todo el HTML se renderiza en el servidor desde datos propios: no hay
 *   marcado escrito por un usuario en ninguna parte. `JsonLd` además escapa
 *   `<`, precisamente porque esos textos sí los escribe un admin.
 */
function contentSecurityPolicy() {
  /*
   * `'unsafe-eval'`, y solo en desarrollo.
   *
   * React Refresh —el recargado en caliente— envuelve cada módulo con `eval`.
   * Sin este permiso el navegador aborta la hidratación entera y el panel queda
   * inerte: los botones no responden y no hay ningún error de servidor que lo
   * explique. Es exactamente el síntoma que ya nos costó una tarde con el
   * overlay de Next, y por eso está escrito acá.
   *
   * No debilita producción: `next build` fija `NODE_ENV=production` y el
   * permiso no llega al bundle desplegado. La CSP se congela en el build, así
   * que lo que se despliega es lo que se compiló.
   */
  const dev = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `img-src 'self' data: https: ${cdnOrigin()}`.trim(),
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' ${uploadOrigin()}${dev ? " ws: http://localhost:*" : ""}`,
    "frame-src https://www.google.com https://maps.google.com",
    "form-action 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Cabeceras de seguridad en todas las respuestas.
 *
 * HSTS es largo y cubre subdominios: una vez que un navegador la vio, se niega
 * a hablar con el sitio por HTTP plano. Importa más de lo normal acá porque la
 * cookie de sesión del panel es la única credencial que viaja, y una sola
 * petición en claro la expone.
 *
 * El resto cierra huecos chicos y baratos: adivinación de tipo MIME, fuga del
 * referente, quedar dentro de un iframe ajeno, y el acceso a sensores que esta
 * tienda no usa.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  /*
   * Build output location, overridable.
   *
   * `next build` and `next dev` both write to `.next`, so running a build while
   * a dev server is up deletes the chunks that server is still handing out —
   * the page keeps rendering but every asset 404s, which looks like a CSS bug
   * rather than a collision. Set NEXT_DIST_DIR to build somewhere else:
   *
   *   NEXT_DIST_DIR=.next-preview npx next build
   *   NEXT_DIST_DIR=.next-preview npx next start -p 3200
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  /*
   * `sharp` es un binario nativo: el bundler no puede empaquetarlo, y si lo
   * intenta el resultado falla en tiempo de ejecución en el host. Externalizarlo
   * hace que se cargue con `require` desde node_modules, que es lo que Vercel y
   * cualquier runtime Node esperan.
   *
   * Solo lo alcanzan los dos Route Handlers que lo necesitan —
   * `app/api/admin/media/route.js` y la ficha técnica en PDF. Ver la nota en
   * `infra/storage/imageKeys.js` sobre por qué los nombres de rendition viven
   * aparte del pipeline.
   *
   * `pdfkit` va por otra razón: lee sus métricas de fuente (`.afm`) del disco,
   * desde su propio directorio en node_modules, en tiempo de ejecución. Un
   * bundler que lo empaqueta se lleva el código y deja los datos atrás, y el
   * fallo aparece recién al generar el primer PDF en producción.
   */
  serverExternalPackages: ["sharp", "pdfkit"],

  experimental: {
    serverActions: {
      // Server Actions cap request bodies at 1 MB by default, which a photo
      // from a phone clears easily. Kept in step with MAX_BYTES in
      // `src/actions/media.js` — the action still rejects anything larger, so
      // this only decides whether the person gets that message or a raw 413.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
