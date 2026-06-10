ALTER TABLE "custom_widget_definition" ADD COLUMN "url" text;--> statement-breakpoint
UPDATE "custom_widget_definition" SET "url" = "base_url" || "endpoint";--> statement-breakpoint
ALTER TABLE "custom_widget_definition" ALTER COLUMN "url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_widget_definition" DROP COLUMN "base_url";--> statement-breakpoint
ALTER TABLE "custom_widget_definition" DROP COLUMN "endpoint";--> statement-breakpoint
ALTER TABLE "custom_widget_definition" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;
