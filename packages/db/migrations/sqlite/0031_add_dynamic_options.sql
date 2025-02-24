PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_item` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`kind` text NOT NULL,
	`x_offset` integer NOT NULL,
	`y_offset` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`options` text DEFAULT '{"json":{}}' NOT NULL,
	`advanced_options` text DEFAULT '{"json":{}}' NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_item`("id", "section_id", "kind", "x_offset", "y_offset", "width", "height", "options", "advanced_options") SELECT "id", "section_id", "kind", "x_offset", "y_offset", "width", "height", "options", "advanced_options" FROM `item`;--> statement-breakpoint
DROP TABLE `item`;--> statement-breakpoint
ALTER TABLE `__new_item` RENAME TO `item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_serverSetting` (
	`setting_key` text PRIMARY KEY NOT NULL,
	`value` text DEFAULT '{"json":{}}' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_serverSetting`("setting_key", "value") SELECT "setting_key", "value" FROM `serverSetting`;--> statement-breakpoint
DROP TABLE `serverSetting`;--> statement-breakpoint
ALTER TABLE `__new_serverSetting` RENAME TO `serverSetting`;--> statement-breakpoint
CREATE UNIQUE INDEX `serverSetting_settingKey_unique` ON `serverSetting` (`setting_key`);--> statement-breakpoint
ALTER TABLE `section` ADD `options` text DEFAULT '{"json":{}}';