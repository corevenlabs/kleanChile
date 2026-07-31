/**
 * Los íconos del panel.
 *
 * Antes eran glifos de texto — ⌂ ✉ ▧ □ ⚙ — y ese es el problema: cada uno viene
 * de una fuente distinta según el sistema, así que llegaban con grosores y
 * tamaños dispares, y algunos caían al cuadrado vacío en equipos sin la fuente.
 *
 * Son SVG de trazo, todos sobre una grilla de 24 con el mismo ancho de línea,
 * de modo que una fila de íconos se lee pareja. Heredan `currentColor`: el
 * color lo decide el contexto, no el ícono.
 */

const paths = {
  resumen: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />,
  pedidos: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </>
  ),
  portada: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="M2.5 14.5 8 10l4.5 3.5L16 11l5.5 4" />
      <circle cx="8.5" cy="8.5" r="1.4" />
    </>
  ),
  productos: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>
  ),
  importar: (
    <>
      <path d="M12 3v11" />
      <path d="m8 10.5 4 3.5 4-3.5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  configuracion: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  stock: (
    <>
      <path d="M3 8h18M3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8M3 8l2-4h14l2 4" />
      <path d="M10 12h4" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  externo: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 20.5 3.5" />
    </>
  ),
  salir: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  descargar: (
    <>
      <path d="M12 3v12" />
      <path d="m7.5 11 4.5 4 4.5-4" />
      <path d="M4 19h16" />
    </>
  ),
  archivo: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  ok: <path d="m4.5 12.5 5 5 10-11" />,
  alerta: (
    <>
      <path d="M12 3.5 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.4v.2" />
    </>
  ),
};

export default function Icon({ name, size = 18, className }) {
  const path = paths[name];
  if (!path) return null;

  return (
    <svg
      // Decorativo: el texto contiguo ya nombra la acción, y anunciarlo dos
      // veces sería ruido para un lector de pantalla.
      aria-hidden="true"
      focusable="false"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}
