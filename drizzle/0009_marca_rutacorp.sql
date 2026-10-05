/*
 * El cliente pasa a llamarse RutaCorp (rutacorp.cl).
 *
 * El nombre vive en `content_blocks` —la marca del navbar y del pie, el
 * copyright, los testimonios, el correo de contacto, el título del mapa— sobre
 * una base que ya está llena, y el seed solo sirve para una instalación nueva.
 * Por eso es una migración de datos y no solo una edición de `public/data`.
 *
 * Reemplazo sobre el texto del JSON: ni "RutaCorp" ni "rutacorp" llevan
 * caracteres que haya que escapar, así que el resultado sigue siendo JSON
 * válido. Con guarda, para que corra sobre las filas que todavía nombran la
 * marca vieja y no toque las demás.
 *
 * Ojo: `unstable_cache` no se entera de un UPDATE. Después de `db:migrate`, un
 * servidor levantado sigue sirviendo la copia vieja hasta que alguien guarde
 * algo en el admin o se limpie `.next/cache`.
 */

UPDATE content_blocks
SET value = replace(replace(value::text, 'KleanChile', 'RutaCorp'), 'kleanchile', 'rutacorp')::jsonb
WHERE value::text LIKE '%KleanChile%'
   OR value::text LIKE '%kleanchile%';
