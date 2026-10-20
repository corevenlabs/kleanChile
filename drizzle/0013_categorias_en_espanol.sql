/*
 * Las categorías pasan a español.
 *
 * El slug de una categoría es también la dirección de su página, y una
 * dirección es texto que el cliente ve y comparte:
 *
 *   cleaning → limpieza      bookshop → libreria      desktop → escritorio
 *   hardware → ferreteria    breakroom → pausa-del-dia
 *
 * `RENAME VALUE` cambia el enum en el lugar: cada producto queda en su
 * categoría sin tocar una sola fila. Las direcciones viejas no mueren:
 * `next.config.js` redirige las tres que llegaron a publicarse con un 308.
 *
 * Cada paso mira antes de actuar, así que esta migración sirve sobre cualquier
 * base: una que corrió 0012 tal cual (producción), una donde los valores ya se
 * renombraron a mano, o una recién creada.
 *
 * Después se reescriben las rutas guardadas en `content_blocks` (menú, pie,
 * banners, «más vendidos»). El reemplazo exige que tras el slug venga `"`, `/`,
 * `?` o `#`, para que `/cleaning/industrial` cambie y una URL de imagen que
 * contenga «desktop» no.
 *
 * Ojo: `unstable_cache` no se entera de un UPDATE. Después de `db:migrate`, un
 * servidor levantado sigue sirviendo el menú viejo hasta que alguien guarde
 * algo en el admin o se limpie `.next/cache`.
 */

DO $$
DECLARE
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ARRAY['cleaning', 'limpieza'],
    ARRAY['bookshop', 'libreria'],
    ARRAY['desktop', 'escritorio'],
    ARRAY['hardware', 'ferreteria'],
    ARRAY['breakroom', 'pausa-del-dia']
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'product_category' AND e.enumlabel = pair[1]
    ) THEN
      EXECUTE format('ALTER TYPE "public"."product_category" RENAME VALUE %L TO %L', pair[1], pair[2]);
    END IF;
  END LOOP;
END $$;--> statement-breakpoint

ALTER TYPE "public"."product_category" ADD VALUE IF NOT EXISTS 'ferreteria';--> statement-breakpoint
ALTER TYPE "public"."product_category" ADD VALUE IF NOT EXISTS 'pausa-del-dia';--> statement-breakpoint

UPDATE content_blocks
SET value = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(value::text, '"/cleaning(?=["/?#])', '"/limpieza', 'g'),
        '"/bookshop(?=["/?#])', '"/libreria', 'g'),
      '"/desktop(?=["/?#])', '"/escritorio', 'g'),
    '"/hardware(?=["/?#])', '"/ferreteria', 'g'),
  '"/breakroom(?=["/?#])', '"/pausa-del-dia', 'g')::jsonb
WHERE value::text ~ '"/(cleaning|bookshop|desktop|hardware|breakroom)["/?#]';
