CREATE TABLE `custom_widget_definition` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon_url` text,
	`base_url` text NOT NULL,
	`auth_type` text DEFAULT 'none' NOT NULL,
	`header_name` text,
	`endpoint` text NOT NULL,
	`method` text DEFAULT 'GET' NOT NULL,
	`request_body` text,
	`display_type` text DEFAULT 'singleValue' NOT NULL,
	`display_config` text DEFAULT '{"json": {}}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`creator_id` text,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `custom_widget_secret` (
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	`definition_id` text NOT NULL,
	PRIMARY KEY(`definition_id`, `kind`),
	FOREIGN KEY (`definition_id`) REFERENCES `custom_widget_definition`(`id`) ON UPDATE no action ON DELETE cascade
);
