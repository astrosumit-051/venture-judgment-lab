import { verifyAutomationBearer } from "@/app/automationAuth";
import { dateInTimeZone } from "@/app/calibration";
import {
  boundedCoachSource,
  evaluateMasteryEvidence,
  validateCoachPayload,
  type CoachDimension,
  type MasteryAttempt,
} from "@/app/coach";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

type DbRecord = {
  id: string;
  record_type: string;
  parent_id: string | null;
  title: string;
  payload_json: string;
  committed_at: string;
};

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

async function coachRows(db: D1Database, owner: string): Promise<DbRecord[]> {
  const result = await db.prepare(
    `SELECT id, record_type, parent_id, title, payload_json, committed_at
     FROM lab_records WHERE owner_id = ?
     AND record_type IN ('coach_request', 'coach_feedback', 'revision_attempt', 'mastery_evidence')
     ORDER BY committed_at ASC`,
  ).bind(owner).all<DbRecord>();
  return result.results ?? [];
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
  return Response.json({
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
    "unsupportedInference", "evidenceGap", "recurringError", "requiredRevision", "nextDifficultyAdjustment",
    "competingInterpretation", "benchmark", "foundationalError", "genuineDisconfirmingCase",
    "disconfirmingCaseEvidence", "privacyConfirmed",
  ]);
  if (Object.keys(submitted).some((key) => !submittedKeys.has(key))) {
    return Response.json({ error: "Coach Feedback contains an undeclared field; grades, scores, and model answers are rejected." }, { status: 400 });
  }
  const dimension = text(requestPayload.dimension, 80) as CoachDimension;
  const recurringError = text(submitted.recurringError, 5000);
  const recurringErrorKey = recurringError.toLocaleLowerCase("en-US").replace(/\s+/g, " ");
  const priorSameError = await db.prepare(
    `SELECT count(*) AS count FROM lab_records WHERE owner_id = ? AND record_type = 'coach_feedback'
     AND json_extract(payload_json, '$.dimension') = ?
     AND json_extract(payload_json, '$.recurringErrorKey') = ?`,
  ).bind(owner, dimension, recurringErrorKey).first<{ count: number }>();
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
    recurringErrorKey,
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

  const rows = await coachRows(db, owner);
  const requests = new Map(rows.filter((row) => row.record_type === "coach_request").map((row) => [row.id, row]));
  const revisions = new Map(rows.filter((row) => row.record_type === "revision_attempt").map((row) => [row.parent_id, row]));
  const feedbackRows: DbRecord[] = [
    ...rows.filter((row) => row.record_type === "coach_feedback"),
    { id: feedbackId, record_type: "coach_feedback", parent_id: requestId, title: `Coach Feedback — ${dimension}`, payload_json: JSON.stringify(feedbackPayload), committed_at: new Date().toISOString() },
  ];
  const attempts: MasteryAttempt[] = feedbackRows.flatMap((feedback) => {
    const feedbackData = parseJson(feedback.payload_json);
    if (text(feedbackData.dimension, 80) !== dimension || !feedback.parent_id) return [];
    const linkedRequest = requests.get(feedback.parent_id) ?? (feedback.parent_id === requestId ? {
      id: requestId,
      record_type: "coach_request",
      parent_id: requestRow.parent_id,
      title: requestRow.title,
      payload_json: requestRow.payload_json,
      committed_at: requestRow.committed_at,
    } : undefined);
    if (!linkedRequest) return [];
    const linkedRequestData = parseJson(linkedRequest.payload_json);
    const revision = revisions.get(feedback.id);
    const revisionData = revision ? parseJson(revision.payload_json) : {};
    return [{
      requestId: linkedRequest.id,
      sourceRecordId: text(linkedRequestData.sourceRecordId, 80),
      companyIdentity: text(linkedRequestData.companyIdentity, 180),
      feedbackId: feedback.id,
      committedAt: feedback.committed_at,
      independentFirstPassConfirmed: linkedRequestData.independentFirstPassConfirmed === true,
      foundationalError: feedbackData.foundationalError === true,
      genuineDisconfirmingCase: feedbackData.genuineDisconfirmingCase === true,
      revisionAttemptId: revision?.id ?? "",
      genuineRevisionConfirmed: revisionData.genuineRevisionConfirmed === true,
    }];
  });
  const evaluation = evaluateMasteryEvidence(dimension, attempts);
  const masteryId = crypto.randomUUID();
  const masteryPayload: Record<string, unknown> = {
    dimension,
    evidenceState: evaluation.evidenceState,
    evaluatedOn: respondedOn,
    timezone,
    attemptRequestIds: evaluation.requestIds,
    sourceRecordIds: evaluation.sourceRecordIds,
    companyIdentities: evaluation.companyIdentities,
    latestFeedbackIds: evaluation.latestFeedbackIds,
    qualifyingRevisionId: evaluation.qualifyingRevisionId,
    qualifyingDisconfirmingFeedbackId: evaluation.qualifyingDisconfirmingFeedbackId,
    latestTwoClear: evaluation.latestTwoClear,
    basis: `${evaluation.attemptCount} independent attempt${evaluation.attemptCount === 1 ? "" : "s"} across ${evaluation.companyCount} compan${evaluation.companyCount === 1 ? "y" : "ies"}; ${evaluation.hasRevisionOrDisconfirmingCase ? "revision or disconfirming evidence present" : "revision or disconfirming evidence still missing"}.`,
    remainingGaps: evaluation.remainingGaps,
    recordKey: `${dimension}|${feedbackId}`,
  };
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
