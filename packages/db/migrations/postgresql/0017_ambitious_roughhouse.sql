CREATE TABLE "homarr_runtime_history_entry" (
	"epoch" text COLLATE "C" NOT NULL,
	"kind" text COLLATE "C" NOT NULL,
	"name" text COLLATE "C" NOT NULL,
	"sequence" bigint NOT NULL,
	"payload" text NOT NULL,
	CONSTRAINT "homarr_runtime_history_entry_pk" PRIMARY KEY("epoch","kind","name","sequence"),
	CONSTRAINT "homarr_runtime_history_entry_sequence_check" CHECK ("homarr_runtime_history_entry"."sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "homarr_runtime_history_stream" (
	"epoch" text COLLATE "C" NOT NULL,
	"kind" text COLLATE "C" NOT NULL,
	"name" text COLLATE "C" NOT NULL,
	"head_sequence" bigint NOT NULL,
	CONSTRAINT "homarr_runtime_history_stream_pk" PRIMARY KEY("epoch","kind","name"),
	CONSTRAINT "homarr_runtime_history_stream_kind_check" CHECK ("homarr_runtime_history_stream"."kind" IN ('log', 'sample')),
	CONSTRAINT "homarr_runtime_history_stream_sequence_check" CHECK ("homarr_runtime_history_stream"."head_sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "homarr_runtime_meta" (
	"id" integer PRIMARY KEY NOT NULL,
	"epoch" text COLLATE "C",
	CONSTRAINT "homarr_runtime_meta_identity_check" CHECK (("homarr_runtime_meta"."id" = 1 AND "homarr_runtime_meta"."epoch" IS NOT NULL) OR ("homarr_runtime_meta"."id" = 2 AND "homarr_runtime_meta"."epoch" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "homarr_runtime_state" (
	"epoch" text COLLATE "C" NOT NULL,
	"key" text COLLATE "C" NOT NULL,
	"value" text NOT NULL,
	"expires_at_ms" double precision,
	CONSTRAINT "homarr_runtime_state_pk" PRIMARY KEY("epoch","key")
);
--> statement-breakpoint
ALTER TABLE "homarr_runtime_history_entry" ADD CONSTRAINT "homarr_runtime_history_entry_stream_fk" FOREIGN KEY ("epoch","kind","name") REFERENCES "public"."homarr_runtime_history_stream"("epoch","kind","name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "homarr_runtime_state_expiry_idx" ON "homarr_runtime_state" USING btree ("epoch","expires_at_ms","key");
--> statement-breakpoint
INSERT INTO "homarr_runtime_meta" ("id", "epoch") VALUES (1, 'homarr-runtime:uninitialized:v1'), (2, NULL);
