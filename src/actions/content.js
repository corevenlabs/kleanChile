"use server";

import { revalidateTag } from "next/cache";
import { contentSchemas } from "../domain/content/schemas.js";
import { saveBlock } from "../infra/db/mutations/content.js";
import { CONTENT_TAG } from "../infra/db/queries/content.js";
import { requireUser } from "../lib/adminSession.js";

/**
 * Saving a block of storefront content.
 *
 * The editor sends the whole block as one object rather than a flat FormData.
 * These blocks are nested — slides inside a hero, links inside footer sections
 * — and encoding that as `sections[1].links[0].label` only to parse it back
 * apart on the server is work that buys nothing here.
 *
 * The object is re-validated against the block's schema regardless. It arrives
 * from the browser, so what the form believes it sent is a suggestion; the
 * schema decides. Anything that fails is reported rather than coerced — quietly
 * substituting defaults would look like the form discarding someone's work.
 */
export async function saveBlockAction(key, value) {
  await requireUser();

  const schema = contentSchemas[key];
  if (!schema) {
    return { status: "error", message: "Sección desconocida." };
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      message: first ? `${first.path.join(".")}: ${first.message}` : "Datos inválidos.",
    };
  }

  await saveBlock(key, parsed.data);

  // The person who just saved should see the change on the storefront now, not
  // whenever a timer happens to lapse.
  revalidateTag(CONTENT_TAG);

  return { status: "ok" };
}
