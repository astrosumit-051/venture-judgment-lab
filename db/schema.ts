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
    uniqueIndex("idx_lab_records_unique_recruiting_opportunity")
      .on(table.ownerId, sql`json_extract(${table.payloadJson}, '$.normalizedOfficialUrl')`)
      .where(sql`${table.recordType} = 'recruiting_opportunity'`),
    uniqueIndex("idx_lab_records_unique_recruiting_child")
      .on(
        table.ownerId,
        table.recordType,
        table.parentId,
        sql`json_extract(${table.payloadJson}, '$.recordKey')`,
      )
      .where(sql`${table.recordType} IN ('opportunity_observation', 'recruiting_interaction', 'application_attempt', 'interview_practice', 'portfolio_candidate')`),
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
