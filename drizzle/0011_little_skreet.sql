CREATE TABLE `lab_automation_credentials` (
	`token_fingerprint` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lab_automation_credentials_owner` ON `lab_automation_credentials` (`owner_id`);