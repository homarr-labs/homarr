CREATE TABLE `assistant_configuration` (
	`id` varchar(64) DEFAULT 'default' NOT NULL,
	`enabled` boolean DEFAULT false NOT NULL,
	`provider` varchar(32) DEFAULT 'openrouter' NOT NULL,
	`base_url` varchar(2048) DEFAULT 'https://openrouter.ai/api/v1' NOT NULL,
	`model_discovery_path` varchar(512) DEFAULT '/models',
	`encrypted_api_key` text,
	`encrypted_headers` text,
	`model_id` varchar(256),
	`updated_at` timestamp DEFAULT (now()) NOT NULL,
	CONSTRAINT `assistant_configuration_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assistant_thread` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`title` varchar(256),
	`model_id` varchar(256),
	`created_at` timestamp DEFAULT (now()) NOT NULL,
	`updated_at` timestamp DEFAULT (now()) NOT NULL,
	CONSTRAINT `assistant_thread_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assistant_message` (
	`id` varchar(128) NOT NULL,
	`thread_id` varchar(64) NOT NULL,
	`parent_id` varchar(128),
	`format` varchar(64) DEFAULT 'ai-sdk/v6' NOT NULL,
	`content` mediumtext DEFAULT ('{"json": {}}') NOT NULL,
	`created_at` timestamp DEFAULT (now()) NOT NULL,
	CONSTRAINT `assistant_message_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assistant_thread` ADD CONSTRAINT `assistant_thread_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `assistant_message` ADD CONSTRAINT `assistant_message_thread_id_assistant_thread_id_fk` FOREIGN KEY (`thread_id`) REFERENCES `assistant_thread`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `assistant_message__thread_id_created_at_idx` ON `assistant_message` (`thread_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `assistant_thread__user_id_updated_at_idx` ON `assistant_thread` (`user_id`,`updated_at`);
