CREATE TABLE `docker_app_source` (
	`host` text NOT NULL,
	`container_id` text NOT NULL,
	`external_id` text NOT NULL,
	`app_id` text NOT NULL,
	`board_id` text NOT NULL,
	`item_id` text,
	`integration_id` text,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`host`, `container_id`),
	FOREIGN KEY (`app_id`) REFERENCES `app`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`integration_id`) REFERENCES `integration`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `docker_app_source__external_id_idx` ON `docker_app_source` (`host`,`external_id`);
