import { previewChallenge } from "./src/lib/previewGate.js";

/**
 * El middleware, delgado a propósito.
 *
 * Vive en la raíz porque `app/` está en la raíz — Next lo busca al lado del
 * directorio de rutas, no dentro de `src/`. La lógica está en
 * `src/lib/previewGate.js`, siguiendo la misma regla que los `page.js`: acá
 * solo se enruta, se decide en otro lado.
 *
 * Sin `PREVIEW_PASSWORD` esto devuelve `undefined` en la primera línea y la
 * petición sigue como si el archivo no existiera.
 */
export async function middleware(request) {
  return (await previewChallenge(request)) ?? undefined;
}

export const config = {
  matcher: [
    /*
     * Todo menos la salida del build y el optimizador de imágenes.
     *
     * **`/api` sí queda detrás de la cortina**, a diferencia de azarwear. Allá
     * se exceptúa porque el cron de Vercel se autentica con un
     * `Authorization: Bearer`, y esa cabecera admite un solo esquema — gatearla
     * habría roto el cron en silencio. Acá no hay cron, así que esa razón no
     * existe, y dejar `/api/buscar` abierto entregaría el catálogo entero
     * —nombres y precios— mientras el sitio se supone privado.
     *
     * El buscador sigue funcionando para quien ya pasó: el navegador guarda las
     * credenciales básicas y las vuelve a mandar en las peticiones del mismo
     * origen, incluidas las de `fetch`.
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
