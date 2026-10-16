CREATE TABLE `federation_connection` (
	`id` text PRIMARY KEY NOT NULL,
	`worker_id` text NOT NULL,
	`name` text NOT NULL,
	`public_key` text NOT NULL,
	`encrypted_configuration` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `federation_connection_workerId_unique` ON `federation_connection` (`worker_id`);--> statement-breakpoint
CREATE TABLE `integration_origin` (
	`integration_id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`remote_integration_id` text NOT NULL,
	`remote_revision` text,
	FOREIGN KEY (`integration_id`) REFERENCES `integration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `federation_connection`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_origin__connection_remote_id_unique` ON `integration_origin` (`connection_id`,`remote_integration_id`);