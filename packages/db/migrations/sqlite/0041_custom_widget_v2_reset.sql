PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `custom_widget_secret`;--> statement-breakpoint
DROP TABLE `custom_widget_definition`;--> statement-breakpoint
CREATE TABLE `custom_widget_definition` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon_url` text,
	`sources` text NOT NULL,
	`requests` text NOT NULL,
	`options_schema` text NOT NULL,
	`default_options` text NOT NULL,
	`state_schema` text,
	`default_state` text,
	`template` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`creator_id` text,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE TABLE `custom_widget_secret` (
	`source_id` text NOT NULL,
	`kind` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`updated_at` integer NOT NULL,
	`definition_id` text NOT NULL,
	PRIMARY KEY(`definition_id`, `source_id`, `kind`),
	FOREIGN KEY (`definition_id`) REFERENCES `custom_widget_definition`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
PRAGMA foreign_keys=ON;
