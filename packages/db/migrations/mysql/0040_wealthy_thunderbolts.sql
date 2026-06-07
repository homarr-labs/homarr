CREATE TABLE `custom_widget_definition` (
	`id` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`icon_url` text,
	`base_url` text NOT NULL,
	`auth_type` varchar(32) NOT NULL DEFAULT 'none',
	`header_name` varchar(256),
	`endpoint` text NOT NULL,
	`method` varchar(16) NOT NULL DEFAULT 'GET',
	`request_body` text,
	`display_type` varchar(32) NOT NULL DEFAULT 'singleValue',
	`display_config` text NOT NULL DEFAULT ('{"json": {}}'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`creator_id` varchar(64),
	CONSTRAINT `custom_widget_definition_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_widget_secret` (
	`kind` varchar(64) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL,
	`definition_id` varchar(64) NOT NULL,
	CONSTRAINT `custom_widget_secret_definition_id_kind_pk` PRIMARY KEY(`definition_id`,`kind`)
);
--> statement-breakpoint
ALTER TABLE `custom_widget_definition` ADD CONSTRAINT `custom_widget_definition_creator_id_user_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_secret` ADD CONSTRAINT `cw_secret_definition_id_cw_definition_id_fk` FOREIGN KEY (`definition_id`) REFERENCES `custom_widget_definition`(`id`) ON DELETE cascade ON UPDATE no action;