CREATE TABLE `assistant_configuration` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`web_search_enabled` integer DEFAULT false NOT NULL,
	`provider` text DEFAULT 'openrouter' NOT NULL,
	`base_url` text DEFAULT 'https://openrouter.ai/api/v1' NOT NULL,
	`model_discovery_path` text DEFAULT '/models',
	`encrypted_api_key` text,
	`encrypted_headers` text,
	`model_id` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assistant_message` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`parent_id` text,
	`format` text DEFAULT 'ai-sdk/v6' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `assistant_thread`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_message__thread_id_created_at_idx` ON `assistant_message` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `assistant_thread` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`model_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_thread__user_id_updated_at_idx` ON `assistant_thread` (`user_id`,`updated_at`);