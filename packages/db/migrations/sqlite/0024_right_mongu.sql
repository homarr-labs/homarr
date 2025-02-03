PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_board` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`creator_id` text,
	`page_title` text,
	`meta_title` text,
	`logo_image_url` text,
	`favicon_image_url` text,
	`background_image_url` text,
	`background_image_attachment` text DEFAULT 'fixed' NOT NULL,
	`background_image_repeat` text DEFAULT 'no-repeat' NOT NULL,
	`background_image_size` text DEFAULT 'cover' NOT NULL,
	`primary_color` text DEFAULT '#fa5252' NOT NULL,
	`secondary_color` text DEFAULT '#fd7e14' NOT NULL,
	`opacity` integer DEFAULT 100 NOT NULL,
	`custom_css` text,
	`column_count` integer DEFAULT 10 NOT NULL,
	`icon_color` text,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_board`("id", "name", "is_public", "creator_id", "page_title", "meta_title", "logo_image_url", "favicon_image_url", "background_image_url", "background_image_attachment", "background_image_repeat", "background_image_size", "primary_color", "secondary_color", "opacity", "custom_css", "column_count", "icon_color") SELECT "id", "name", "is_public", "creator_id", "page_title", "meta_title", "logo_image_url", "favicon_image_url", "background_image_url", "background_image_attachment", "background_image_repeat", "background_image_size", "primary_color", "secondary_color", "opacity", "custom_css", "column_count", "icon_color" FROM `board`;--> statement-breakpoint
DROP TABLE `board`;--> statement-breakpoint
ALTER TABLE `__new_board` RENAME TO `board`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `board_name_unique` ON `board` (`name`);