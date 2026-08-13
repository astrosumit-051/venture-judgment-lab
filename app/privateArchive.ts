export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
import { canonicalJson as canonicalizeJson, sha256Hex } from "./canonicalJson.ts";
export { canonicalJson as canonicalizeJson, sha256Hex } from "./canonicalJson.ts";

export const PRIVATE_ARCHIVE_SCHEMA_VERSION = "venture-judgment-lab.private-archive.v1";
export const PRIVATE_ARCHIVE_MAX_ROWS = 10_000;

export const PRIVATE_ARCHIVE_SECTIONS = [
  "records",
  "events",
  "profiles",
  "assignments",
  "automationRuns",
] as const;

export type PrivateArchiveSection = typeof PRIVATE_ARCHIVE_SECTIONS[number];
type ArchiveRow = Record<string, JsonValue>;

export type PrivateArchiveBoundary = { createdAt: string; id: string } | null;
export type PrivateArchiveCursor = {
  runId: string;
  runKey: string;
  bounds: Record<PrivateArchiveSection, PrivateArchiveBoundary>;
};
export type PrivateArchivePayload = {
  schemaVersion: typeof PRIVATE_ARCHIVE_SCHEMA_VERSION;
  ownerFingerprint: string;
  cursor: PrivateArchiveCursor;
  counts: Record<PrivateArchiveSection, number>;
  sectionChecksums: Record<PrivateArchiveSection, string>;
  sections: Record<PrivateArchiveSection, ArchiveRow[]>;
};
export type PrivateArchiveBundle = { payload: PrivateArchivePayload; payloadDigest: string };

type D1ResultLike<Row> = { success?: boolean; results?: Row[] };

const SECTION_QUERIES: ReadonlyArray<{ section: PrivateArchiveSection; table: string; rowsSql: string }> = [
  {
    section: "records",
    table: "lab_records",
    rowsSql: `SELECT id, record_type AS recordType, parent_id AS parentId, title,
      payload_json AS payloadJson, committed_at AS committedAt, created_at AS createdAt
      FROM lab_records AS rows`,
  },
  {
    section: "events",
    table: "lab_events",
    rowsSql: `SELECT id, record_id AS recordId, event_type AS eventType,
      event_json AS eventJson, occurred_at AS occurredAt, created_at AS createdAt
      FROM lab_events AS rows`,
  },
  {
    section: "profiles",
    table: "lab_profiles",
    rowsSql: `SELECT id, profile_version AS profileVersion, timezone,
      practice_mode AS practiceMode, expected_weekdays_json AS expectedWeekdaysJson,
      notification_preference AS notificationPreference,
      effective_learner_date AS effectiveLearnerDate,
      automation_binding AS automationBinding, created_at AS createdAt
      FROM lab_profiles AS rows`,
  },
  {
    section: "assignments",
    table: "lab_assignments",
    rowsSql: `SELECT id, learner_date AS learnerDate, profile_id AS profileId,
      automation_run_id AS automationRunId, evidence_record_id AS evidenceRecordId,
      state, payload_checksum AS payloadChecksum, created_at AS createdAt
      FROM lab_assignments AS rows`,
  },
  {
    section: "automationRuns",
    table: "lab_automation_runs",
    rowsSql: `SELECT id, operator_kind AS operatorKind, scheduled_for AS scheduledFor,
      profile_id AS profileId, input_checksum AS inputChecksum,
      evidence_record_id AS evidenceRecordId, notification_intent AS notificationIntent,
      created_at AS createdAt
      FROM lab_automation_runs AS rows`,
  },
];

function validRunKey(value: string): boolean {
  return /^[a-z][a-z0-9-]{0,63}\|\d{4}-\d{2}-\d{2}$/.test(value);
}

function isBoundary(value: unknown): value is PrivateArchiveBoundary {
  if (value === null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.createdAt === "string" && row.createdAt.length > 0
    && typeof row.id === "string" && row.id.length > 0
    && Object.keys(row).every((key) => key === "createdAt" || key === "id");
}

function isFixedCursor(value: unknown, runId: string, runKey: string): value is PrivateArchiveCursor {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const cursor = value as Record<string, unknown>;
  if (cursor.runId !== runId || cursor.runKey !== runKey || !cursor.bounds || typeof cursor.bounds !== "object" || Array.isArray(cursor.bounds)) return false;
  const bounds = cursor.bounds as Record<string, unknown>;
  return Object.keys(cursor).every((key) => ["runId", "runKey", "bounds"].includes(key))
    && Object.keys(bounds).length === PRIVATE_ARCHIVE_SECTIONS.length
    && PRIVATE_ARCHIVE_SECTIONS.every((section) => isBoundary(bounds[section]));
}

function boundedWhere(): string {
  return `rows.owner_id = ? AND (
    rows.created_at < (SELECT created_at FROM boundary)
    OR (rows.created_at = (SELECT created_at FROM boundary) AND rows.id <= (SELECT id FROM boundary))
  )`;
}

export async function buildPrivateArchiveExport(
  db: D1Database,
  owner: string,
  runKey: string,
  fixedCursor?: unknown,
): Promise<PrivateArchiveBundle | null> {
  if (!validRunKey(runKey)) throw new TypeError("A bounded canonical runKey is required.");
  const run = await db.prepare(
    `SELECT runs.id
     FROM lab_automation_runs AS runs
     JOIN lab_records AS evidence ON evidence.id = runs.evidence_record_id
       AND evidence.owner_id = runs.owner_id
     WHERE runs.owner_id = ?
       AND json_extract(evidence.payload_json, '$.runKey') = ?
     LIMIT 1`,
  ).bind(owner, runKey).first<{ id: string }>();
  if (!run) return null;

  if (fixedCursor !== undefined && !isFixedCursor(fixedCursor, run.id, runKey)) {
    throw new TypeError("The private archive cursor is invalid for this owner-bound run.");
  }
  const requestedBounds = fixedCursor === undefined ? null : fixedCursor.bounds;
  const statements = SECTION_QUERIES.flatMap(({ table, rowsSql }, index) => {
    const boundary = requestedBounds?.[PRIVATE_ARCHIVE_SECTIONS[index]];
    const boundarySql = boundary
      ? `SELECT created_at, id FROM ${table} WHERE owner_id = ? AND created_at = ? AND id = ? LIMIT 1`
      : boundary === null
        ? `SELECT created_at, id FROM ${table} WHERE owner_id = ? AND 0 LIMIT 1`
        : `SELECT created_at, id FROM ${table} WHERE owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`;
    const boundaryBindings = boundary ? [owner, boundary.createdAt, boundary.id] : [owner];
    const countSql = `WITH boundary AS (${boundarySql}) SELECT COUNT(*) AS count FROM ${table} AS rows WHERE ${boundedWhere()}`;
    const boundedRowsSql = `WITH boundary AS (${boundarySql}) ${rowsSql} WHERE ${boundedWhere()}
      ORDER BY rows.created_at ASC, rows.id ASC LIMIT ${PRIVATE_ARCHIVE_MAX_ROWS + 1}`;
    return [
      db.prepare(boundarySql).bind(...boundaryBindings),
      db.prepare(countSql).bind(...boundaryBindings, owner),
      db.prepare(boundedRowsSql).bind(...boundaryBindings, owner),
    ];
  });
  const results = await db.batch(statements) as Array<D1ResultLike<ArchiveRow>>;
  if (results.length !== statements.length || results.some((result) => result.success === false)) {
    throw new Error("The bounded private archive batch did not complete.");
  }

  const counts = {} as Record<PrivateArchiveSection, number>;
  const sections = {} as Record<PrivateArchiveSection, ArchiveRow[]>;
  const bounds = {} as Record<PrivateArchiveSection, PrivateArchiveBoundary>;
  for (let index = 0; index < SECTION_QUERIES.length; index += 1) {
    const section = SECTION_QUERIES[index].section;
    const boundaryRow = results[index * 3]?.results?.[0];
    bounds[section] = boundaryRow
      ? { createdAt: String(boundaryRow.created_at), id: String(boundaryRow.id) }
      : null;
    if (requestedBounds && canonicalizeJson(bounds[section]) !== canonicalizeJson(requestedBounds[section])) {
      throw new Error(`Private archive ${section} cursor boundary no longer exists.`);
    }
    const countValue = results[index * 3 + 1]?.results?.[0]?.count;
    const count = typeof countValue === "number" ? countValue : Number(countValue);
    const rows = results[index * 3 + 2]?.results ?? [];
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`Private archive ${section} count did not reconcile.`);
    }
    if (count > PRIVATE_ARCHIVE_MAX_ROWS) throw new RangeError(`Private archive ${section} exceeds the ${PRIVATE_ARCHIVE_MAX_ROWS}-row bound.`);
    if (count !== rows.length) throw new Error(`Private archive ${section} count did not reconcile.`);
    counts[section] = count;
    sections[section] = rows;
  }
  const totalRows = PRIVATE_ARCHIVE_SECTIONS.reduce((total, section) => total + counts[section], 0);
  if (totalRows > PRIVATE_ARCHIVE_MAX_ROWS) throw new RangeError(`Private archive exceeds the ${PRIVATE_ARCHIVE_MAX_ROWS}-row bound.`);

  const sectionChecksums = {} as Record<PrivateArchiveSection, string>;
  for (const section of PRIVATE_ARCHIVE_SECTIONS) {
    sectionChecksums[section] = await sha256Hex(canonicalizeJson(sections[section]));
  }
  const payload: PrivateArchivePayload = {
    schemaVersion: PRIVATE_ARCHIVE_SCHEMA_VERSION,
    ownerFingerprint: await sha256Hex(owner),
    cursor: { runId: run.id, runKey, bounds },
    counts,
    sectionChecksums,
    sections,
  };
  return { payload, payloadDigest: await sha256Hex(canonicalizeJson(payload)) };
}

export function archivePreservedEventData(bundle: PrivateArchiveBundle): Record<string, JsonValue> {
  return {
    runKey: bundle.payload.cursor.runKey,
    cursor: bundle.payload.cursor,
    counts: bundle.payload.counts,
    digest: bundle.payloadDigest,
  };
}

export function matchesArchiveAcknowledgement(existingJson: string, submitted: unknown): boolean {
  try {
    const existing = JSON.parse(existingJson) as unknown;
    return canonicalizeJson(existing) === canonicalizeJson(submitted);
  } catch {
    return false;
  }
}
