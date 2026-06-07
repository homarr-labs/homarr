CREATE TABLE "custom_widget_definition" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"icon_url" text,
	"base_url" text NOT NULL,
	"auth_type" varchar(32) DEFAULT 'none' NOT NULL,
	"header_name" varchar(256),
	"endpoint" text NOT NULL,
	"method" varchar(16) DEFAULT 'GET' NOT NULL,
	"request_body" text,
	"display_type" varchar(32) DEFAULT 'singleValue' NOT NULL,
	"display_config" text DEFAULT '{"json": {}}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "custom_widget_secret" (
	"kind" varchar(64) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp NOT NULL,
	"definition_id" varchar(64) NOT NULL,
	CONSTRAINT "custom_widget_secret_definition_id_kind_pk" PRIMARY KEY("definition_id","kind")
);
--> statement-breakpoint
ALTER TABLE "custom_widget_definition" ADD CONSTRAINT "custom_widget_definition_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_widget_secret" ADD CONSTRAINT "custom_widget_secret_definition_id_custom_widget_definition_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."custom_widget_definition"("id") ON DELETE cascade ON UPDATE no action;