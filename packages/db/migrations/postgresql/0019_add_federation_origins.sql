CREATE TABLE "federation_connection" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"worker_id" text NOT NULL,
	"name" text NOT NULL,
	"public_key" text NOT NULL,
	"encrypted_configuration" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "federation_connection_workerId_unique" UNIQUE("worker_id")
);
--> statement-breakpoint
CREATE TABLE "integration_origin" (
	"integration_id" varchar(64) PRIMARY KEY NOT NULL,
	"connection_id" varchar(64) NOT NULL,
	"remote_integration_id" text NOT NULL,
	"remote_revision" text,
	CONSTRAINT "integration_origin__connection_remote_id_unique" UNIQUE("connection_id","remote_integration_id")
);
--> statement-breakpoint
ALTER TABLE "integration_origin" ADD CONSTRAINT "integration_origin_integration_id_integration_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_origin" ADD CONSTRAINT "integration_origin_connection_id_federation_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."federation_connection"("id") ON DELETE restrict ON UPDATE no action;