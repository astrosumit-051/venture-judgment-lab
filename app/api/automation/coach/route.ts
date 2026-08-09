import { verifyAutomationBearer } from "@/app/automationAuth";
import { dateInTimeZone } from "@/app/calibration";
import {
  boundedCoachSource,
  COACH_ERROR_KINDS,
  validateCoachPayload,
  type CoachDimension,
} from "@/app/coach";
import { evaluateOwnerMastery, masteryEvidencePayload } from "@/app/coachPersistence";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

function parseJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function text(value: unknown, max = 20_000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function insertRecord(db: D1Database, values: {
  id: string;
  owner: string;
  recordType: string;
  parentId: string;
  title: string;
  payload: Record<string, unknown>;
  now: string;
}) {
  return db.prepare(
    `INSERT INTO lab_records
     (id, owner_id, record_type, parent_id, title, payload_json, committed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    values.id,
    values.owner,
    values.recordType,
    values.parentId,
    values.title,
    JSON.stringify(values.payload),
    values.now,
    values.now,
  );
}

async function registeredOwner(db: D1Database, request: Request): Promise<string | null> {
  const identity = await verifyAutomationBearer(request);
  if (!identity) return null;
  const registration = await db.prepare(
    `SELECT owner_id FROM lab_records WHERE record_type = 'opportunity_monitor_registration'
     AND json_extract(payload_json, '$.tokenFingerprint') = ?
     AND json_extract(payload_json, '$.status') = 'active' LIMIT 1`,
  ).bind(identity.fingerprint).first<{ owner_id: string }>();
  return registration?.owner_id ?? null;
}

export async function GET(request: Request) {
  const db = await ensureLabSchema();
  const owner = await registeredOwner(db, request);
  if (!owner) return Response.json({ error: "Valid registered automation authorization is required." }, { status: 401 });
  const queue = await db.prepare(
    `SELECT request.id, request.parent_id, request.title, request.payload_json, request.committed_at,
            source.record_type AS source_type, source.title AS source_title, source.payload_json AS source_payload_json,
            source.committed_at AS source_committed_at
     FROM lab_records request
     JOIN lab_records source ON source.id = request.parent_id AND source.owner_id = request.owner_id
     WHERE request.owner_id = ? AND request.record_type = 'coach_request'
     AND NOT EXISTS (
       SELECT 1 FROM lab_records feedback
       WHERE feedback.owner_id = request.owner_id AND feedback.record_type = 'coach_feedback' AND feedback.parent_id = request.id
     )
     ORDER BY request.committed_at ASC LIMIT 20`,
  ).bind(owner).all<{
    id: string;
    parent_id: string;
    title: string;
    payload_json: string;
    committed_at: string;
    source_type: string;
    source_title: string;
    source_payload_json: string;
    source_committed_at: string;
  }>();
  const queuedDimensions = [...new Set((queue.results ?? []).map((row) => text(parseJson(row.payload_json).dimension, 80)).filter(Boolean))];
  const feedbackHistory = queuedDimensions.length === 0
    ? { results: [] as { payload_json: string; committed_at: string }[] }
    : await db.prepare(
    `SELECT payload_json, committed_at FROM lab_records WHERE owner_id = ? AND record_type = 'coach_feedback'
     AND json_extract(payload_json, '$.dimension') IN (${queuedDimensions.map(() => "?").join(", ")})
     ORDER BY committed_at ASC`,
  ).bind(owner, ...queuedDimensions).all<{ payload_json: string; committed_at: string }>();
  const recurringByPattern = new Map<string, { dimension: string; kind: string; patternKey: string; count: number; latestDiagnosis: string; latestAt: string }>();
  for (const row of feedbackHistory.results ?? []) {
    const payload = parseJson(row.payload_json);
    const dimension = text(payload.dimension, 80);
    const kind = text(payload.recurringErrorKind, 100);
    if (!dimension || !kind) continue;
    const patternKey = kind === "other_bounded_pattern" ? text(payload.recurringErrorPatternKey, 100) : kind;
    if (!patternKey) continue;
    const key = `${dimension}|${kind}|${patternKey}`;
    const prior = recurringByPattern.get(key);
    recurringByPattern.set(key, {
      dimension,
      kind,
      patternKey,
      count: (prior?.count ?? 0) + 1,
      latestDiagnosis: text(payload.recurringError, 5000),
      latestAt: row.committed_at,
    });
  }
  return Response.json({
    errorKinds: COACH_ERROR_KINDS,
    recurringPatterns: [...recurringByPattern.values()],
    queue: (queue.results ?? []).map((row) => {
      const requestPayload = parseJson(row.payload_json);
      return {
        request: {
          id: row.id,
          title: row.title,
          committedAt: row.committed_at,
          dimension: text(requestPayload.dimension, 80),
          companyIdentity: text(requestPayload.companyIdentity, 180),
          focusQuestion: text(requestPayload.focusQuestion, 5000),
          learnerSelfDiagnosis: text(requestPayload.learnerSelfDiagnosis, 5000),
        },
        source: {
          id: row.parent_id,
          recordType: row.source_type,
          title: row.source_title,
          committedAt: row.source_committed_at,
          evidence: boundedCoachSource(row.source_type, parseJson(row.source_payload_json)),
        },
      };
    }),
  });
}

export async function POST(request: Request) {
  const db = await ensureLabSchema();
  const owner = await registeredOwner(db, request);
  if (!owner) return Response.json({ error: "Valid registered automation authorization is required." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!isObject(body) || !isObject(body.feedback) || Object.keys(body).some((key) => !new Set(["requestId", "feedback"]).has(key))) {
    return Response.json({ error: "A bounded requestId and feedback object are required." }, { status: 400 });
  }
  const requestId = text(body.requestId, 80);
  const requestRow = await db.prepare(
    `SELECT id, parent_id, title, payload_json, committed_at FROM lab_records
     WHERE id = ? AND owner_id = ? AND record_type = 'coach_request' LIMIT 1`,
  ).bind(requestId, owner).first<{ id: string; parent_id: string; title: string; payload_json: string; committed_at: string }>();
  if (!requestRow) return Response.json({ error: "The queued Coach Request was not found." }, { status: 404 });
  const duplicate = await db.prepare(
    "SELECT id FROM lab_records WHERE owner_id = ? AND record_type = 'coach_feedback' AND parent_id = ? LIMIT 1",
  ).bind(owner, requestId).first<{ id: string }>();
  if (duplicate) return Response.json({ error: "This Coach Request already has immutable feedback." }, { status: 409 });

  const requestPayload = parseJson(requestRow.payload_json);
  const submitted = body.feedback;
  const submittedKeys = new Set([
    "unsupportedInference", "evidenceGap", "recurringError", "recurringErrorKind", "recurringErrorPatternKey", "requiredRevision", "nextDifficultyAdjustment",
    "competingInterpretation", "benchmark", "foundationalError", "genuineDisconfirmingCase",
    "disconfirmingCaseEvidence", "privacyConfirmed",
  ]);
  if (Object.keys(submitted).some((key) => !submittedKeys.has(key))) {
    return Response.json({ error: "Coach Feedback contains an undeclared field; grades, scores, and model answers are rejected." }, { status: 400 });
  }
  const dimension = text(requestPayload.dimension, 80) as CoachDimension;
  const recurringError = text(submitted.recurringError, 5000);
  const recurringErrorKind = text(submitted.recurringErrorKind, 100);
  const recurringErrorPatternKey = text(submitted.recurringErrorPatternKey, 100);
  const recurrenceKey = recurringErrorKind === "other_bounded_pattern" ? recurringErrorPatternKey : recurringErrorKind;
  const priorSameError = await db.prepare(
    `SELECT count(*) AS count FROM lab_records WHERE owner_id = ? AND record_type = 'coach_feedback'
     AND json_extract(payload_json, '$.dimension') = ?
     AND json_extract(payload_json, '$.recurringErrorKind') = ?
     AND CASE WHEN ? = 'other_bounded_pattern'
       THEN json_extract(payload_json, '$.recurringErrorPatternKey') = ?
       ELSE 1 = 1 END`,
  ).bind(owner, dimension, recurringErrorKind, recurringErrorKind, recurrenceKey).first<{ count: number }>();
  const timezone = text(requestPayload.timezone, 100);
  const respondedOn = dateInTimeZone(new Date(), timezone);
  const feedbackId = crypto.randomUUID();
  const feedbackPayload: Record<string, unknown> = {
    requestId,
    sourceRecordId: text(requestPayload.sourceRecordId, 80),
    dimension,
    companyIdentity: text(requestPayload.companyIdentity, 180),
    respondedOn,
    timezone,
    feedbackKey: requestId,
    unsupportedInference: submitted.unsupportedInference,
    evidenceGap: submitted.evidenceGap,
    recurringError,
    recurringErrorKind,
    ...(recurringErrorKind === "other_bounded_pattern" ? { recurringErrorPatternKey } : {}),
    recurringErrorCount: Number(priorSameError?.count ?? 0) + 1,
    requiredRevision: submitted.requiredRevision,
    nextDifficultyAdjustment: submitted.nextDifficultyAdjustment,
    competingInterpretation: submitted.competingInterpretation,
    benchmark: submitted.benchmark,
    foundationalError: submitted.foundationalError,
    genuineDisconfirmingCase: submitted.genuineDisconfirmingCase,
    disconfirmingCaseEvidence: submitted.disconfirmingCaseEvidence,
    privacyConfirmed: submitted.privacyConfirmed,
  };
  const feedbackError = validateCoachPayload("coach_feedback", feedbackPayload, respondedOn);
  if (feedbackError) return Response.json({ error: feedbackError }, { status: 400 });

  const pendingCommittedAt = new Date().toISOString();
  const evaluation = await evaluateOwnerMastery(db, owner, dimension, [{
    id: feedbackId,
    recordType: "coach_feedback",
    parentId: requestId,
    title: `Coach Feedback — ${dimension}`,
    payload: feedbackPayload,
    committedAt: pendingCommittedAt,
  }]);
  const masteryId = crypto.randomUUID();
  const masteryPayload = masteryEvidencePayload({ evaluation, triggerRecordId: feedbackId, triggerRecordType: "coach_feedback", evaluatedOn: respondedOn, timezone });
  const masteryError = validateCoachPayload("mastery_evidence", masteryPayload, respondedOn);
  if (masteryError) return Response.json({ error: masteryError }, { status: 400 });
  const now = new Date().toISOString();
  await db.batch([
    insertRecord(db, { id: feedbackId, owner, recordType: "coach_feedback", parentId: requestId, title: `Coach Feedback — ${dimension.replaceAll("_", " ")}`, payload: feedbackPayload, now }),
    insertRecord(db, { id: masteryId, owner, recordType: "mastery_evidence", parentId: feedbackId, title: `Mastery Evidence — ${dimension.replaceAll("_", " ")}`, payload: masteryPayload, now }),
  ]);
  return Response.json({
    feedbackId,
    masteryEvidenceId: masteryId,
    recurringErrorCount: feedbackPayload.recurringErrorCount,
    evidenceState: evaluation.evidenceState,
    remainingGaps: evaluation.remainingGaps,
  }, { status: 201 });
}
