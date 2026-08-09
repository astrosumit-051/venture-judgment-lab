CREATE UNIQUE INDEX `idx_lab_records_unique_recruiting_opportunity`
ON `lab_records` (`owner_id`, json_extract(`payload_json`, '$.normalizedOfficialUrl'))
WHERE `record_type` = 'recruiting_opportunity';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_records_unique_recruiting_child`
ON `lab_records` (`owner_id`, `record_type`, `parent_id`, json_extract(`payload_json`, '$.recordKey'))
WHERE `record_type` IN ('opportunity_observation', 'recruiting_interaction', 'application_attempt', 'interview_practice', 'portfolio_candidate');
