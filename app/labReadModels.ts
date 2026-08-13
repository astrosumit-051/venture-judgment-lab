export type DbLabRecord = {
  id: string;
  record_type: string;
  parent_id: string | null;
  title: string;
  payload_json: string;
  committed_at: string;
  created_at: string;
};

export type DbLabEvent = {
  id: string;
  record_id: string;
  event_type: string;
  event_json: string;
  occurred_at: string;
  created_at: string;
};

export type LabRecordReadModel = ReturnType<typeof mapLabRecord>;
export type LabEventReadModel = ReturnType<typeof mapLabEvent>;

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function mapLabRecord(record: DbLabRecord) {
  return {
    id: record.id,
    recordType: record.record_type,
    parentId: record.parent_id,
    title: record.title,
    payload: parseObject(record.payload_json),
    committedAt: record.committed_at,
    createdAt: record.created_at,
  };
}

export function mapLabEvent(event: DbLabEvent) {
  return {
    id: event.id,
    recordId: event.record_id,
    eventType: event.event_type,
    eventData: parseObject(event.event_json),
    occurredAt: event.occurred_at,
    createdAt: event.created_at,
  };
}

export function encodeRecordCursor(record: Pick<DbLabRecord, "committed_at" | "id">): string {
  return btoa(JSON.stringify([record.committed_at, record.id]));
}

export function decodeRecordCursor(value: string | null): { committedAt: string; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(atob(value));
    if (!Array.isArray(parsed) || parsed.length !== 2 || parsed.some((item) => typeof item !== "string" || !item)) return null;
    return { committedAt: parsed[0], id: parsed[1] };
  } catch {
    return null;
  }
}

export function boundedPageSize(value: string | null, fallback: number, maximum: number): number | null {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : null;
}

export function requestedRecordTypes(value: string | null): string[] | null {
  if (!value) return [];
  const types = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
  if (types.length > 20 || types.some((type) => !/^[a-z][a-z0-9_]{0,79}$/.test(type))) return null;
  return types;
}
