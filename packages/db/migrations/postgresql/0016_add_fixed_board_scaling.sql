ALTER TABLE "board" ADD COLUMN "fixed_scaling" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "board" ADD COLUMN "fixed_item_size" smallint DEFAULT 200 NOT NULL;
