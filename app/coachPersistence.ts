import {
  evaluateMasteryEvidence,
  type CoachDimension,
  type MasteryAttempt,
  type MasteryEvaluation,
} from "./coach";

type CoachRow = {
  id: string;
  record_type: string;
  parent_id: string | null;
  title: string;
  payload_json: string;
  committed_at: string;
};

export type PendingCoachRecord = {
  id: string;
  recordType: "coach_feedback" | "revision_attempt";
  parentId: string;
  title: string;
  payload: Record<string, unknown>;
  committedAt: string;
};

function parseJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function text(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function evaluateOwnerMastery(
  db: D1Database,
  owner: string,
  dimension: CoachDimension,
  pending: PendingCoachRecord[] = [],
): Promise<MasteryEvaluation> {
  const result = await db.prepare(
    `SELECT id, record_type, parent_id, title, payload_json, committed_at
     FROM lab_records WHERE owner_id = ?
     AND record_type IN ('coach_request', 'coach_feedback', 'revision_attempt')
     ORDER BY committed_at ASC`,
  ).bind(owner).all<CoachRow>();
  const rows: CoachRow[] = [
    ...(result.results ?? []),
    ...pending.map((record) => ({
      id: record.id,
      record_type: record.recordType,
      parent_id: record.parentId,
      title: record.title,
      payload_json: JSON.stringify(record.payload),
      committed_at: record.committedAt,
    })),
  ];
  const requests = new Map(rows.filter((row) => row.record_type === "coach_request").map((row) => [row.id, row]));
  const revisions = new Map(rows.filter((row) => row.record_type === "revision_attempt").map((row) => [row.parent_id, row]));
  const attempts: MasteryAttempt[] = rows.filter((row) => row.record_type === "coach_feedback").flatMap((feedback) => {
    if (!feedback.parent_id) return [];
    const feedbackData = parseJson(feedback.payload_json);
    if (text(feedbackData.dimension, 80) !== dimension) return [];
    const request = requests.get(feedback.parent_id);
    if (!request) return [];
    const requestData = parseJson(request.payload_json);
    const revision = revisions.get(feedback.id);
    const revisionData = revision ? parseJson(revision.payload_json) : {};
    return [{
      requestId: request.id,
      sourceRecordId: text(requestData.sourceRecordId, 80),
      companyIdentity: text(requestData.companyIdentity, 180),
      feedbackId: feedback.id,
      committedAt: feedback.committed_at,
      independentFirstPassConfirmed: requestData.independentFirstPassConfirmed === true,
      foundationalError: feedbackData.foundationalError === true,
      genuineDisconfirmingCase: feedbackData.genuineDisconfirmingCase === true,
      revisionAttemptId: revision?.id ?? "",
      genuineRevisionConfirmed: revisionData.genuineRevisionConfirmed === true,
    }];
  });
  return evaluateMasteryEvidence(dimension, attempts);
}

export function masteryEvidencePayload(values: {
  evaluation: MasteryEvaluation;
  triggerRecordId: string;
  triggerRecordType: "coach_feedback" | "revision_attempt";
  evaluatedOn: string;
  timezone: string;
}): Record<string, unknown> {
  const { evaluation } = values;
  return {
    dimension: evaluation.dimension,
    evidenceState: evaluation.evidenceState,
    evaluatedOn: values.evaluatedOn,
    timezone: values.timezone,
    attemptRequestIds: evaluation.requestIds,
    sourceRecordIds: evaluation.sourceRecordIds,
    companyIdentities: evaluation.companyIdentities,
    latestFeedbackIds: evaluation.latestFeedbackIds,
    qualifyingRevisionId: evaluation.qualifyingRevisionId,
    qualifyingDisconfirmingFeedbackId: evaluation.qualifyingDisconfirmingFeedbackId,
    latestTwoClear: evaluation.latestTwoClear,
    basis: `${evaluation.attemptCount} independent attempt${evaluation.attemptCount === 1 ? "" : "s"} across ${evaluation.companyCount} compan${evaluation.companyCount === 1 ? "y" : "ies"}; ${evaluation.hasRevisionOrDisconfirmingCase ? "revision or disconfirming evidence present" : "revision or disconfirming evidence still missing"}.`,
    remainingGaps: evaluation.remainingGaps,
    triggerRecordId: values.triggerRecordId,
    triggerRecordType: values.triggerRecordType,
    recordKey: `${evaluation.dimension}|${values.triggerRecordType}|${values.triggerRecordId}`,
  };
}
