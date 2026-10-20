/*
 * Dos categorías nuevas: Ferretería (`/hardware`) y Pausa del día (`/breakroom`).
 *
 * El enum crece y, además, las dos aparecen en la barra de navegación y en la
 * sección del pie que ya lista las categorías. Eso último es migración de datos
 * por la misma razón que 0003 y 0008: vive en `content_blocks` sobre una base
 * que ya está llena, y el seed solo sirve para una instalación nueva.
 *
 * Con guardas: cada enlace se agrega solo si su ruta no está, así que correrla
 * no le pelea al admin que después decida quitarlos o renombrarlos. En el pie
 * se agregan a la sección que ya enlaza `/desktop`; si el admin la borró, no se
 * agregan a ninguna.
 *
 * Los slugs en inglés no duraron: 0013 pasa todas las categorías a español.
 * Esta queda tal cual porque ya corrió en producción, y una migración aplicada
 * no se reescribe — drizzle no la vuelve a correr, así que el cambio nunca
 * llegaría.
 *
 * Ojo: `unstable_cache` no se entera de un UPDATE. Después de `db:migrate`, un
 * servidor levantado sigue sirviendo el menú viejo hasta que alguien guarde
 * algo en el admin o se limpie `.next/cache`.
 */

ALTER TYPE "public"."product_category" ADD VALUE IF NOT EXISTS 'hardware';--> statement-breakpoint
ALTER TYPE "public"."product_category" ADD VALUE IF NOT EXISTS 'breakroom';--> statement-breakpoint

UPDATE content_blocks
SET value = jsonb_set(value, '{links}', COALESCE(value -> 'links', '[]'::jsonb) || '[{"name": "Ferretería", "path": "/hardware", "dropdown": null}]'::jsonb)
WHERE key = 'navigation'
  AND NOT COALESCE(value -> 'links', '[]'::jsonb) @> '[{"path": "/hardware"}]';--> statement-breakpoint

UPDATE content_blocks
SET value = jsonb_set(value, '{links}', COALESCE(value -> 'links', '[]'::jsonb) || '[{"name": "Pausa del día", "path": "/breakroom", "dropdown": null}]'::jsonb)
WHERE key = 'navigation'
  AND NOT COALESCE(value -> 'links', '[]'::jsonb) @> '[{"path": "/breakroom"}]';--> statement-breakpoint

UPDATE content_blocks
SET value = jsonb_set(
  value,
  '{sections}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN section -> 'links' @> '[{"path": "/desktop"}]' THEN jsonb_set(
          section,
          '{links}',
          section -> 'links'
            || CASE WHEN section -> 'links' @> '[{"path": "/hardware"}]' THEN '[]'::jsonb
                    ELSE '[{"label": "Ferretería", "path": "/hardware"}]'::jsonb END
            || CASE WHEN section -> 'links' @> '[{"path": "/breakroom"}]' THEN '[]'::jsonb
                    ELSE '[{"label": "Pausa del día", "path": "/breakroom"}]'::jsonb END
        )
        ELSE section
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(value -> 'sections') WITH ORDINALITY AS t(section, ord)
  )
)
WHERE key = 'footer'
  AND jsonb_typeof(value -> 'sections') = 'array'
  AND jsonb_array_length(value -> 'sections') > 0;
