CREATE TABLE "docker_app_source" (
	"host" varchar(512) NOT NULL,
	"container_id" varchar(128) NOT NULL,
	"external_id" varchar(512) NOT NULL,
	"app_id" varchar(64) NOT NULL,
	"board_id" varchar(64) NOT NULL,
	"item_id" varchar(64),
	"integration_id" varchar(64),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "docker_app_source_host_container_id_pk" PRIMARY KEY("host","container_id")
);
--> statement-breakpoint
ALTER TABLE "docker_app_source" ADD CONSTRAINT "docker_app_source_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."app"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docker_app_source" ADD CONSTRAINT "docker_app_source_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docker_app_source" ADD CONSTRAINT "docker_app_source_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docker_app_source" ADD CONSTRAINT "docker_app_source_integration_id_integration_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integration"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "docker_app_source__external_id_idx" ON "docker_app_source" USING btree ("host","external_id");
