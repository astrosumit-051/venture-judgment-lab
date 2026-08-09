import { sql } from "drizzle-orm";
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  ],
);
