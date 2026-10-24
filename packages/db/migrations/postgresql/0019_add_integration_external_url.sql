ALTER TABLE "integration" ADD COLUMN "external_url" text;--> statement-breakpoint
DELETE FROM "integrationSecret" WHERE "kind" = 'wazuhDashboardUrl';
