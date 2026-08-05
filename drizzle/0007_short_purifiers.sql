CREATE TYPE "public"."media_kind" AS ENUM('image', 'document');--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "original_width" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "original_height" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "spec_sheet_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "kind" "media_kind" DEFAULT 'image' NOT NULL;