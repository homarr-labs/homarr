CREATE TABLE `iconRepository` (
	`iconRepository_id` varchar(256) NOT NULL,
	`iconRepository_slug` varchar(150) NOT NULL,
	CONSTRAINT `iconRepository_iconRepository_id` PRIMARY KEY(`iconRepository_id`)
);
--> statement-breakpoint
CREATE TABLE `icon` (
	`icon_id` varchar(256) NOT NULL,
	`icon_name` varchar(250) NOT NULL,
	`icon_url` text NOT NULL,
	`icon_checksum` text NOT NULL,
	`iconRepository_id` varchar(256) NOT NULL,
	CONSTRAINT `icon_icon_id` PRIMARY KEY(`icon_id`)
);
--> statement-breakpoint
ALTER TABLE `icon` ADD CONSTRAINT `icon_iconRepository_id_iconRepository_iconRepository_id_fk` FOREIGN KEY (`iconRepository_id`) REFERENCES `iconRepository`(`iconRepository_id`) ON DELETE cascade ON UPDATE no action;