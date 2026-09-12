ALTER TABLE `custom_widget_v2_definition` ADD `extensions` text;--> statement-breakpoint
ALTER TABLE `custom_widget_v2_definition` ADD `editor_layout` text;--> statement-breakpoint
ALTER TABLE `custom_widget_v2_definition` ADD `workshop_origin` text;--> statement-breakpoint
ALTER TABLE `custom_widget_v2_definition` ADD `previous_package` text;
--> statement-breakpoint
CREATE TABLE `custom_widget_content` (
	`item_id` text NOT NULL,
	`definition_id` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`item_id`, `definition_id`, `key`),
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`definition_id`) REFERENCES `custom_widget_v2_definition`(`id`) ON UPDATE no action ON DELETE cascade
);
