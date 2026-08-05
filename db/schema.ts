import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  ],
);
