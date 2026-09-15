PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_custom_widget_definition` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon_url` text,
	`url` text NOT NULL,
	`auth_type` text DEFAULT 'none' NOT NULL,
	`header_name` text,
	`method` text DEFAULT 'GET' NOT NULL,
	`request_body` text,
	`display_type` text DEFAULT 'singleValue' NOT NULL,
	`display_config` text DEFAULT '{"json": {}}' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`creator_id` text,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_custom_widget_definition`("id", "name", "description", "icon_url", "url", "auth_type", "header_name", "method", "request_body", "display_type", "display_config", "enabled", "created_at", "updated_at", "creator_id") SELECT "id", "name", "description", "icon_url", "base_url" || "endpoint", "auth_type", "header_name", "method", "request_body", "display_type", "display_config", 1, "created_at", "updated_at", "creator_id" FROM `custom_widget_definition`;--> statement-breakpoint
DROP TABLE `custom_widget_definition`;--> statement-breakpoint
ALTER TABLE `__new_custom_widget_definition` RENAME TO `custom_widget_definition`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
