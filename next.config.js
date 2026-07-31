/** @type {import('next').NextConfig} */
const nextConfig = {
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
   * Solo lo alcanza `app/api/admin/media/route.js` — a propósito. Ver la nota en
   * `infra/storage/imageKeys.js` sobre por qué los nombres de rendition viven
   * aparte del pipeline.
   */
  serverExternalPackages: ["sharp"],

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
