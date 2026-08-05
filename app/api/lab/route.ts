import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

type DbRecord = {
  id: string;
  record_type: string;
  parent_id: string | null;
  title: string;
  payload_json: string;
  committed_at: string;
  created_at: string;
};

type DbEvent = {
  id: string;
  record_id: string;
  event_type: string;
  event_json: string;
  occurred_at: string;
  created_at: string;
};

const allowedRecordTypes = new Set([
  "daily_brief",
  "snapshot_judgment",
  "weekly_underwrite",
]);

const allowedEventTypes = new Set([
  "reflection",
  "source_status",
  "metadata_correction",
  "coach_feedback",
  "later_usefulness",
]);

async function ownerId(): Promise<string | null> {
  const user = await getChatGPTUser();
  if (user) return user.userId;
  return process.env.NODE_ENV === "development" ? "local-learner" : null;
}

function parseJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cleanText(value: unknown, maxLength = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET() {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });

  const db = await ensureLabSchema();
  const [recordsResult, eventsResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, record_type, parent_id, title, payload_json, committed_at, created_at
         FROM lab_records
         WHERE owner_id = ?
         ORDER BY committed_at DESC`,
      )
      .bind(owner)
      .all<DbRecord>(),
    db
      .prepare(
        `SELECT id, record_id, event_type, event_json, occurred_at, created_at
         FROM lab_events
         WHERE owner_id = ?
         ORDER BY occurred_at DESC`,
      )
      .bind(owner)
      .all<DbEvent>(),
  ]);

  return Response.json({
    records: (recordsResult.results ?? []).map((record: DbRecord) => ({
      id: record.id,
      recordType: record.record_type,
      parentId: record.parent_id,
      title: record.title,
      payload: parseJson(record.payload_json),
      committedAt: record.committed_at,
      createdAt: record.created_at,
    })),
    events: (eventsResult.results ?? []).map((event: DbEvent) => ({
      id: event.id,
      recordId: event.record_id,
      eventType: event.event_type,
      eventData: parseJson(event.event_json),
      occurredAt: event.occurred_at,
      createdAt: event.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = await ensureLabSchema();
  const operation = cleanText(body.operation, 40);

  if (operation === "commit_record") {
    const recordType = cleanText(body.recordType, 60);
    const title = cleanText(body.title, 180);
    const parentId = cleanText(body.parentId, 80) || null;
    const payload = body.payload;

    if (!allowedRecordTypes.has(recordType) || !title || !payload || typeof payload !== "object") {
      return Response.json({ error: "A valid record type, title, and payload are required." }, { status: 400 });
    }

    if (parentId) {
      const parent = await db
        .prepare("SELECT id FROM lab_records WHERE id = ? AND owner_id = ?")
        .bind(parentId, owner)
        .first<{ id: string }>();
      if (!parent) return Response.json({ error: "The linked record was not found." }, { status: 404 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO lab_records
         (id, owner_id, record_type, parent_id, title, payload_json, committed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, owner, recordType, parentId, title, JSON.stringify(payload), now, now)
      .run();

    return Response.json({ id, committedAt: now }, { status: 201 });
  }

  if (operation === "append_event") {
    const recordId = cleanText(body.recordId, 80);
    const eventType = cleanText(body.eventType, 60);
    const eventData = body.eventData;

    if (!recordId || !allowedEventTypes.has(eventType) || !eventData || typeof eventData !== "object") {
      return Response.json({ error: "A valid record, event type, and event body are required." }, { status: 400 });
    }

    const parent = await db
      .prepare("SELECT id FROM lab_records WHERE id = ? AND owner_id = ?")
      .bind(recordId, owner)
      .first<{ id: string }>();
    if (!parent) return Response.json({ error: "The record was not found." }, { status: 404 });

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO lab_events
         (id, owner_id, record_id, event_type, event_json, occurred_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, owner, recordId, eventType, JSON.stringify(eventData), now, now)
      .run();

    return Response.json({ id, occurredAt: now }, { status: 201 });
  }

  return Response.json({ error: "Unsupported operation." }, { status: 400 });
}
