ALTER TABLE "integrationGroupPermissions" DROP CONSTRAINT "integration_group_permission__pk";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "first_day_of_week" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "first_day_of_week" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "integrationGroupPermissions" ADD CONSTRAINT "integrationGroupPermissions_integration_id_group_id_permission_pk" PRIMARY KEY("integration_id","group_id","permission");