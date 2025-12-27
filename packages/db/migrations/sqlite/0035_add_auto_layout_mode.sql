ALTER TABLE `board` ADD `layout_mode` text DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE `board` ADD `base_layout_id` text REFERENCES layout(id);