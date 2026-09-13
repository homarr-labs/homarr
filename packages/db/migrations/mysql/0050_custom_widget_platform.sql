CREATE TABLE `custom_widget_activity` (
	`id` varchar(128) NOT NULL,
	`installation_id` varchar(128) NOT NULL,
	`item_id` varchar(128),
	`user_id` varchar(128),
	`handler` varchar(128) NOT NULL,
	`status` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `custom_widget_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_widget_artifact` (
	`id` varchar(128) NOT NULL,
	`package_id` varchar(128) NOT NULL,
	`version` varchar(128) NOT NULL,
	`source` longtext NOT NULL,
	`artifact` longtext NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `custom_widget_artifact_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_widget_connection` (
	`id` varchar(128) NOT NULL,
	`name` varchar(128) NOT NULL,
	`integration_id` varchar(128),
	`configuration` longtext NOT NULL,
	`encrypted_secrets` longtext NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `custom_widget_connection_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_widget_guest_grant` (
	`id` varchar(128) NOT NULL,
	`item_id` varchar(128) NOT NULL,
	`handler` varchar(128) NOT NULL,
	`artifact_digest` varchar(128) NOT NULL,
	`bindings_digest` varchar(128) NOT NULL,
	`allowed_inputs` longtext NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `custom_widget_guest_grant_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_widget_installation` (
	`id` varchar(128) NOT NULL,
	`name` varchar(128) NOT NULL,
	`draft` longtext NOT NULL,
	`active_artifact_id` varchar(128),
	`previous_artifact_id` varchar(128),
	`previous_snapshot` longtext,
	`bindings` longtext NOT NULL,
	`origin` longtext,
	`enabled` boolean NOT NULL DEFAULT false,
	`creator_id` varchar(128),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `custom_widget_installation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_widget_storage` (
	`id` varchar(128) NOT NULL,
	`installation_id` varchar(128) NOT NULL,
	`scope` varchar(128) NOT NULL,
	`owner_key` varchar(128) NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` longtext NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `custom_widget_storage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `custom_widget_activity` ADD CONSTRAINT `custom_widget_activity_installation_fk` FOREIGN KEY (`installation_id`) REFERENCES `custom_widget_installation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_connection` ADD CONSTRAINT `custom_widget_connection_integration_id_integration_id_fk` FOREIGN KEY (`integration_id`) REFERENCES `integration`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_guest_grant` ADD CONSTRAINT `custom_widget_guest_grant_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_installation` ADD CONSTRAINT `custom_widget_installation_creator_id_user_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_storage` ADD CONSTRAINT `custom_widget_storage_installation_fk` FOREIGN KEY (`installation_id`) REFERENCES `custom_widget_installation`(`id`) ON DELETE cascade ON UPDATE no action;