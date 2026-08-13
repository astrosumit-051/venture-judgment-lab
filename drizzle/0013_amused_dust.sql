CREATE TABLE `lab_conversation_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`role` text NOT NULL,
	`visible_text` text NOT NULL,
	`draft_json` text NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `lab_conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_conversation_turns_sequence` ON `lab_conversation_turns` (`conversation_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_lab_conversation_turns_owner_created` ON `lab_conversation_turns` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `lab_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`workflow` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lab_conversations_owner_created` ON `lab_conversations` (`owner_id`,`created_at`);