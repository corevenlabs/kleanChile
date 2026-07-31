/*
 * El copyright del pie pasa a nombre de la tienda.
 *
 * Decía «© 2026 CorevenLabs Todos los derechos reservados.», que atribuye al
 * estudio los derechos del sitio del cliente. Son dos cosas distintas y ahora
 * se muestran por separado: el copyright es de KleanChile y editable en el
 * panel; la firma «Hecho por CorevenLabs» vive en el componente, porque es una
 * firma y no contenido que alguien deba poder vaciar sin querer.
 *
 * Con guarda por el texto exacto: si el cliente ya lo redactó a su manera, se
 * respeta lo que escribió.
 */

UPDATE content_blocks
SET value = jsonb_set(
  value,
  '{copyright}',
  '"KleanChile. Todos los derechos reservados."'::jsonb
)
WHERE key = 'footer'
  AND value ->> 'copyright' = 'CorevenLabs Todos los derechos reservados.';
