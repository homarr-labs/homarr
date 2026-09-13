ALTER TABLE "custom_widget_v2_definition" ADD COLUMN "extensions" text;--> statement-breakpoint
ALTER TABLE "custom_widget_v2_definition" ADD COLUMN "editor_layout" text;--> statement-breakpoint
ALTER TABLE "custom_widget_v2_definition" ADD COLUMN "workshop_origin" text;--> statement-breakpoint
ALTER TABLE "custom_widget_v2_definition" ADD COLUMN "previous_package" text;
--> statement-breakpoint
CREATE TABLE "custom_widget_content" (
	"item_id" varchar(64) NOT NULL,
	"definition_id" varchar(64) NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"value" text NOT NULL,
	"revision" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_widget_content_item_id_definition_id_key_pk" PRIMARY KEY("item_id","definition_id","key")
);
--> statement-breakpoint
ALTER TABLE "custom_widget_content" ADD CONSTRAINT "custom_widget_content_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_widget_content" ADD CONSTRAINT "custom_widget_content_definition_id_custom_widget_v2_definition_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."custom_widget_v2_definition"("id") ON DELETE cascade ON UPDATE no action;