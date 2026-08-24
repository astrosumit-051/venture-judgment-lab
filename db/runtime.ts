import { env } from "cloudflare:workers";

const createConversationsSql = `
  CREATE TABLE IF NOT EXISTS lab_conversations (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    workflow TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`;

const createConversationTurnsSql = `
  CREATE TABLE IF NOT EXISTS lab_conversation_turns (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    role TEXT NOT NULL,
    visible_text TEXT NOT NULL,
    draft_json TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES lab_conversations(id)
  )
`;

const createConversationCommitsSql = `
  CREATE TABLE IF NOT EXISTS lab_conversation_commits (
    conversation_id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    artifact_id TEXT,
    created_at TEXT NOT NULL,
    committed_at TEXT,
    FOREIGN KEY (conversation_id) REFERENCES lab_conversations(id)
  )
`;

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

const createAutomationCredentialsSql = `
  CREATE TABLE IF NOT EXISTS lab_automation_credentials (
    token_fingerprint TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`;

const createProfilesSql = `
  CREATE TABLE IF NOT EXISTS lab_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    profile_version TEXT NOT NULL,
    timezone TEXT NOT NULL,
    practice_mode TEXT NOT NULL,
    expected_weekdays_json TEXT NOT NULL,
    notification_preference TEXT NOT NULL,
    effective_learner_date TEXT NOT NULL,
    automation_binding TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`;

const createAutomationRunsSql = `
  CREATE TABLE IF NOT EXISTS lab_automation_runs (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    operator_kind TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    input_checksum TEXT NOT NULL,
    evidence_record_id TEXT NOT NULL,
    notification_intent TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES lab_profiles(id),
    FOREIGN KEY (evidence_record_id) REFERENCES lab_records(id)
  )
`;

const createAssignmentsSql = `
  CREATE TABLE IF NOT EXISTS lab_assignments (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    learner_date TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    automation_run_id TEXT NOT NULL,
    evidence_record_id TEXT NOT NULL,
    state TEXT NOT NULL,
    payload_checksum TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES lab_profiles(id),
    FOREIGN KEY (automation_run_id) REFERENCES lab_automation_runs(id),
    FOREIGN KEY (evidence_record_id) REFERENCES lab_records(id)
  )
`;

let schemaInitialization: { db: D1Database; promise: Promise<D1Database> } | null = null;

export function getD1(): D1Database {
  if (!env.DB) {
    throw new Error("The Venture Judgment Lab database is unavailable.");
  }
  return env.DB;
}

export async function ensureLabSchema(): Promise<D1Database> {
  const db = getD1();
  if (schemaInitialization?.db === db) return schemaInitialization.promise;
  const promise = db.batch([
    db.prepare(createConversationsSql),
    db.prepare(createConversationTurnsSql),
    db.prepare(createConversationCommitsSql),
    db.prepare(createRecordsSql),
    db.prepare(createEventsSql),
    db.prepare(createAutomationCredentialsSql),
    db.prepare(createProfilesSql),
    db.prepare(createAutomationRunsSql),
    db.prepare(createAssignmentsSql),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_lab_conversations_owner_created ON lab_conversations(owner_id, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_conversation_turns_sequence ON lab_conversation_turns(conversation_id, sequence)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_lab_conversation_turns_owner_created ON lab_conversation_turns(owner_id, created_at)"),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_lab_records_owner_committed ON lab_records(owner_id, committed_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_lab_records_owner_type ON lab_records(owner_id, record_type)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_curriculum_epoch ON lab_records(owner_id) WHERE record_type = 'curriculum_epoch'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_practice_day ON lab_records(owner_id, json_extract(payload_json, '$.practiceDayKey')) WHERE record_type = 'practice_day'",
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
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_events_unique_archive_preserved ON lab_events(record_id) WHERE event_type = 'archive_preserved'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_events_unique_assignment_committed ON lab_events(record_id) WHERE event_type = 'assignment_committed'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_events_unique_assignment_terminal ON lab_events(record_id) WHERE event_type IN ('completion', 'missed_practice')",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_events_unique_learner_response ON lab_events(record_id) WHERE event_type = 'learner_response'",
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
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_lab_automation_registration ON lab_records(json_extract(payload_json, '$.tokenFingerprint')) WHERE record_type = 'lab_automation_registration'",
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_lab_automation_credentials_owner ON lab_automation_credentials(owner_id)"),
    db.prepare(
      `CREATE TRIGGER IF NOT EXISTS trg_lab_registration_owner_guard
       BEFORE INSERT ON lab_records
       WHEN NEW.record_type IN ('opportunity_monitor_registration', 'lab_automation_registration')
       AND EXISTS (
         SELECT 1 FROM lab_automation_credentials credential
         WHERE credential.token_fingerprint = json_extract(NEW.payload_json, '$.tokenFingerprint')
         AND credential.owner_id <> NEW.owner_id
       )
       BEGIN SELECT RAISE(ABORT, 'automation credential owner conflict'); END`,
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_diligence_case ON lab_records(owner_id, json_extract(payload_json, '$.caseKey')) WHERE record_type = 'diligence_case'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_diligence_stage ON lab_records(owner_id, parent_id, json_extract(payload_json, '$.stageKey')) WHERE record_type = 'diligence_stage'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_coach_request ON lab_records(owner_id, parent_id, json_extract(payload_json, '$.dimension')) WHERE record_type = 'coach_request'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_coach_feedback ON lab_records(owner_id, parent_id) WHERE record_type = 'coach_feedback'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_revision_attempt ON lab_records(owner_id, parent_id) WHERE record_type = 'revision_attempt'",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_records_unique_mastery_evidence ON lab_records(owner_id, json_extract(payload_json, '$.recordKey')) WHERE record_type = 'mastery_evidence'",
    ),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_profiles_owner_version ON lab_profiles(owner_id, profile_version)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_profiles_owner_effective_date ON lab_profiles(owner_id, effective_learner_date)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_lab_profiles_owner_created ON lab_profiles(owner_id, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_automation_runs_owner_slot ON lab_automation_runs(owner_id, operator_kind, scheduled_for)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_lab_automation_runs_owner_created ON lab_automation_runs(owner_id, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_assignments_owner_date ON lab_assignments(owner_id, learner_date)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_assignments_owner_run ON lab_assignments(owner_id, automation_run_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_lab_assignments_owner_created ON lab_assignments(owner_id, created_at)"),
    db.prepare("PRAGMA optimize"),
  ]).then(() => db).catch((error) => {
    if (schemaInitialization?.db === db) schemaInitialization = null;
    throw error;
  });
  schemaInitialization = { db, promise };
  return promise;
}
