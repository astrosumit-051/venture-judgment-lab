import { verifyAutomationBearer } from "@/app/automationAuth";
import {
  archivePreservedEventData,
  buildPrivateArchiveExport,
  canonicalizeJson,
  matchesArchiveAcknowledgement,
  type PrivateArchiveBundle,
} from "@/app/privateArchive";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

type ExistingEvent = { id: string; event_json: string; occurred_at: string };
type AutomationRun = { id: string; evidence_record_id: string; created_at: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, max = 100): string {
  return typeof value === "string" && value.length <= max ? value.trim() : "";
}

async function registeredExportOwner(db: D1Database, request: Request): Promise<string | null> {
  const identity = await verifyAutomationBearer(request);
  if (!identity) return null;
  const registration = await db.prepare(
    `SELECT registration.owner_id
     FROM lab_records AS registration, json_each(registration.payload_json, '$.capabilities') AS capability
     WHERE registration.record_type = 'lab_automation_registration'
       AND json_extract(registration.payload_json, '$.automationKind') = 'venture_judgment_lab'
       AND json_extract(registration.payload_json, '$.tokenFingerprint') = ?
       AND json_extract(registration.payload_json, '$.status') = 'active'
       AND capability.value = 'private_export'
     LIMIT 1`,
  ).bind(identity.fingerprint).first<{ owner_id: string }>();
  return registration?.owner_id ?? null;
}

function exportFailure(error: unknown): Response {
  if (error instanceof TypeError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof RangeError) return Response.json({ error: error.message }, { status: 413 });
  return Response.json({ error: "The bounded private export could not be produced." }, { status: 503 });
}

async function bundleForRequest(db: D1Database, owner: string, runKey: string, cursor?: unknown): Promise<PrivateArchiveBundle | Response> {
  try {
    const bundle = await buildPrivateArchiveExport(db, owner, runKey, cursor);
    return bundle ?? Response.json({ error: "The owner-bound automation run was not found." }, { status: 404 });
  } catch (error) {
    return exportFailure(error);
  }
}

export async function GET(request: Request) {
  const db = await ensureLabSchema();
  const owner = await registeredExportOwner(db, request);
  if (!owner) return Response.json({ error: "Valid private-export authorization is required." }, { status: 401 });
  const runKey = text(new URL(request.url).searchParams.get("runKey"), 80);
  const run = await automationRunForKey(db, owner, runKey);
  if (!run) return Response.json({ error: "The owner-bound automation run was not found." }, { status: 404 });
  const existing = await existingArchiveEvent(db, owner, run.evidence_record_id);
  let fixedCursor: unknown;
  if (existing) {
    try { fixedCursor = JSON.parse(existing.event_json).cursor; } catch { return Response.json({ error: "The preserved archive manifest is invalid." }, { status: 409 }); }
  }
  const bundle = await bundleForRequest(db, owner, runKey, fixedCursor);
  if (bundle instanceof Response) return bundle;
  return Response.json({ ...bundle, retrievedAt: new Date().toISOString() });
}

function acknowledgementMatches(body: Record<string, unknown>, bundle: PrivateArchiveBundle): boolean {
  if (Object.keys(body).some((key) => !new Set(["runKey", "cursor", "counts", "digest"]).has(key))) return false;
  const expected = archivePreservedEventData(bundle);
  try {
    return text(body.runKey, 80) === bundle.payload.cursor.runKey
      && text(body.digest, 64) === bundle.payloadDigest
      && canonicalizeJson(body.cursor) === canonicalizeJson(expected.cursor)
      && canonicalizeJson(body.counts) === canonicalizeJson(expected.counts);
  } catch {
    return false;
  }
}

async function existingArchiveEvent(db: D1Database, owner: string, recordId: string): Promise<ExistingEvent | null> {
  return db.prepare(
    `SELECT id, event_json, occurred_at FROM lab_events
     WHERE owner_id = ? AND record_id = ? AND event_type = 'archive_preserved' LIMIT 1`,
  ).bind(owner, recordId).first<ExistingEvent>();
}

async function automationRunForKey(db: D1Database, owner: string, runKey: string): Promise<AutomationRun | null> {
  return db.prepare(
    `SELECT runs.id, runs.evidence_record_id, runs.created_at
     FROM lab_automation_runs AS runs
     JOIN lab_records AS evidence ON evidence.id = runs.evidence_record_id
       AND evidence.owner_id = runs.owner_id
     WHERE runs.owner_id = ? AND json_extract(evidence.payload_json, '$.runKey') = ?
     LIMIT 1`,
  ).bind(owner, runKey).first<AutomationRun>();
}

function sameEvent(existing: ExistingEvent, eventData: Record<string, unknown>): boolean {
  return matchesArchiveAcknowledgement(existing.event_json, eventData);
}

export async function POST(request: Request) {
  const db = await ensureLabSchema();
  const owner = await registeredExportOwner(db, request);
  if (!owner) return Response.json({ error: "Valid private-export authorization is required." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!isObject(body)) return Response.json({ error: "A bounded archive acknowledgement is required." }, { status: 400 });
  const runKey = text(body.runKey, 80);
  const run = await automationRunForKey(db, owner, runKey);
  if (!run) return Response.json({ error: "The owner-bound automation run was not found." }, { status: 404 });
  if (body.operation === "archive_failed") {
    if (Object.keys(body).some((key) => !new Set(["operation", "runKey", "failureKind", "summary", "nextAction"]).has(key))) {
      return Response.json({ error: "Archive failure evidence contains an undeclared field." }, { status: 400 });
    }
    const failureKind = text(body.failureKind, 80);
    const summary = text(body.summary, 500);
    const nextAction = text(body.nextAction, 500);
    if (!new Set(["publication_failed", "acknowledgement_failed", "verification_failed"]).has(failureKind) || !summary || !nextAction) {
      return Response.json({ error: "A bounded archive failure kind, summary, and next action are required." }, { status: 400 });
    }
    const eventId = crypto.randomUUID();
    const occurredAt = new Date().toISOString();
    await db.prepare(
      `INSERT INTO lab_events
       (id, owner_id, record_id, event_type, event_json, occurred_at, created_at)
       VALUES (?, ?, ?, 'failed', ?, ?, ?)`,
    ).bind(eventId, owner, run.evidence_record_id, JSON.stringify({
      stage: "private_archive",
      failureKind,
      summary,
      nextAction,
      runKey,
      archivePreserved: false,
    }), occurredAt, occurredAt).run();
    return Response.json({ id: eventId, occurredAt, runKey, failureKind }, { status: 201 });
  }
  let existing = await existingArchiveEvent(db, owner, run.evidence_record_id);
  if (existing) {
    let stored: unknown;
    try { stored = JSON.parse(existing.event_json); } catch { stored = null; }
    if (!isObject(stored) || !sameEvent(existing, body)) {
      return Response.json({ error: "This run already has a different archive acknowledgement." }, { status: 409 });
    }
    return Response.json({ id: existing.id, occurredAt: existing.occurred_at, idempotent: true, ...stored });
  }

  const bundle = await bundleForRequest(db, owner, runKey, body.cursor);
  if (bundle instanceof Response) return bundle;
  if (!acknowledgementMatches(body, bundle)) {
    return Response.json({ error: "Archive cursor, counts, or digest do not match the fixed export." }, { status: 409 });
  }

  const eventData = archivePreservedEventData(bundle);
  const eventId = crypto.randomUUID();
  const occurredAt = new Date().toISOString();
  try {
    await db.prepare(
      `INSERT INTO lab_events
       (id, owner_id, record_id, event_type, event_json, occurred_at, created_at)
       VALUES (?, ?, ?, 'archive_preserved', ?, ?, ?)`,
    ).bind(eventId, owner, run.evidence_record_id, JSON.stringify(eventData), occurredAt, occurredAt).run();
  } catch {
    existing = await existingArchiveEvent(db, owner, run.evidence_record_id);
    if (!existing || !sameEvent(existing, eventData)) {
      return Response.json({ error: "This run already has a different archive acknowledgement." }, { status: 409 });
    }
    return Response.json({ id: existing.id, occurredAt: existing.occurred_at, idempotent: true, ...eventData });
  }
  return Response.json({ id: eventId, occurredAt, idempotent: false, ...eventData }, { status: 201 });
}
