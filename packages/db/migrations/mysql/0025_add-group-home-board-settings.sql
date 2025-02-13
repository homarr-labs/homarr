ALTER TABLE `group` ADD `home_board_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `group` ADD `mobile_home_board_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `group` ADD `position` smallint;
--> statement-breakpoint
UPDATE SET `position` = -1 WHERE `name` = 'everyone';
--> statement-breakpoint
UPDATE SET `position` = ROW_NUMBER() OVER(ORDER BY `name`) WHERE `name` != 'everyone';
--> statement-breakpoint
ALTER TABLE `group` MODIFY `position` smallint NOT NULL;
--> statement-breakpoint
ALTER TABLE `group` ADD CONSTRAINT `group_home_board_id_board_id_fk` FOREIGN KEY (`home_board_id`) REFERENCES `board`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `group` ADD CONSTRAINT `group_mobile_home_board_id_board_id_fk` FOREIGN KEY (`mobile_home_board_id`) REFERENCES `board`(`id`) ON DELETE set null ON UPDATE no action;