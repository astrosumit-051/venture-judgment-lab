CREATE UNIQUE INDEX `idx_lab_records_unique_sourcing_domain`
ON `lab_records` (`owner_id`, json_extract(`payload_json`, '$.normalizedCompanyDomain'))
WHERE `record_type` = 'sourcing_lead';
