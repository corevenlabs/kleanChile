import "server-only";

import { unstable_cache } from "next/cache";
import { CONTENT_KEYS, defaultBlock, parseBlock } from "../../../domain/content/schemas.js";
import { db } from "../client.js";
import { contentBlocks } from "../schema/index.js";

/**
 * Reading the editable page content.
 *
 * The whole table is fetched at once rather than a row per block. It is nine
 * small rows read by every page render, so nine round trips to save fetching a
 * few kilobytes would be the wrong trade — and one cache entry means one tag to
 * invalidate, instead of a save having to know which pages read which block.
 *
 * `unstable_cache` is the Next 15 equivalent of the `use cache` directive the
 * sibling project uses; it is what this version offers without turning on
 * experimental flags. Content changes when someone edits it, not on a timer, so
 * there is no `revalidate` — the Server Action calls `revalidateTag` on save
 * and the person who made the edit sees it immediately.
 */

export const CONTENT_TAG = "content";

async function readAll() {
  const rows = await db.select().from(contentBlocks);
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  // Built from the key list, not from the rows, so a block that has never been
  // saved still arrives as usable defaults rather than as `undefined` reaching
  // a component that expects an array.
  return Object.fromEntries(
    CONTENT_KEYS.map((key) => [
      key,
      stored.has(key) ? parseBlock(key, stored.get(key)) : defaultBlock(key),
    ]),
  );
}

/** Every block, parsed and defaulted. Cached. */
export const getContent = unstable_cache(readAll, ["content-blocks"], {
  tags: [CONTENT_TAG],
});

/**
 * One block, for the admin form that edits it.
 *
 * Deliberately uncached: the editor must see what is actually stored, including
 * an edit made seconds ago in another tab.
 */
export async function getBlockForEdit(key) {
  const row = await db.query.contentBlocks.findFirst({
    where: (table, { eq }) => eq(table.key, key),
  });

  return row ? parseBlock(key, row.value) : defaultBlock(key);
}
