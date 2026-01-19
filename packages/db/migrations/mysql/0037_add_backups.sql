CREATE TABLE `backup` (
	`id` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`type` varchar(16) NOT NULL,
	`file_path` text NOT NULL,
	`file_size` int NOT NULL,
	`checksum` varchar(64) NOT NULL,
	`status` varchar(16) NOT NULL,
	`created_by` varchar(64),
	`created_at` timestamp NOT NULL,
	CONSTRAINT `backup_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `backup` ADD CONSTRAINT `backup_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;