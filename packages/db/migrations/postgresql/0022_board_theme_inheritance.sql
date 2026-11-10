ALTER TABLE "board" ALTER COLUMN "primary_color" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "primary_color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "secondary_color" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "secondary_color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "item_radius" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "item_radius" DROP NOT NULL;
--> statement-breakpoint
UPDATE "board" SET "primary_color" = NULL WHERE lower("primary_color") = '#fa5252';
--> statement-breakpoint
UPDATE "board" SET "secondary_color" = NULL WHERE lower("secondary_color") = '#fd7e14';
--> statement-breakpoint
UPDATE "board" SET "item_radius" = NULL WHERE "item_radius" = 'lg';
