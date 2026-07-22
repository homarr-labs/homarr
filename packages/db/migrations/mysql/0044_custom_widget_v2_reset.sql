RENAME TABLE `custom_widget_definition` TO `legacy_custom_widget_definition`, `custom_widget_secret` TO `legacy_custom_widget_secret`;--> statement-breakpoint
ALTER TABLE `legacy_custom_widget_definition` DROP FOREIGN KEY `custom_widget_definition_creator_id_user_id_fk`;--> statement-breakpoint
ALTER TABLE `legacy_custom_widget_definition` ADD CONSTRAINT `legacy_cw_definition_creator_id_user_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `legacy_custom_widget_secret` DROP FOREIGN KEY `cw_secret_definition_id_cw_definition_id_fk`;--> statement-breakpoint
ALTER TABLE `legacy_custom_widget_secret` ADD CONSTRAINT `legacy_cw_secret_definition_id_fk` FOREIGN KEY (`definition_id`) REFERENCES `legacy_custom_widget_definition`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE `custom_widget_definition` (
	`id` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`icon_url` text,
	`sources` text NOT NULL,
	`requests` text NOT NULL,
	`options` text NOT NULL,
	`template` text NOT NULL,
	`enabled` boolean DEFAULT true NOT NULL,
	`created_at` timestamp DEFAULT (now()) NOT NULL,
	`updated_at` timestamp DEFAULT (now()) NOT NULL,
	`creator_id` varchar(64),
	CONSTRAINT `custom_widget_definition_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE `custom_widget_secret` (
	`source_id` varchar(64) NOT NULL,
	`kind` varchar(64) NOT NULL,
	`encrypted_value` text NOT NULL,
	`updated_at` timestamp NOT NULL,
	`definition_id` varchar(64) NOT NULL,
	CONSTRAINT `custom_widget_secret_definition_id_source_id_kind_pk` PRIMARY KEY(`definition_id`,`source_id`,`kind`)
);--> statement-breakpoint
ALTER TABLE `custom_widget_definition` ADD CONSTRAINT `custom_widget_definition_creator_id_user_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_secret` ADD CONSTRAINT `cw_secret_definition_id_fk` FOREIGN KEY (`definition_id`) REFERENCES `custom_widget_definition`(`id`) ON DELETE cascade ON UPDATE no action;
