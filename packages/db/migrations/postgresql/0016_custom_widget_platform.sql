CREATE TABLE "custom_widget_activity" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"installation_id" varchar(128) NOT NULL,
	"item_id" varchar(128),
	"user_id" varchar(128),
	"handler" varchar(128) NOT NULL,
	"status" varchar(128) NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_widget_artifact" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"package_id" varchar(128) NOT NULL,
	"version" varchar(128) NOT NULL,
	"source" text NOT NULL,
	"artifact" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_widget_connection" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"integration_id" varchar(128),
	"configuration" text NOT NULL,
	"encrypted_secrets" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_widget_guest_grant" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"item_id" varchar(128) NOT NULL,
	"handler" varchar(128) NOT NULL,
	"artifact_digest" varchar(128) NOT NULL,
	"bindings_digest" varchar(128) NOT NULL,
	"allowed_inputs" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_widget_installation" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"draft" text NOT NULL,
	"active_artifact_id" varchar(128),
	"previous_artifact_id" varchar(128),
	"previous_snapshot" text,
	"bindings" text NOT NULL,
	"origin" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"creator_id" varchar(128),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_widget_storage" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"installation_id" varchar(128) NOT NULL,
	"scope" varchar(128) NOT NULL,
	"owner_key" varchar(128) NOT NULL,
	"key" varchar(128) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_widget_activity" ADD CONSTRAINT "custom_widget_activity_installation_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."custom_widget_installation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_widget_connection" ADD CONSTRAINT "custom_widget_connection_integration_id_integration_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integration"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_widget_guest_grant" ADD CONSTRAINT "custom_widget_guest_grant_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_widget_installation" ADD CONSTRAINT "custom_widget_installation_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_widget_storage" ADD CONSTRAINT "custom_widget_storage_installation_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."custom_widget_installation"("id") ON DELETE cascade ON UPDATE no action;