/*
 * Removes the links that point at routes this site does not have.
 *
 * `/about` sat in the navbar and in the footer, and `/machinery` in the footer,
 * carried over from the original static JSON. Neither route has ever existed:
 * the categories are cleaning, bookshop and desktop, and there is no about
 * page. Both rendered as ordinary links and 404'd.
 *
 * A data migration rather than only a seed edit, because these live in
 * `content_blocks` on a database that is already filled — the seed helps a
 * fresh install and nothing else. Guarded so it runs once and does not fight an
 * admin who deliberately adds an "about" link back later, which is the whole
 * point of this content being editable.
 *
 * `/machinery` becomes `/desktop`: that footer link was for a catalogue that
 * was never built, and Escritorio is the third one that exists.
 */

UPDATE content_blocks
SET value = jsonb_set(
  value,
  '{links}',
  COALESCE((
    SELECT jsonb_agg(link ORDER BY ord)
    FROM jsonb_array_elements(value -> 'links') WITH ORDINALITY AS t(link, ord)
    WHERE link ->> 'path' <> '/about'
  ), '[]'::jsonb)
)
WHERE key = 'navigation'
  AND value -> 'links' @> '[{"path": "/about"}]';
--> statement-breakpoint
UPDATE content_blocks
SET value = jsonb_set(
  value,
  '{sections}',
  COALESCE((
    SELECT jsonb_agg(
      jsonb_set(
        section,
        '{links}',
        COALESCE((
          SELECT jsonb_agg(
            CASE
              WHEN link ->> 'path' = '/machinery'
                THEN jsonb_build_object('label', 'Escritorio', 'path', '/desktop')
              ELSE link
            END
            ORDER BY link_ord
          )
          FROM jsonb_array_elements(section -> 'links') WITH ORDINALITY AS l(link, link_ord)
          WHERE link ->> 'path' <> '/about'
        ), '[]'::jsonb)
      )
      ORDER BY section_ord
    )
    FROM jsonb_array_elements(value -> 'sections') WITH ORDINALITY AS s(section, section_ord)
  ), '[]'::jsonb)
)
WHERE key = 'footer'
  AND (
    value -> 'sections' @> '[{"links": [{"path": "/about"}]}]'
    OR value -> 'sections' @> '[{"links": [{"path": "/machinery"}]}]'
  );
