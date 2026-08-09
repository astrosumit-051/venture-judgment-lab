DROP INDEX `idx_lab_records_unique_recruiting_opportunity`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_records_unique_recruiting_opportunity_cycle` ON `lab_records` (`owner_id`, json_extract(`payload_json`, '$.recordKey')) WHERE `record_type` = 'recruiting_opportunity';
