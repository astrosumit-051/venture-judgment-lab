import { isCanonicalDate, isValidTimeZone } from "./calibration.ts";

export const COACH_DIMENSIONS = [
  "sourcing",
  "diligence",
  "forecasting",
  "founder_judgment",
  "communication",
] as const;

export type CoachDimension = typeof COACH_DIMENSIONS[number];

export const COACH_RECORD_TYPES = [
  "coach_request",
  "coach_feedback",
  "revision_attempt",
  "mastery_evidence",
] as const;

export const COACH_DIFFICULTY_ADJUSTMENTS = [
  "repeat_same_scope",
  "narrow_to_foundation",
  "require_disconfirming_evidence",
  "transfer_across_company",
  "increase_ambiguity",
  "timed_defense",
  "advance_independently",
] as const;

export const COACH_ERROR_KINDS = [
  "unsupported_causal_bridge",
  "anecdote_to_generalization",
  "source_reliability_blind_spot",
  "missing_disconfirmation",
  "base_rate_neglect",
  "identity_or_attribution_error",
  "calibration_error",
  "founder_halo_effect",
  "unclear_decision_delta",
  "communication_without_evidence",
  "other_bounded_pattern",
] as const;

const boundedCoachErrorPatternKey = /^[a-z0-9]+(?:_[a-z0-9]+){1,7}$/;

export const MASTERY_EVIDENCE_STATES = [
  "observed_once",
  "developing",
  "repeated_or_corroborated",
] as const;

export type MasteryEvidenceState = typeof MASTERY_EVIDENCE_STATES[number];

export type CoachRecordLike = {
  id: string;
  recordType: string;
  parentId: string | null;
  title: string;
  payload: Record<string, unknown>;
  committedAt: string;
};

export type MasteryAttempt = {
  requestId: string;
  sourceRecordId: string;
  companyIdentity: string;
  feedbackId: string;
  committedAt: string;
  sequence?: number;
  independentFirstPassConfirmed: boolean;
  foundationalError: boolean;
  genuineDisconfirmingCase: boolean;
  revisionAttemptId: string;
  genuineRevisionConfirmed: boolean;
};

export type MasteryEvaluation = {
  dimension: CoachDimension;
  evidenceState: MasteryEvidenceState;
  qualifies: boolean;
  attemptCount: number;
  companyCount: number;
  latestTwoClear: boolean;
  hasRevisionOrDisconfirmingCase: boolean;
  requestIds: string[];
  sourceRecordIds: string[];
  companyIdentities: string[];
  latestFeedbackIds: string[];
  qualifyingRevisionId: string;
  qualifyingDisconfirmingFeedbackId: string;
  remainingGaps: string[];
};

export function normalizedCoachCompanyIdentity(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

const sourceDimensions: Record<string, readonly CoachDimension[]> = {
  sourcing_lead: ["sourcing"],
  snapshot_judgment: ["sourcing", "diligence", "forecasting", "communication"],
  forecast: ["forecasting", "communication"],
  founder_evidence_review: ["founder_judgment", "communication"],
  weekly_underwrite: ["diligence", "founder_judgment", "communication"],
  diligence_stage: ["diligence", "founder_judgment", "communication"],
  interview_practice: ["communication"],
};

const coachSourceFields: Record<string, readonly string[]> = {
  sourcing_lead: [
    "company", "sector", "companyStage", "attributionClass", "channel", "observedSignal", "nonConsensusReason",
    "qualificationThesis", "ventureMechanism", "disqualifier", "initialDisposition", "outreachAngle", "nextAction",
  ],
  snapshot_judgment: [
    "company", "stage", "sector", "discoverySource", "thesis", "ventureMechanism", "disposition", "confidence",
    "crux", "supportingEvidence", "supportingSourceUrl", "disconfirmingSignal", "disconfirmingSourceUrl", "topUnknown", "nextEvidence",
  ],
  forecast: ["claim", "probability", "resolutionDate", "supportingEvidence", "disconfirmingCondition", "resolutionSource"],
  founder_evidence_review: [
    "company", "sourceType", "sourceDate", "sourceLimitations", "dimensions", "charismaCheck", "counterEvidence",
    "provisionalJudgment", "confidence", "nextQuestion", "behavioralPrediction",
  ],
  weekly_underwrite: [
    "selectionReason", "questions", "evidenceLedger", "founderEvidence", "founderEvidenceSourceOrGap", "countercase",
    "causalInvestmentCase", "disposition", "confidence", "decisionDelta", "nextEvidence",
  ],
  diligence_stage: [
    "stageKey", "stageLabel", "sources", "limitations", "disconfirmingEvidence", "inference", "nextEvidence", "decisionDelta",
    "foundationSummary", "snapshotCrux", "underwriteDecision", "customerEvidence", "marketEvidence", "customerUnknowns",
    "productAssessment", "technicalAssessment", "defensibility", "businessModel", "economicAnalysis", "scalingConstraint",
    "nonInvestmentCase", "failureMechanism", "leadingFailureIndicators", "reversalEvidence", "recommendation", "investmentMemo",
    "remainingDissent", "timedQuestions", "changedJudgment", "unresolvedIssues", "simulatedIcDecision",
  ],
  interview_practice: [
    "practiceType", "prompt", "independentAnswerSummary", "evidenceUsed", "unsupportedClaimOrGap", "nextRevision",
  ],
};

const forbiddenProjectionKey = /(transcript|contact|email|phone|secret|password|token|rating|score|grade|modelanswer)/i;

function boundedProjectionValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return undefined;
  if (typeof value === "string") return value.slice(0, 5000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => boundedProjectionValue(item, depth + 1)).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value).slice(0, 30)) {
      if (forbiddenProjectionKey.test(key)) continue;
      const bounded = boundedProjectionValue(nested, depth + 1);
      if (bounded !== undefined) result[key] = bounded;
    }
    return result;
  }
  return undefined;
}

export function boundedCoachSource(recordType: string, payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of coachSourceFields[recordType] ?? []) {
    const bounded = boundedProjectionValue(payload[key]);
    if (bounded === undefined) continue;
    const candidate = { ...result, [key]: bounded };
    if (JSON.stringify(candidate).length > 50_000) break;
    result[key] = bounded;
  }
  return result;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function exactKeys(payload: Record<string, unknown>, allowed: readonly string[]): boolean {
  const set = new Set(allowed);
  return Object.keys(payload).every((key) => set.has(key));
}

function boundedRequired(payload: Record<string, unknown>, keys: readonly string[], max = 10_000): boolean {
  return keys.every((key) => typeof payload[key] === "string" && Boolean(text(payload[key])) && String(payload[key]).length <= max);
}

function stringArray(value: unknown, minimum: number, maximum: number): value is string[] {
  return Array.isArray(value)
    && value.length >= minimum
    && value.length <= maximum
    && value.every((item) => typeof item === "string" && Boolean(item.trim()) && item.length <= 500);
}

function validDimension(value: unknown): value is CoachDimension {
  return (COACH_DIMENSIONS as readonly unknown[]).includes(value);
}

function validDateAndTimeZone(payload: Record<string, unknown>, dateKey: string, today: string): boolean {
  return isCanonicalDate(payload[dateKey]) && payload[dateKey] === today && isValidTimeZone(payload.timezone);
}

export function eligibleCoachDimensions(recordType: string): readonly CoachDimension[] {
  return sourceDimensions[recordType] ?? [];
}

export function isCoachSource(recordType: string, dimension: unknown): dimension is CoachDimension {
  return validDimension(dimension) && eligibleCoachDimensions(recordType).includes(dimension);
}

export function validateCoachPayload(recordType: string, payload: Record<string, unknown>, today: string): string | null {
  if (JSON.stringify(payload).length > 100_000) return "This Judgment Coach submission is too large.";

  if (recordType === "coach_request") {
    const allowed = [
      "sourceRecordId", "sourceRecordType", "dimension", "companyIdentity", "requestedOn", "timezone",
      "requestKey", "focusQuestion", "learnerSelfDiagnosis", "independentFirstPassConfirmed", "privacyConfirmed",
    ];
    if (!exactKeys(payload, allowed)) return "A Coach Request contains an undeclared field; answers and benchmarks remain withheld.";
    if (!boundedRequired(payload, [
      "sourceRecordId", "sourceRecordType", "companyIdentity", "requestKey", "focusQuestion", "learnerSelfDiagnosis",
    ])) return "A Coach Request needs one committed source, focus question, and learner self-diagnosis.";
    if (!isCoachSource(text(payload.sourceRecordType), payload.dimension)) {
      return "This committed work does not support the selected coaching dimension.";
    }
    if (!validDateAndTimeZone(payload, "requestedOn", today)) return "A Coach Request must preserve its actual local request date and timezone.";
    if (payload.independentFirstPassConfirmed !== true) return "Commit and confirm the Independent First Pass before requesting coaching.";
    if (payload.privacyConfirmed !== true) return "Confirm that the Coach Request contains only bounded, approved private evidence.";
    return null;
  }

  if (recordType === "coach_feedback") {
    const allowed = [
      "requestId", "sourceRecordId", "dimension", "companyIdentity", "respondedOn", "timezone", "feedbackKey",
      "unsupportedInference", "evidenceGap", "recurringError", "recurringErrorKind", "recurringErrorPatternKey", "recurringErrorCount", "requiredRevision", "nextDifficultyAdjustment",
      "competingInterpretation", "benchmark", "foundationalError", "genuineDisconfirmingCase",
      "disconfirmingCaseEvidence", "privacyConfirmed",
    ];
    if (!exactKeys(payload, allowed)) return "Coach Feedback contains an undeclared field; grades, scores, and model answers are rejected.";
    if (!boundedRequired(payload, [
      "requestId", "sourceRecordId", "companyIdentity", "feedbackKey", "unsupportedInference", "evidenceGap",
      "recurringError", "requiredRevision", "competingInterpretation", "benchmark", "disconfirmingCaseEvidence",
    ])) return "Coach Feedback must diagnose the inference, evidence gap, recurring error, revision, and next comparison.";
    if (!validDimension(payload.dimension)) return "Coach Feedback needs one canonical judgment dimension.";
    if (!(COACH_DIFFICULTY_ADJUSTMENTS as readonly unknown[]).includes(payload.nextDifficultyAdjustment)) {
      return "Coach Feedback needs one bounded next difficulty adjustment.";
    }
    if (!(COACH_ERROR_KINDS as readonly unknown[]).includes(payload.recurringErrorKind)) {
      return "Coach Feedback needs one stable recurring-error kind.";
    }
    if (payload.recurringErrorKind === "other_bounded_pattern") {
      if (typeof payload.recurringErrorPatternKey !== "string" || !boundedCoachErrorPatternKey.test(payload.recurringErrorPatternKey)) {
        return "Another bounded pattern needs a stable lowercase underscore key with at least two terms.";
      }
    } else if (payload.recurringErrorPatternKey !== undefined) {
      return "A custom recurring-error pattern key is permitted only for another bounded pattern.";
    }
    if (typeof payload.foundationalError !== "boolean" || typeof payload.genuineDisconfirmingCase !== "boolean") {
      return "Coach Feedback must state whether the error is foundational and whether a genuine disconfirming case exists.";
    }
    if (!Number.isInteger(payload.recurringErrorCount) || Number(payload.recurringErrorCount) < 1) {
      return "Coach Feedback needs a deterministic recurring-error count.";
    }
    if (payload.foundationalError === true && payload.nextDifficultyAdjustment === "advance_independently") {
      return "A Foundational Error requires revision before difficulty can advance independently.";
    }
    if (!validDateAndTimeZone(payload, "respondedOn", today)) return "Coach Feedback must preserve its actual local response date and timezone.";
    if (payload.privacyConfirmed !== true) return "Coach Feedback requires bounded-private-evidence confirmation.";
    return null;
  }

  if (recordType === "revision_attempt") {
    const allowed = [
      "coachFeedbackId", "sourceRecordId", "dimension", "companyIdentity", "attemptedOn", "timezone", "revisionKey",
      "revisedJudgment", "evidenceAdded", "responseToUnsupportedInference", "disconfirmingCase", "decisionDelta",
      "genuineRevisionConfirmed", "privacyConfirmed",
    ];
    if (!exactKeys(payload, allowed)) return "A Revision Attempt contains an undeclared field.";
    if (!boundedRequired(payload, [
      "coachFeedbackId", "sourceRecordId", "companyIdentity", "revisionKey", "revisedJudgment", "evidenceAdded",
      "responseToUnsupportedInference", "disconfirmingCase", "decisionDelta",
    ])) return "A Revision Attempt must answer the diagnosis with evidence, disconfirmation, and a Decision Delta.";
    if (!validDimension(payload.dimension)) return "A Revision Attempt needs one canonical judgment dimension.";
    if (!validDateAndTimeZone(payload, "attemptedOn", today)) return "A Revision Attempt must preserve its actual local date and timezone.";
    if (payload.genuineRevisionConfirmed !== true) return "Confirm a genuine revision rather than restating the original work.";
    if (payload.privacyConfirmed !== true) return "A Revision Attempt requires bounded-private-evidence confirmation.";
    return null;
  }

  if (recordType === "mastery_evidence") {
    const allowed = [
      "dimension", "evidenceState", "evaluatedOn", "timezone", "attemptRequestIds", "sourceRecordIds",
      "companyIdentities", "latestFeedbackIds", "qualifyingRevisionId", "qualifyingDisconfirmingFeedbackId",
      "latestTwoClear", "basis", "remainingGaps", "triggerRecordId", "triggerRecordType", "recordKey",
    ];
    if (!exactKeys(payload, allowed)) return "Mastery Evidence contains an undeclared field; composite scores and grades are rejected.";
    if (!validDimension(payload.dimension) || !(MASTERY_EVIDENCE_STATES as readonly unknown[]).includes(payload.evidenceState)) {
      return "Mastery Evidence needs one dimension and one evidence state.";
    }
    if (!validDateAndTimeZone(payload, "evaluatedOn", today)) return "Mastery Evidence must preserve its actual local date and timezone.";
    if (!boundedRequired(payload, ["basis", "triggerRecordId", "triggerRecordType", "recordKey"], 20_000)) return "Mastery Evidence needs a factual basis, trigger, and stable identity.";
    if (!new Set(["coach_feedback", "revision_attempt"]).has(text(payload.triggerRecordType))) {
      return "Mastery Evidence must be triggered by Coach Feedback or a Revision Attempt.";
    }
    if (
      !stringArray(payload.attemptRequestIds, 1, 100)
      || !stringArray(payload.sourceRecordIds, 1, 100)
      || !stringArray(payload.companyIdentities, 1, 100)
      || !stringArray(payload.latestFeedbackIds, 1, 2)
      || !Array.isArray(payload.remainingGaps)
      || payload.remainingGaps.length > 12
      || payload.remainingGaps.some((gap) => typeof gap !== "string" || !gap.trim() || gap.length > 1000)
      || typeof payload.latestTwoClear !== "boolean"
      || typeof payload.qualifyingRevisionId !== "string"
      || typeof payload.qualifyingDisconfirmingFeedbackId !== "string"
    ) return "Mastery Evidence needs bounded attempt, company, latest-feedback, and remaining-gap evidence.";
    return null;
  }

  return "Unsupported Judgment Coach record type.";
}

export function evaluateMasteryEvidence(dimension: CoachDimension, input: MasteryAttempt[]): MasteryEvaluation {
  const attempts = [...input]
    .filter((attempt) => attempt.independentFirstPassConfirmed)
    .filter((attempt, index, all) => all.findIndex((candidate) => candidate.sourceRecordId === attempt.sourceRecordId) === index)
    .sort((left, right) => {
      const sequenceDelta = (left.sequence ?? 0) - (right.sequence ?? 0);
      return sequenceDelta || left.committedAt.localeCompare(right.committedAt) || left.feedbackId.localeCompare(right.feedbackId);
    });
  const companyByKey = new Map<string, string>();
  for (const attempt of attempts) {
    const display = attempt.companyIdentity.trim();
    const key = normalizedCoachCompanyIdentity(display);
    if (key && !companyByKey.has(key)) companyByKey.set(key, display);
  }
  const companyIdentities = [...companyByKey.values()];
  const latest = attempts.slice(-2);
  const latestTwoClear = latest.length === 2 && latest.every((attempt) => !attempt.foundationalError);
  const revisionAttempt = attempts.find((attempt) => attempt.revisionAttemptId && attempt.genuineRevisionConfirmed);
  const disconfirmingAttempt = attempts.find((attempt) => attempt.genuineDisconfirmingCase);
  const hasRevisionOrDisconfirmingCase = Boolean(revisionAttempt || disconfirmingAttempt);
  const qualifies = attempts.length >= 3 && companyIdentities.length >= 2 && latestTwoClear && hasRevisionOrDisconfirmingCase;
  const evidenceState: MasteryEvidenceState = qualifies ? "repeated_or_corroborated" : attempts.length >= 2 ? "developing" : "observed_once";
  const remainingGaps: string[] = [];
  if (attempts.length < 3) remainingGaps.push(`${3 - attempts.length} more independent attempt${3 - attempts.length === 1 ? "" : "s"}`);
  if (companyIdentities.length < 2) remainingGaps.push("evidence across a second company");
  if (!hasRevisionOrDisconfirmingCase) remainingGaps.push("a genuine revision or disconfirming case");
  if (!latestTwoClear) remainingGaps.push("two latest attempts without a foundational error");
  return {
    dimension,
    evidenceState,
    qualifies,
    attemptCount: attempts.length,
    companyCount: companyIdentities.length,
    latestTwoClear,
    hasRevisionOrDisconfirmingCase,
    requestIds: attempts.map((attempt) => attempt.requestId),
    sourceRecordIds: attempts.map((attempt) => attempt.sourceRecordId),
    companyIdentities,
    latestFeedbackIds: latest.map((attempt) => attempt.feedbackId),
    qualifyingRevisionId: revisionAttempt?.revisionAttemptId ?? "",
    qualifyingDisconfirmingFeedbackId: disconfirmingAttempt?.feedbackId ?? "",
    remainingGaps,
  };
}
