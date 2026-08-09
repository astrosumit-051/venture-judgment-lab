CREATE UNIQUE INDEX `idx_lab_records_unique_diligence_case`
ON `lab_records` (`owner_id`, json_extract(`payload_json`, '$.caseKey'))
WHERE `record_type` = 'diligence_case';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_records_unique_diligence_stage`
ON `lab_records` (`owner_id`, `parent_id`, json_extract(`payload_json`, '$.stageKey'))
WHERE `record_type` = 'diligence_stage';
