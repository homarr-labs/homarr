CREATE TABLE `iconRepository` (
	`iconRepository_id` text PRIMARY KEY NOT NULL,
	`iconRepository_slug` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `icon` (
	`icon_id` text PRIMARY KEY NOT NULL,
	`icon_name` text NOT NULL,
	`icon_url` text NOT NULL,
	`icon_checksum` text NOT NULL,
	`iconRepository_id` text NOT NULL,
	FOREIGN KEY (`iconRepository_id`) REFERENCES `iconRepository`(`iconRepository_id`) ON UPDATE no action ON DELETE cascade
);
