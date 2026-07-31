import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Editable page content, one row per block of the storefront.
 *
 * A key/JSONB table rather than a typed column per field. Every block has a
 * different bespoke shape — the hero is a list of slides, "why us" is a list of
 * reasons with icon names, the footer nests link groups inside sections — and
 * each is read and written whole, never queried across. Modelling that
 * relationally would mean a dozen near-empty tables and a migration every time
 * a marketing section gains a subtitle.
 *
 * The looseness stops at the door: `src/domain/content/schemas.js` parses every
 * value with Zod on the way in and on the way out, so nothing untyped ever
 * reaches a component. A row that somehow holds garbage falls back to the
 * block's defaults instead of blanking the page.
 *
 * Valid keys are the ones in `CONTENT_KEYS`; there is no foreign key to
 * enforce it, because the set lives in code where the parser for each also
 * lives.
 */
export const contentBlocks = pgTable("content_blocks", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
