ALTER TABLE "board" ADD COLUMN "layout_mode" varchar(32) DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "board" ADD COLUMN "base_layout_id" varchar(64);--> statement-breakpoint
ALTER TABLE "board" ADD CONSTRAINT "board_base_layout_id_layout_id_fk" FOREIGN KEY ("base_layout_id") REFERENCES "public"."layout"("id") ON DELETE set null ON UPDATE no action;