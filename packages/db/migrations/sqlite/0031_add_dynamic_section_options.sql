PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_serverSetting` (
	`setting_key` text PRIMARY KEY NOT NULL,
	`value` text DEFAULT '{"json":{}}' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_serverSetting`("setting_key", "value") SELECT "setting_key", "value" FROM `serverSetting`;--> statement-breakpoint
DROP TABLE `serverSetting`;--> statement-breakpoint
ALTER TABLE `__new_serverSetting` RENAME TO `serverSetting`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `serverSetting_settingKey_unique` ON `serverSetting` (`setting_key`);--> statement-breakpoint
ALTER TABLE `section` ADD `options` text DEFAULT '{"json": {}}';