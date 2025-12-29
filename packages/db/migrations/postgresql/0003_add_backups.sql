CREATE TABLE "backup" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" varchar(16) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"status" varchar(16) NOT NULL,
	"created_by" varchar(64),
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "backup" ADD CONSTRAINT "backup_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;