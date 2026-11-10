ALTER TABLE "board" ALTER COLUMN "primary_color" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "primary_color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "secondary_color" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "secondary_color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "item_radius" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "item_radius" DROP NOT NULL;
