CREATE TABLE `lab_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`learner_date` text NOT NULL,
	`profile_id` text NOT NULL,
	`automation_run_id` text NOT NULL,
	`evidence_record_id` text NOT NULL,
	`state` text NOT NULL,
	`payload_checksum` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `lab_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`automation_run_id`) REFERENCES `lab_automation_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidence_record_id`) REFERENCES `lab_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_assignments_owner_date` ON `lab_assignments` (`owner_id`,`learner_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_assignments_owner_run` ON `lab_assignments` (`owner_id`,`automation_run_id`);--> statement-breakpoint
CREATE INDEX `idx_lab_assignments_owner_created` ON `lab_assignments` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `lab_automation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`operator_kind` text NOT NULL,
	`scheduled_for` text NOT NULL,
	`profile_id` text NOT NULL,
	`input_checksum` text NOT NULL,
	`evidence_record_id` text NOT NULL,
	`notification_intent` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `lab_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidence_record_id`) REFERENCES `lab_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_automation_runs_owner_slot` ON `lab_automation_runs` (`owner_id`,`operator_kind`,`scheduled_for`);--> statement-breakpoint
CREATE INDEX `idx_lab_automation_runs_owner_created` ON `lab_automation_runs` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `lab_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`profile_version` text NOT NULL,
	`timezone` text NOT NULL,
	`practice_mode` text NOT NULL,
	`expected_weekdays_json` text NOT NULL,
	`notification_preference` text NOT NULL,
	`effective_learner_date` text NOT NULL,
	`automation_binding` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_profiles_owner_version` ON `lab_profiles` (`owner_id`,`profile_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_profiles_owner_effective_date` ON `lab_profiles` (`owner_id`,`effective_learner_date`);--> statement-breakpoint
CREATE INDEX `idx_lab_profiles_owner_created` ON `lab_profiles` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_events_unique_archive_preserved` ON `lab_events` (`record_id`) WHERE "lab_events"."event_type" = 'archive_preserved';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_records_unique_lab_automation_registration` ON `lab_records` (json_extract(`payload_json`, '$.tokenFingerprint')) WHERE `record_type` = 'lab_automation_registration';
