import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const labConversations = sqliteTable(
  "lab_conversations",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    workflow: text("workflow").notNull(),
    title: text("title").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_lab_conversations_owner_created").on(table.ownerId, table.createdAt)],
);

export const labConversationTurns = sqliteTable(
  "lab_conversation_turns",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull().references(() => labConversations.id),
    ownerId: text("owner_id").notNull(),
    sequence: integer("sequence").notNull(),
    role: text("role").notNull(),
    visibleText: text("visible_text").notNull(),
    draftJson: text("draft_json").notNull(),
    metadataJson: text("metadata_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_lab_conversation_turns_sequence").on(table.conversationId, table.sequence),
    index("idx_lab_conversation_turns_owner_created").on(table.ownerId, table.createdAt),
  ],
);

export const labConversationCommits = sqliteTable(
  "lab_conversation_commits",
  {
    conversationId: text("conversation_id").primaryKey().references(() => labConversations.id),
    ownerId: text("owner_id").notNull(),
    artifactId: text("artifact_id"),
    createdAt: text("created_at").notNull(),
    committedAt: text("committed_at"),
  },
);

export const labAutomationCredentials = sqliteTable(
  "lab_automation_credentials",
  {
    tokenFingerprint: text("token_fingerprint").primaryKey(),
    ownerId: text("owner_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_lab_automation_credentials_owner").on(table.ownerId)],
);

export const labRecords = sqliteTable(
  "lab_records",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    recordType: text("record_type").notNull(),
    parentId: text("parent_id"),
    title: text("title").notNull(),
    payloadJson: text("payload_json").notNull(),
    committedAt: text("committed_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_lab_records_owner_committed").on(
      table.ownerId,
      table.committedAt,
    ),
    index("idx_lab_records_owner_type").on(table.ownerId, table.recordType),
    uniqueIndex("idx_lab_records_unique_curriculum_epoch")
      .on(table.ownerId)
      .where(sql`${table.recordType} = 'curriculum_epoch'`),
    uniqueIndex("idx_lab_records_unique_practice_day")
      .on(table.ownerId, sql`json_extract(${table.payloadJson}, '$.practiceDayKey')`)
      .where(sql`${table.recordType} = 'practice_day'`),
    uniqueIndex("idx_lab_records_unique_confirmation_selection")
      .on(table.ownerId)
      .where(sql`${table.recordType} = 'confirmation_selection'`),
    uniqueIndex("idx_lab_records_unique_practice_snapshot")
      .on(table.ownerId, sql`json_extract(${table.payloadJson}, '$.practiceDayId')`)
      .where(sql`${table.recordType} = 'snapshot_judgment' AND json_extract(${table.payloadJson}, '$.practiceDayId') IS NOT NULL`),
    uniqueIndex("idx_lab_records_unique_sourcing_domain")
      .on(table.ownerId, sql`json_extract(${table.payloadJson}, '$.normalizedCompanyDomain')`)
      .where(sql`${table.recordType} = 'sourcing_lead'`),
    uniqueIndex("idx_lab_records_unique_recruiting_opportunity_cycle")
      .on(table.ownerId, sql`json_extract(${table.payloadJson}, '$.recordKey')`)
      .where(sql`${table.recordType} = 'recruiting_opportunity'`),
    uniqueIndex("idx_lab_records_unique_recruiting_child")
      .on(
        table.ownerId,
        table.recordType,
        table.parentId,
        sql`json_extract(${table.payloadJson}, '$.recordKey')`,
      )
      .where(sql`${table.recordType} IN ('opportunity_observation', 'recruiting_interaction', 'application_attempt', 'interview_practice', 'portfolio_candidate')`),
    uniqueIndex("idx_lab_records_unique_opportunity_monitor_run")
      .on(table.ownerId, sql`json_extract(${table.payloadJson}, '$.runKey')`)
      .where(sql`${table.recordType} = 'opportunity_monitor_run'`),
    uniqueIndex("idx_lab_records_unique_automation_registration")
      .on(sql`json_extract(${table.payloadJson}, '$.tokenFingerprint')`)
      .where(sql`${table.recordType} = 'opportunity_monitor_registration'`),
    uniqueIndex("idx_lab_records_unique_lab_automation_registration")
      .on(sql`json_extract(${table.payloadJson}, '$.tokenFingerprint')`)
      .where(sql`${table.recordType} = 'lab_automation_registration'`),
    uniqueIndex("idx_lab_records_unique_diligence_case")
      .on(table.ownerId, sql`json_extract(${table.payloadJson}, '$.caseKey')`)
      .where(sql`${table.recordType} = 'diligence_case'`),
    uniqueIndex("idx_lab_records_unique_diligence_stage")
      .on(table.ownerId, table.parentId, sql`json_extract(${table.payloadJson}, '$.stageKey')`)
      .where(sql`${table.recordType} = 'diligence_stage'`),
    uniqueIndex("idx_lab_records_unique_coach_request")
      .on(table.ownerId, table.parentId, sql`json_extract(${table.payloadJson}, '$.dimension')`)
      .where(sql`${table.recordType} = 'coach_request'`),
    uniqueIndex("idx_lab_records_unique_coach_feedback")
      .on(table.ownerId, table.parentId)
      .where(sql`${table.recordType} = 'coach_feedback'`),
    uniqueIndex("idx_lab_records_unique_revision_attempt")
      .on(table.ownerId, table.parentId)
      .where(sql`${table.recordType} = 'revision_attempt'`),
    uniqueIndex("idx_lab_records_unique_mastery_evidence")
      .on(table.ownerId, sql`json_extract(${table.payloadJson}, '$.recordKey')`)
      .where(sql`${table.recordType} = 'mastery_evidence'`),
  ],
);

export const labEvents = sqliteTable(
  "lab_events",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    recordId: text("record_id")
      .notNull()
      .references(() => labRecords.id),
    eventType: text("event_type").notNull(),
    eventJson: text("event_json").notNull(),
    occurredAt: text("occurred_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_lab_events_record_occurred").on(
      table.recordId,
      table.occurredAt,
    ),
    index("idx_lab_events_owner_occurred").on(
      table.ownerId,
      table.occurredAt,
    ),
    uniqueIndex("idx_lab_events_unique_forecast_resolution")
      .on(table.recordId)
      .where(sql`${table.eventType} = 'forecast_resolution'`),
    uniqueIndex("idx_lab_events_unique_archive_preserved")
      .on(table.recordId)
      .where(sql`${table.eventType} = 'archive_preserved'`),
    uniqueIndex("idx_lab_events_unique_assignment_committed")
      .on(table.recordId)
      .where(sql`${table.eventType} = 'assignment_committed'`),
    uniqueIndex("idx_lab_events_unique_assignment_terminal")
      .on(table.recordId)
      .where(sql`${table.eventType} IN ('completion', 'missed_practice')`),
    uniqueIndex("idx_lab_events_unique_learner_response")
      .on(table.recordId)
      .where(sql`${table.eventType} = 'learner_response'`),
  ],
);

export const labProfiles = sqliteTable(
  "lab_profiles",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    profileVersion: text("profile_version").notNull(),
    timezone: text("timezone").notNull(),
    practiceMode: text("practice_mode").notNull(),
    expectedWeekdaysJson: text("expected_weekdays_json").notNull(),
    notificationPreference: text("notification_preference").notNull(),
    effectiveLearnerDate: text("effective_learner_date").notNull(),
    automationBinding: text("automation_binding").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_lab_profiles_owner_version").on(table.ownerId, table.profileVersion),
    uniqueIndex("idx_lab_profiles_owner_effective_date").on(table.ownerId, table.effectiveLearnerDate),
    index("idx_lab_profiles_owner_created").on(table.ownerId, table.createdAt),
  ],
);

export const labAutomationRuns = sqliteTable(
  "lab_automation_runs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    operatorKind: text("operator_kind").notNull(),
    scheduledFor: text("scheduled_for").notNull(),
    profileId: text("profile_id").notNull().references(() => labProfiles.id),
    inputChecksum: text("input_checksum").notNull(),
    evidenceRecordId: text("evidence_record_id").notNull().references(() => labRecords.id),
    notificationIntent: text("notification_intent").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_lab_automation_runs_owner_slot").on(table.ownerId, table.operatorKind, table.scheduledFor),
    index("idx_lab_automation_runs_owner_created").on(table.ownerId, table.createdAt),
  ],
);

export const labAssignments = sqliteTable(
  "lab_assignments",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    learnerDate: text("learner_date").notNull(),
    profileId: text("profile_id").notNull().references(() => labProfiles.id),
    automationRunId: text("automation_run_id").notNull().references(() => labAutomationRuns.id),
    evidenceRecordId: text("evidence_record_id").notNull().references(() => labRecords.id),
    state: text("state").notNull(),
    payloadChecksum: text("payload_checksum").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_lab_assignments_owner_date").on(table.ownerId, table.learnerDate),
    uniqueIndex("idx_lab_assignments_owner_run").on(table.ownerId, table.automationRunId),
    index("idx_lab_assignments_owner_created").on(table.ownerId, table.createdAt),
  ],
);
