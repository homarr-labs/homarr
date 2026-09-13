ALTER TABLE `custom_widget_v2_definition` ADD `extensions` longtext;--> statement-breakpoint
ALTER TABLE `custom_widget_v2_definition` ADD `editor_layout` longtext;--> statement-breakpoint
ALTER TABLE `custom_widget_v2_definition` ADD `workshop_origin` longtext;--> statement-breakpoint
ALTER TABLE `custom_widget_v2_definition` ADD `previous_package` longtext;
--> statement-breakpoint
CREATE TABLE `custom_widget_content` (
	`item_id` varchar(64) NOT NULL,
	`definition_id` varchar(64) NOT NULL,
	`key` varchar(64) NOT NULL,
	`name` varchar(64) NOT NULL,
	`value` longtext NOT NULL,
	`revision` int NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `custom_widget_content_item_id_definition_id_key_pk` PRIMARY KEY(`item_id`,`definition_id`,`key`)
);
--> statement-breakpoint
ALTER TABLE `custom_widget_content` ADD CONSTRAINT `custom_widget_content_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_content` ADD CONSTRAINT `custom_widget_content_definition_id_fk` FOREIGN KEY (`definition_id`) REFERENCES `custom_widget_v2_definition`(`id`) ON DELETE cascade ON UPDATE no action;