CREATE TABLE `homarr_runtime_history_entry` (
	`epoch` text COLLATE BINARY NOT NULL,
	`kind` text COLLATE BINARY NOT NULL,
	`name` text COLLATE BINARY NOT NULL,
	`sequence` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`epoch`, `kind`, `name`, `sequence`),
	FOREIGN KEY (`epoch`,`kind`,`name`) REFERENCES `homarr_runtime_history_stream`(`epoch`,`kind`,`name`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "homarr_runtime_history_entry_sequence_check" CHECK("homarr_runtime_history_entry"."sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE `homarr_runtime_history_stream` (
	`epoch` text COLLATE BINARY NOT NULL,
	`kind` text COLLATE BINARY NOT NULL,
	`name` text COLLATE BINARY NOT NULL,
	`head_sequence` integer NOT NULL,
	PRIMARY KEY(`epoch`, `kind`, `name`),
	CONSTRAINT "homarr_runtime_history_stream_kind_check" CHECK("homarr_runtime_history_stream"."kind" IN ('log', 'sample')),
	CONSTRAINT "homarr_runtime_history_stream_sequence_check" CHECK("homarr_runtime_history_stream"."head_sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE `homarr_runtime_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`epoch` text COLLATE BINARY,
	CONSTRAINT "homarr_runtime_meta_identity_check" CHECK(("homarr_runtime_meta"."id" = 1 AND "homarr_runtime_meta"."epoch" IS NOT NULL) OR ("homarr_runtime_meta"."id" = 2 AND "homarr_runtime_meta"."epoch" IS NULL))
);
--> statement-breakpoint
CREATE TABLE `homarr_runtime_state` (
	`epoch` text COLLATE BINARY NOT NULL,
	`key` text COLLATE BINARY NOT NULL,
	`value` text NOT NULL,
	`expires_at_ms` real,
	PRIMARY KEY(`epoch`, `key`)
);
--> statement-breakpoint
CREATE INDEX `homarr_runtime_state_expiry_idx` ON `homarr_runtime_state` (`epoch`,`expires_at_ms`,`key`);
--> statement-breakpoint
INSERT INTO `homarr_runtime_meta` (`id`, `epoch`) VALUES (1, 'homarr-runtime:uninitialized:v1'), (2, NULL);
