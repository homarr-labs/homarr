CREATE TABLE "cron_job_configuration" (
	"name" varchar(256) PRIMARY KEY NOT NULL,
	"cron_expression" varchar(32) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL
);
