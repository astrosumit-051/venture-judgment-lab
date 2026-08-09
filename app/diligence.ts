import { isCanonicalDate, isValidTimeZone } from "./calibration.ts";

export const DILIGENCE_STAGE_DEFINITIONS = [
  { key: "foundation", label: "Snapshot and Underwrite foundation", purpose: "Lock the starting judgment and the exact load-bearing uncertainty the case must resolve." },
  { key: "customer_market", label: "Customer and market evidence", purpose: "Test who has the problem, how urgently they act, and whether the market mechanism can support venture scale." },
  { key: "technical_product", label: "Technical and product assessment", purpose: "Separate demonstrated product behavior, technical constraints, and defensibility from product narrative." },
  { key: "business_economics", label: "Business model and economic analysis", purpose: "Trace how value, revenue, costs, and scaling constraints interact under realistic assumptions." },
  { key: "anti_memo", label: "Anti-Memo and premortem", purpose: "Commit the strongest causal non-investment case before assembling the final memo." },
  { key: "full_memo", label: "Full investment memo", purpose: "Integrate the evidence into a defensible recommendation without erasing unresolved dissent." },
  { key: "oral_defense", label: "Oral defense and simulated IC", purpose: "Defend the judgment under time pressure, preserve concessions, and expose what remains unresolved." },
] as const;

export type DiligenceStageKey = typeof DILIGENCE_STAGE_DEFINITIONS[number]["key"];

export const DILIGENCE_RECORD_TYPES = ["diligence_case", "diligence_stage"] as const;
export const DILIGENCE_SOURCE_TYPES = ["Public source", "Private evidence"] as const;
export const DILIGENCE_RECOMMENDATIONS = ["Pursue", "Watch", "Pass"] as const;

export type DiligenceRecordLike = {
  id: string;
  recordType: string;
  parentId: string | null;
  title: string;
  payload: Record<string, unknown>;
  committedAt: string;
};

const stageSpecificKeys: Record<DiligenceStageKey, readonly string[]> = {
  foundation: ["foundationSummary", "snapshotCrux", "underwriteDecision"],
  customer_market: ["customerEvidence", "marketEvidence", "customerUnknowns"],
  technical_product: ["productAssessment", "technicalAssessment", "defensibility"],
  business_economics: ["businessModel", "economicAnalysis", "scalingConstraint"],
  anti_memo: ["nonInvestmentCase", "failureMechanism", "leadingFailureIndicators", "reversalEvidence"],
  full_memo: ["recommendation", "investmentMemo", "remainingDissent"],
  oral_defense: ["timedQuestions", "changedJudgment", "unresolvedIssues", "simulatedIcDecision"],
};

const commonStageKeys = [
  "caseId", "stageKey", "stageIndex", "stageLabel", "recordKey", "committedOn", "timezone",
  "sources", "limitations", "disconfirmingEvidence", "inference", "nextEvidence", "decisionDelta",
  "privacyConfirmed",
] as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeHttpUrl(value: unknown): boolean {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function boundedRequiredText(payload: Record<string, unknown>, keys: readonly string[], max = 20_000): boolean {
  return keys.every((key) => typeof payload[key] === "string" && Boolean(String(payload[key]).trim()) && String(payload[key]).length <= max);
}

export function diligenceStageDefinition(stageKey: unknown) {
  return DILIGENCE_STAGE_DEFINITIONS.find((stage) => stage.key === stageKey);
}

export function diligenceSequenceStatus(records: DiligenceRecordLike[], caseId: string) {
  const stages = records
    .filter((record) => record.recordType === "diligence_stage" && record.parentId === caseId)
    .sort((left, right) => Number(left.payload.stageIndex) - Number(right.payload.stageIndex));
  const committedKeys = stages.map((record) => text(record.payload.stageKey));
  const validPrefix = stages.every((record, index) => (
    Number(record.payload.stageIndex) === index
    && committedKeys[index] === DILIGENCE_STAGE_DEFINITIONS[index]?.key
  ));
  return {
    stages,
    committedKeys,
    validPrefix,
    complete: validPrefix && stages.length === DILIGENCE_STAGE_DEFINITIONS.length,
    nextStage: validPrefix ? DILIGENCE_STAGE_DEFINITIONS[stages.length] ?? null : null,
  };
}

export function validateDiligencePayload(
  recordType: string,
  payload: Record<string, unknown>,
  today: string,
): string | null {
  if (JSON.stringify(payload).length > 100_000) return "This Diligence submission is too large.";

  if (recordType === "diligence_case") {
    const allowed = new Set(["snapshotId", "underwriteId", "company", "openedOn", "timezone", "caseKey"]);
    if (Object.keys(payload).some((key) => !allowed.has(key))) return "A Diligence Case contains an undeclared field.";
    if (!boundedRequiredText(payload, ["snapshotId", "underwriteId", "company", "caseKey"], 500)) {
      return "A Diligence Case must link one company, Snapshot, and Weekly Underwrite.";
    }
    if (!isCanonicalDate(payload.openedOn) || payload.openedOn !== today) {
      return "A Diligence Case must preserve its actual local opening date.";
    }
    if (!isValidTimeZone(payload.timezone)) return "A Diligence Case needs a valid preserved timezone.";
    return null;
  }

  if (recordType !== "diligence_stage") return "Unsupported Diligence record type.";
  const definition = diligenceStageDefinition(payload.stageKey);
  if (!definition) return "Choose a valid Diligence Case stage.";
  const allowed = new Set([...commonStageKeys, ...stageSpecificKeys[definition.key]]);
  if (Object.keys(payload).some((key) => !allowed.has(key))) {
    return "A Diligence stage contains an undeclared field; raw transcripts, scores, and extra private material are rejected.";
  }
  if (
    text(payload.stageLabel) !== definition.label
    || Number(payload.stageIndex) !== DILIGENCE_STAGE_DEFINITIONS.indexOf(definition)
  ) return "The Diligence stage identity is inconsistent with the required sequence.";
  if (!boundedRequiredText(payload, [
    "caseId", "recordKey", "limitations", "disconfirmingEvidence", "inference", "nextEvidence", "decisionDelta",
  ])) return "Every Diligence stage needs limitations, disconfirmation, inference, next evidence, and a Decision Delta.";
  if (!isCanonicalDate(payload.committedOn) || payload.committedOn !== today || !isValidTimeZone(payload.timezone)) {
    return "A Diligence stage must preserve its actual local commitment date and timezone.";
  }
  if (payload.privacyConfirmed !== true) {
    return "Confirm that the Diligence stage omits raw transcripts, contact details, secrets, and unapproved confidential material.";
  }
  const requiredStageTextKeys = stageSpecificKeys[definition.key].filter((key) => key !== "timedQuestions");
  if (!boundedRequiredText(payload, requiredStageTextKeys)) {
    return `Complete the required ${definition.label} evidence.`;
  }
  const sources = payload.sources;
  if (!Array.isArray(sources) || sources.length < 1 || sources.length > 12 || sources.some((source) => !isObject(source))) {
    return "Every Diligence stage needs between one and twelve bounded sources.";
  }
  for (const source of sources as Record<string, unknown>[]) {
    const allowedSourceKeys = new Set(["sourceType", "sourceReference", "observation", "reliabilityLimits"]);
    if (
      Object.keys(source).some((key) => !allowedSourceKeys.has(key))
      || !(DILIGENCE_SOURCE_TYPES as readonly string[]).includes(text(source.sourceType))
      || !boundedRequiredText(source, ["sourceReference", "observation", "reliabilityLimits"], 5000)
    ) return "Each Diligence source needs a type, bounded reference, observation, and reliability limit.";
    if (source.sourceType === "Public source" && !safeHttpUrl(source.sourceReference)) {
      return "A public Diligence source needs its original HTTP(S) URL.";
    }
    if (source.sourceType === "Private evidence" && String(source.sourceReference).length > 1000) {
      return "Private Diligence evidence needs concise context, not raw correspondence or a transcript.";
    }
  }
  if (definition.key === "full_memo" && !(DILIGENCE_RECOMMENDATIONS as readonly string[]).includes(text(payload.recommendation))) {
    return "The Full investment memo needs a Pursue, Watch, or Pass recommendation.";
  }
  if (definition.key === "oral_defense") {
    const questions = payload.timedQuestions;
    if (!Array.isArray(questions) || questions.length < 3 || questions.length > 12 || questions.some((question) => !isObject(question))) {
      return "Oral defense requires three to twelve timed questions.";
    }
    for (const question of questions as Record<string, unknown>[]) {
      const allowedQuestionKeys = new Set(["question", "secondsAllowed", "answerSummary", "concession"]);
      const seconds = Number(question.secondsAllowed);
      if (
        Object.keys(question).some((key) => !allowedQuestionKeys.has(key))
        || !boundedRequiredText(question, ["question", "answerSummary", "concession"], 5000)
        || !Number.isInteger(seconds)
        || seconds < 30
        || seconds > 300
      ) return "Every oral-defense question needs a 30–300 second limit, answer summary, and explicit concession or none-found statement.";
    }
  }
  return null;
}
