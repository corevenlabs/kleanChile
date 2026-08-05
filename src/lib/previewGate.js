/**
 * Cortina de vista previa.
 *
 * Mientras el cliente revisa el sitio antes de lanzarlo, toda la tienda queda
 * detrás de autenticación HTTP básica: él recibe un usuario y una contraseña, y
 * cualquier otro recibe un 401. **Es una cortina, no una caja fuerte** — el
 * objetivo es que el público y Google no vean una tienda a medio armar, no
 * detener a alguien decidido. La autorización de verdad sigue donde siempre:
 * `requireUser()` en cada página y cada Server Action del panel.
 *
 * Todo lo gobierna una variable:
 *
 *     PREVIEW_PASSWORD puesta   →  el sitio pide credenciales
 *     PREVIEW_PASSWORD sin poner →  este archivo no hace absolutamente nada
 *
 * así que abrir el sitio al público es borrar una variable y volver a
 * desplegar. No hay rama que fusionar ni código que revertir ni nada que
 * acordarse de deshacer, que es la parte que suele salir mal.
 *
 * Autenticación básica y no una página de login: el navegador dibuja el
 * diálogo y recuerda la respuesta, así que no hay formulario, ni cookie, ni
 * tabla de sesiones, ni una segunda puerta al sitio que haya que mantener
 * segura.
 *
 * ── Por qué la comparación es así ────────────────────────────────────────────
 *
 * En Next 15 el middleware corre en el runtime Edge, donde no existe
 * `node:crypto` ni su `timingSafeEqual`. Así que se comparan los **hashes**
 * SHA-256 de lo ofrecido y lo esperado: aunque el `===` sobre el hash termine
 * antes con un prefijo distinto, lo que se filtraría es información sobre el
 * hash y no sobre la contraseña, y un hash no se puede recorrer a ciegas.
 */

const REALM = "KleanChile - vista previa";
const DEFAULT_USER = "kleanchile";

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * @returns `null` si la petición puede seguir, o la respuesta 401 que la corta.
 */
export async function previewChallenge(request) {
  const password = process.env.PREVIEW_PASSWORD;
  if (!password) return null;

  const user = process.env.PREVIEW_USER || DEFAULT_USER;
  const expected = `Basic ${btoa(`${user}:${password}`)}`;
  const offered = request.headers.get("authorization");

  if (offered && (await sha256(offered)) === (await sha256(expected))) return null;

  return new Response("KleanChile — sitio en vista previa privada.\n", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Content-Type": "text/plain; charset=utf-8",
      /*
       * Nada de esto se guarda. Un desafío cacheado dejaría fuera a quien ya
       * entró, y una página cacheada se filtraría por encima de la cortina —
       * que es exactamente lo que la cortina existe para impedir.
       */
      "Cache-Control": "no-store",
    },
  });
}
