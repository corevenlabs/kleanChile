/*
 * Repoints the last two `/machinery` links, in the hero and the dual banner.
 *
 * Migration 0003 cleared the navbar and the footer but not these — they live
 * inside the `hero` and `dualBanner` blocks, where the path is a field on a
 * slide rather than a link in a list. The result was the most visible dead link
 * on the site: the home page's own call to action, on artwork reading
 * "maquinaria confiable para industria", landing on a 404.
 *
 * `/cleaning/industrial` rather than `/desktop`: the machines the artwork is
 * selling — the industrial vacuum, the cleaning trolley — are catalogued under
 * Limpieza with type "industrial", and the classification route added for the
 * navbar answers exactly that query. Five products, and it stays right as more
 * are added, because nothing here names them.
 *
 * Guarded, so an admin who later points these somewhere else keeps their
 * choice.
 */

UPDATE content_blocks
SET value = jsonb_set(
  value,
  '{slides}',
  COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN slide ->> 'path' = '/machinery'
          THEN jsonb_set(slide, '{path}', '"/cleaning/industrial"'::jsonb)
        ELSE slide
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(value -> 'slides') WITH ORDINALITY AS s(slide, ord)
  ), '[]'::jsonb)
)
WHERE key = 'hero'
  AND value -> 'slides' @> '[{"path": "/machinery"}]';
--> statement-breakpoint
UPDATE content_blocks
SET value = jsonb_set(
  value,
  '{blocks}',
  COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN block ->> 'path' = '/machinery'
          THEN jsonb_set(block, '{path}', '"/cleaning/industrial"'::jsonb)
        ELSE block
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(value -> 'blocks') WITH ORDINALITY AS b(block, ord)
  ), '[]'::jsonb)
)
WHERE key = 'dualBanner'
  AND value -> 'blocks' @> '[{"path": "/machinery"}]';
