/*
 * Saca "Contacto" de la barra de navegación.
 *
 * El buscador pasó a estar siempre visible en vez de detrás de un botón con
 * lupa, y para eso necesita ancho. Los enlaces que no llevan a producto son los
 * que lo ceden: `/contact` sale de la barra y "Nosotros" —que se inyectaba en
 * `Navbar.js`, no en estos datos— deja de inyectarse allí.
 *
 * Ninguna de las dos páginas queda huérfana: `Footer.js` ya lista "Contacto" en
 * la sección Empresa y le agrega "Nosotros" al lado, así que las dos siguen
 * enlazadas desde todas las páginas públicas y siguen en el sitemap. Lo que
 * cambia es dónde se las busca, no si existen.
 *
 * Migración de datos y no solo una edición del seed, por la misma razón que
 * 0003: esto vive en `content_blocks` sobre una base que ya está llena, y el
 * seed solo sirve para una instalación nueva. Con guarda, para que corra una
 * vez y no le discuta al admin que mañana decida volver a poner el enlace —
 * que es justamente para lo que este contenido es editable.
 *
 * Ojo: `unstable_cache` no se entera de un UPDATE. Después de `db:migrate`, un
 * servidor levantado sigue sirviendo la copia vieja hasta que alguien guarde
 * algo en el admin o se limpie `.next/cache`, y eso se lee exactamente igual
 * que si la migración no hubiera corrido.
 */

UPDATE content_blocks
SET value = jsonb_set(
  value,
  '{links}',
  COALESCE((
    SELECT jsonb_agg(link ORDER BY ord)
    FROM jsonb_array_elements(value -> 'links') WITH ORDINALITY AS t(link, ord)
    WHERE link ->> 'path' <> '/contact'
  ), '[]'::jsonb)
)
WHERE key = 'navigation'
  AND value -> 'links' @> '[{"path": "/contact"}]';
