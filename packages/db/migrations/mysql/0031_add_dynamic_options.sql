ALTER TABLE `item` MODIFY COLUMN `options` text NOT NULL DEFAULT ('{"json":{}}');--> statement-breakpoint
ALTER TABLE `item` MODIFY COLUMN `advanced_options` text NOT NULL DEFAULT ('{"json":{}}');--> statement-breakpoint
ALTER TABLE `serverSetting` MODIFY COLUMN `value` text NOT NULL DEFAULT ('{"json":{}}');--> statement-breakpoint
ALTER TABLE `section` ADD `options` text DEFAULT ('{"json":{}}');