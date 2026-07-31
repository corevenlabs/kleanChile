import "server-only";

import { db } from "../client.js";
import { contentBlocks } from "../schema/index.js";

/**
 * Writing editable content.
 *
 * An upsert rather than an insert-or-update dance, so a block that has never
 * been saved and one being edited for the tenth time take the same path — and
 * two people saving at once cannot race into a duplicate-key error.
 *
 * The value arriving here is already parsed by the block's Zod schema in the
 * Server Action. Nothing validates in this layer; that is the point of having
 * a domain layer above it.
 */
export async function saveBlock(key, value) {
  await db
    .insert(contentBlocks)
    .values({ key, value })
    .onConflictDoUpdate({
      target: contentBlocks.key,
      set: { value, updatedAt: new Date() },
    });
}
