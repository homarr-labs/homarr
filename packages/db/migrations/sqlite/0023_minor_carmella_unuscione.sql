CREATE TABLE `layout_item_section` (
	`item_id` text NOT NULL,
	`section_id` text NOT NULL,
	`layout_id` text NOT NULL,
	`x_offset` integer NOT NULL,
	`y_offset` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	PRIMARY KEY(`item_id`, `section_id`, `layout_id`),
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`layout_id`) REFERENCES `layout`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `layout_section` (
	`section_id` text NOT NULL,
	`layout_id` text NOT NULL,
	`parent_section_id` text,
	`x_offset` integer NOT NULL,
	`y_offset` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	PRIMARY KEY(`section_id`, `layout_id`),
	FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`layout_id`) REFERENCES `layout`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_section_id`) REFERENCES `section`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `layout` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`board_id` text NOT NULL,
	`column_count` integer NOT NULL,
	`breakpoint` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `layout`(`id`, `name`, `column_count`, `board_id`) SELECT id, 'Base', column_count, id FROM board;
--> statement-breakpoint
INSERT INTO `layout_item_section`(`item_id`, `section_id`, `layout_id`, `x_offset`, `y_offset`, `width`, `height`) SELECT item.id, section.id, board.id, item.x_offset, item.y_offset, item.width, item.height FROM board LEFT JOIN section ON section.board_id=board.id LEFT JOIN item ON item.section_id=section.id WHERE item.id NOT NULL;
--> statement-breakpoint
INSERT INTO `layout_section`(`section_id`, `layout_id`, `parent_section_id`, `x_offset`, `y_offset`, `width`, `height`) SELECT section.id, board.id, section.parent_section_id, section.x_offset, section.y_offset, section.width, section.height FROM board LEFT JOIN section ON section.board_id=board.id WHERE section.id NOT NULL AND section.kind = 'dynamic';
--> statement-breakpoint
COMMIT TRANSACTION;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
BEGIN TRANSACTION;
--> statement-breakpoint
CREATE TABLE `__new_item` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`kind` text NOT NULL,
	`x_offset` integer NOT NULL,
	`y_offset` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`options` text DEFAULT '{"json": {}}' NOT NULL,
	`advanced_options` text DEFAULT '{"json": {}}' NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_item`("id", "board_id", "kind", "x_offset", "y_offset", "width", "height", "options", "advanced_options") SELECT item.id, section.board_id, item.kind, item.x_offset, item.y_offset, item.width, item.height, "options", "advanced_options" FROM `item` LEFT JOIN `section` ON section.id=item.section_id;
--> statement-breakpoint
DROP TABLE `item`;
--> statement-breakpoint
ALTER TABLE `__new_item` RENAME TO `item`;
--> statement-breakpoint
COMMIT TRANSACTION;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
BEGIN TRANSACTION;