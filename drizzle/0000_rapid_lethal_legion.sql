CREATE TABLE `lab_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`record_type` text NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`payload_json` text NOT NULL,
	`committed_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lab_records_owner_committed` ON `lab_records` (`owner_id`,`committed_at`);--> statement-breakpoint
CREATE INDEX `idx_lab_records_owner_type` ON `lab_records` (`owner_id`,`record_type`);--> statement-breakpoint
CREATE TABLE `lab_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`record_id` text NOT NULL,
	`event_type` text NOT NULL,
	`event_json` text NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `lab_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lab_events_record_occurred` ON `lab_events` (`record_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_lab_events_owner_occurred` ON `lab_events` (`owner_id`,`occurred_at`);--> statement-breakpoint
PRAGMA optimize;
