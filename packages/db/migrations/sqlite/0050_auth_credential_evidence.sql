CREATE TABLE `homarr_auth_credential_domain` (
	`id` integer PRIMARY KEY NOT NULL,
	`namespace` text NOT NULL,
	`head_sequence` integer NOT NULL,
	`phase` text NOT NULL,
	CONSTRAINT "homarr_auth_credential_domain_singleton" CHECK("homarr_auth_credential_domain"."id" = 1),
	CONSTRAINT "homarr_auth_credential_domain_head" CHECK(typeof("homarr_auth_credential_domain"."head_sequence") = 'integer' AND "homarr_auth_credential_domain"."head_sequence" >= 0),
	CONSTRAINT "homarr_auth_credential_domain_phase" CHECK("homarr_auth_credential_domain"."phase" IN ('initializing', 'ready'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `homarr_auth_credential_domain_namespace_unique` ON `homarr_auth_credential_domain` (`namespace`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_apiKey` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key` text NOT NULL,
	`user_id` text NOT NULL,
	`auth_lifetime_sequence` integer,
	`auth_write_sequence` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "apiKey_auth_evidence" CHECK(("__new_apiKey"."auth_lifetime_sequence" IS NULL AND "__new_apiKey"."auth_write_sequence" IS NULL) OR (typeof("__new_apiKey"."auth_lifetime_sequence") = 'integer' AND typeof("__new_apiKey"."auth_write_sequence") = 'integer' AND "__new_apiKey"."auth_lifetime_sequence" > 0 AND "__new_apiKey"."auth_write_sequence" >= "__new_apiKey"."auth_lifetime_sequence"))
);
--> statement-breakpoint
INSERT INTO `__new_apiKey`("id", "api_key", "user_id", "auth_lifetime_sequence", "auth_write_sequence") SELECT "id", "api_key", "user_id", NULL, NULL FROM `apiKey`;--> statement-breakpoint
DROP TABLE `apiKey`;--> statement-breakpoint
ALTER TABLE `__new_apiKey` RENAME TO `apiKey`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	`auth_lifetime_sequence` integer,
	`auth_write_sequence` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "session_auth_evidence" CHECK(("__new_session"."auth_lifetime_sequence" IS NULL AND "__new_session"."auth_write_sequence" IS NULL) OR (typeof("__new_session"."auth_lifetime_sequence") = 'integer' AND typeof("__new_session"."auth_write_sequence") = 'integer' AND "__new_session"."auth_lifetime_sequence" > 0 AND "__new_session"."auth_write_sequence" >= "__new_session"."auth_lifetime_sequence"))
);
--> statement-breakpoint
INSERT INTO `__new_session`("session_token", "user_id", "expires", "auth_lifetime_sequence", "auth_write_sequence") SELECT "session_token", "user_id", "expires", NULL, NULL FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `session` (`user_id`);
