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
  const types = requestedRecordTypes(url.searchParams.get("types"));
  const limit = boundedPageSize(url.searchParams.get("limit"), 50, 200);
  const cursorValue = url.searchParams.get("cursor");
  const cursor = decodeRecordCursor(cursorValue);
  const includeEvents = url.searchParams.get("includeEvents") === "1";
  if (types === null || limit === null || (cursorValue && !cursor)) {
    return Response.json({ error: "Use valid record types, cursor, and a limit between 1 and 200." }, { status: 400 });
  }
  if (types.length === 0) return Response.json({ records: [], nextCursor: null });
  const bindings: unknown[] = [owner, ...types];
  const typeSlots = types.map(() => "?").join(",");
  let cursorClause = "";
  if (cursor) {
    cursorClause = " AND (committed_at < ? OR (committed_at = ? AND id < ?))";
    bindings.push(cursor.committedAt, cursor.committedAt, cursor.id);
  }
  bindings.push(limit + 1);
  const result = await (await ensureLabSchema()).prepare(
    `SELECT id, record_type, parent_id, title, payload_json, committed_at, created_at
     FROM lab_records WHERE owner_id = ? AND record_type IN (${typeSlots})${cursorClause}
     ORDER BY committed_at DESC, id DESC LIMIT ?`,
  ).bind(...bindings).all<DbLabRecord>();
  const rows = result.results ?? [];
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  let events: DbLabEvent[] = [];
  if (includeEvents && page.length) {
    const slots = page.map(() => "?").join(",");
    const eventResult = await (await ensureLabSchema()).prepare(
      `SELECT id, record_id, event_type, event_json, occurred_at, created_at
       FROM lab_events WHERE owner_id = ? AND record_id IN (${slots}) ORDER BY occurred_at ASC, id ASC`,
    ).bind(owner, ...page.map((record) => record.id)).all<DbLabEvent>();
    events = eventResult.results ?? [];
  }
  return Response.json({
    records: page.map(mapLabRecord),
    ...(includeEvents ? { events: events.map(mapLabEvent) } : {}),
    nextCursor: hasMore && page.length ? encodeRecordCursor(page[page.length - 1]) : null,
  });
}
