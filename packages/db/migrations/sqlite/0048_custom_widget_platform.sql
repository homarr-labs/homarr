CREATE TABLE `custom_widget_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`item_id` text,
	`user_id` text,
	`handler` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`installation_id`) REFERENCES `custom_widget_installation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `custom_widget_artifact` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`version` text NOT NULL,
	`source` text NOT NULL,
	`artifact` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `custom_widget_connection` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`integration_id` text,
	`configuration` text NOT NULL,
	`encrypted_secrets` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`integration_id`) REFERENCES `integration`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `custom_widget_guest_grant` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`handler` text NOT NULL,
	`artifact_digest` text NOT NULL,
	`bindings_digest` text NOT NULL,
	`allowed_inputs` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `custom_widget_installation` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`draft` text NOT NULL,
	`active_artifact_id` text,
	`previous_artifact_id` text,
	`previous_snapshot` text,
	`bindings` text NOT NULL,
	`origin` text,
	`enabled` integer DEFAULT false NOT NULL,
	`creator_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `custom_widget_storage` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`scope` text NOT NULL,
	`owner_key` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`installation_id`) REFERENCES `custom_widget_installation`(`id`) ON UPDATE no action ON DELETE cascade
);
