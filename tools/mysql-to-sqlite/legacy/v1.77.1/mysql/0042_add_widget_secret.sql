CREATE TABLE `widget_secret` (
	`item_id` varchar(64) NOT NULL,
	`kind` varchar(64) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `widget_secret_item_id_kind_pk` PRIMARY KEY(`item_id`,`kind`)
);
--> statement-breakpoint
ALTER TABLE `widget_secret` ADD CONSTRAINT `widget_secret_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;
