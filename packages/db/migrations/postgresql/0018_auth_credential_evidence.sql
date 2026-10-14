CREATE TABLE "homarr_auth_credential_domain" (
	"id" integer PRIMARY KEY NOT NULL,
	"namespace" text NOT NULL,
	"head_sequence" bigint NOT NULL,
	"phase" text NOT NULL,
	CONSTRAINT "homarr_auth_credential_domain_namespace_unique" UNIQUE("namespace"),
	CONSTRAINT "homarr_auth_credential_domain_singleton" CHECK ("homarr_auth_credential_domain"."id" = 1),
	CONSTRAINT "homarr_auth_credential_domain_head" CHECK ("homarr_auth_credential_domain"."head_sequence" >= 0),
	CONSTRAINT "homarr_auth_credential_domain_phase" CHECK ("homarr_auth_credential_domain"."phase" IN ('initializing', 'ready'))
);
--> statement-breakpoint
ALTER TABLE "apiKey" ADD COLUMN "auth_lifetime_sequence" bigint;--> statement-breakpoint
ALTER TABLE "apiKey" ADD COLUMN "auth_write_sequence" bigint;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "auth_lifetime_sequence" bigint;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "auth_write_sequence" bigint;--> statement-breakpoint
ALTER TABLE "apiKey" ADD CONSTRAINT "apiKey_auth_evidence" CHECK (("apiKey"."auth_lifetime_sequence" IS NULL AND "apiKey"."auth_write_sequence" IS NULL) OR ("apiKey"."auth_lifetime_sequence" IS NOT NULL AND "apiKey"."auth_write_sequence" IS NOT NULL AND "apiKey"."auth_lifetime_sequence" > 0 AND "apiKey"."auth_write_sequence" >= "apiKey"."auth_lifetime_sequence"));--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_auth_evidence" CHECK (("session"."auth_lifetime_sequence" IS NULL AND "session"."auth_write_sequence" IS NULL) OR ("session"."auth_lifetime_sequence" IS NOT NULL AND "session"."auth_write_sequence" IS NOT NULL AND "session"."auth_lifetime_sequence" > 0 AND "session"."auth_write_sequence" >= "session"."auth_lifetime_sequence"));