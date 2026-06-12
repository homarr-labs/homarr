ALTER TABLE `custom_widget_definition` ADD `url` text;--> statement-breakpoint
UPDATE `custom_widget_definition` SET `url` = CONCAT(`base_url`, `endpoint`);--> statement-breakpoint
ALTER TABLE `custom_widget_definition` MODIFY `url` text NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_widget_definition` DROP COLUMN `base_url`;--> statement-breakpoint
ALTER TABLE `custom_widget_definition` DROP COLUMN `endpoint`;--> statement-breakpoint
ALTER TABLE `custom_widget_definition` ADD `enabled` boolean NOT NULL DEFAULT true;
