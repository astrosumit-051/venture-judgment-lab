import { env } from "cloudflare:workers";

const createRecordsSql = `
  CREATE TABLE IF NOT EXISTS lab_records (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    record_type TEXT NOT NULL,
    parent_id TEXT,
    title TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    committed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`;

const createEventsSql = `
  CREATE TABLE IF NOT EXISTS lab_events (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    record_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_json TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES lab_records(id)
  )
`;

export function getD1(): D1Database {
  if (!env.DB) {
    throw new Error("The Venture Judgment Lab database is unavailable.");
  }
  return env.DB;
}

export async function ensureLabSchema(): Promise<D1Database> {
  const db = getD1();
  await db.batch([
    db.prepare(createRecordsSql),
    db.prepare(createEventsSql),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_lab_records_owner_committed ON lab_records(owner_id, committed_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_lab_records_owner_type ON lab_records(owner_id, record_type)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_lab_events_record_occurred ON lab_events(record_id, occurred_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_lab_events_owner_occurred ON lab_events(owner_id, occurred_at)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_events_unique_forecast_resolution ON lab_events(record_id) WHERE event_type = 'forecast_resolution'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_sourcing_domain ON lab_records(owner_id, json_extract(payload_json, '$.normalizedCompanyDomain')) WHERE record_type = 'sourcing_lead'",
    ),
    db.prepare(
      "DROP INDEX IF EXISTS idx_lab_records_unique_recruiting_opportunity",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_recruiting_opportunity_cycle ON lab_records(owner_id, json_extract(payload_json, '$.recordKey')) WHERE record_type = 'recruiting_opportunity'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_recruiting_child ON lab_records(owner_id, record_type, parent_id, json_extract(payload_json, '$.recordKey')) WHERE record_type IN ('opportunity_observation', 'recruiting_interaction', 'application_attempt', 'interview_practice', 'portfolio_candidate')",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_opportunity_monitor_run ON lab_records(owner_id, json_extract(payload_json, '$.runKey')) WHERE record_type = 'opportunity_monitor_run'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_automation_registration ON lab_records(json_extract(payload_json, '$.tokenFingerprint')) WHERE record_type = 'opportunity_monitor_registration'",
    ),
    db.prepare("PRAGMA optimize"),
  ]);
  return db;
}
