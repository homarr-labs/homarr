ALTER TABLE "apiKey" ADD COLUMN "oauth_client_id" text;--> statement-breakpoint
ALTER TABLE "apiKey" ADD COLUMN "oauth_client_name" text;--> statement-breakpoint
ALTER TABLE "apiKey" ADD COLUMN "oauth_redirect_uri" text;--> statement-breakpoint
ALTER TABLE "apiKey" ADD COLUMN "oauth_issued_at" timestamp;