CREATE UNIQUE INDEX `idx_lab_records_unique_coach_request` ON `lab_records` (`owner_id`,`parent_id`,json_extract(`payload_json`, '$.dimension')) WHERE "lab_records"."record_type" = 'coach_request';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_records_unique_coach_feedback` ON `lab_records` (`owner_id`,`parent_id`) WHERE "lab_records"."record_type" = 'coach_feedback';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_records_unique_revision_attempt` ON `lab_records` (`owner_id`,`parent_id`) WHERE "lab_records"."record_type" = 'revision_attempt';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_records_unique_mastery_evidence` ON `lab_records` (`owner_id`,json_extract(`payload_json`, '$.recordKey')) WHERE "lab_records"."record_type" = 'mastery_evidence';
