import { currentLabOwnerId } from "@/app/labOwner";
import {
  boundedPageSize,
  decodeRecordCursor,
  encodeRecordCursor,
  mapLabEvent,
  mapLabRecord,
  requestedRecordTypes,
  type DbLabEvent,
  type DbLabRecord,
} from "@/app/labReadModels";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  const url = new URL(request.url);
  const requestedTypes = requestedRecordTypes(url.searchParams.get("type"));
  const limit = boundedPageSize(url.searchParams.get("limit"), 25, 100);
  const cursorValue = url.searchParams.get("cursor");
  const cursor = decodeRecordCursor(cursorValue);
  if (requestedTypes === null || requestedTypes.length > 1 || limit === null || (cursorValue && !cursor)) {
    return Response.json({ error: "Use one valid history type, cursor, and a limit between 1 and 100." }, { status: 400 });
  }
  const bindings: unknown[] = [owner];
  let typeClause = " AND record_type <> 'reading_record'";
  if (requestedTypes.length === 1) {
    typeClause = " AND record_type = ?";
    bindings.push(requestedTypes[0]);
  }
  let cursorClause = "";
  if (cursor) {
    cursorClause = " AND (committed_at < ? OR (committed_at = ? AND id < ?))";
    bindings.push(cursor.committedAt, cursor.committedAt, cursor.id);
  }
  bindings.push(limit + 1);
  const db = await ensureLabSchema();
  const result = await db.prepare(
    `SELECT id, record_type, parent_id, title, payload_json, committed_at, created_at
     FROM lab_records WHERE owner_id = ?${typeClause}${cursorClause}
     ORDER BY committed_at DESC, id DESC LIMIT ?`,
  ).bind(...bindings).all<DbLabRecord>();
  const rows = result.results ?? [];
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  if (page.length === 0) return Response.json({ records: [], nextCursor: null });
  const parentSlots = page.map(() => "?").join(",");
  const childrenResult = await db.prepare(
    `SELECT id, record_type, parent_id, title, payload_json, committed_at, created_at
     FROM lab_records WHERE owner_id = ? AND parent_id IN (${parentSlots})
     ORDER BY committed_at ASC, id ASC`,
  ).bind(owner, ...page.map((record) => record.id)).all<DbLabRecord>();
  const children = childrenResult.results ?? [];
  const eventRecordIds = [...page.map((record) => record.id), ...children.map((record) => record.id)];
  const eventSlots = eventRecordIds.map(() => "?").join(",");
  const eventsResult = await db.prepare(
    `SELECT id, record_id, event_type, event_json, occurred_at, created_at
     FROM lab_events WHERE owner_id = ? AND record_id IN (${eventSlots})
     ORDER BY occurred_at ASC, id ASC`,
  ).bind(owner, ...eventRecordIds).all<DbLabEvent>();
  const events = eventsResult.results ?? [];
  return Response.json({
    records: page.map((record) => ({
      ...mapLabRecord(record),
      childRecords: children.filter((child) => child.parent_id === record.id).map(mapLabRecord),
      events: events.filter((event) => event.record_id === record.id || children.some((child) => child.parent_id === record.id && child.id === event.record_id)).map(mapLabEvent),
    })),
    nextCursor: hasMore ? encodeRecordCursor(page[page.length - 1]) : null,
  });
}
