CREATE TABLE `serverSetting` (
	`serverSetting_settingKey` text PRIMARY KEY NOT NULL,
	`serverSetting_value` text DEFAULT '{"json": {}}' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `serverSetting_serverSetting_settingKey_unique` ON `serverSetting` (`serverSetting_settingKey`);