import { currentLabOwnerId } from "@/app/labOwner";
import { mapLabEvent, mapLabRecord, type DbLabEvent, type DbLabRecord } from "@/app/labReadModels";
import {
  calculateBrierScore,
  dateInTimeZone,
  isCanonicalDate,
  isValidTimeZone,
  type ForecastOutcome,
} from "@/app/calibration";
import { ensureLabSchema } from "@/db/runtime";
import { FOUNDER_DIMENSIONS, FOUNDER_SOURCE_TYPES } from "@/app/founderEvidence";
import { configuredAutomationFingerprint } from "@/app/automationAuth";
import { LAB_AUTOMATION_CAPABILITIES } from "@/app/automationRegistration";
import { ASSIGNMENT_EVENT_TYPES, completionReadiness, validateAssignmentEvent } from "@/app/assignmentEvents";
import { COACH_RECORD_TYPES, isCoachSource, validateCoachPayload, type CoachDimension } from "@/app/coach";
import {
  coachDimensionHistoryVersion,
  evaluateMasteryFromHistory,
  historyHasCoachChild,
  insertCoachRecordWhenHistoryCurrent,
  insertCoachRecordWhenTriggerExists,
  loadOwnerCoachHistory,
  masteryEvidencePayload,
} from "@/app/coachPersistence";
import {
  DILIGENCE_RECORD_TYPES,
  DILIGENCE_STAGE_DEFINITIONS,
  diligenceSequenceStatus,
  diligenceStageDefinition,
  validateDiligencePayload,
} from "@/app/diligence";
import {
  normalizeRecruitingUrl,
  expectedRecruitingFunnelClass,
  legacyRecruitingCycleKey,
  portfolioArtifactTypeForRecord,
  PORTFOLIO_SOURCE_RECORD_TYPES,
  RECRUITING_CHILD_RECORD_TYPES,
  RECRUITING_RECORD_TYPES,
  recruitingRecordKey,
  validateRecruitingPayload,
} from "@/app/recruiting";
import {
  applySourcingCorrections,
  isConsistentSourcingAttribution,
  OUTREACH_CHANNELS,
  RELATIONSHIP_QUALITY_STATES,
  SOURCING_ATTRIBUTION_CLASSES,
  SOURCING_CHANNELS,
  SOURCING_CORRECTION_FIELDS,
  SOURCING_DISPOSITIONS,
  SOURCING_OUTCOMES,
  SOURCING_UPDATE_KINDS,
  SOURCING_VISIBILITIES,
  sourcingStageIndex,
  type SourcingEventLike,
  type SourcingStage,
} from "@/app/sourcing";

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

const recordRequirements: Record<string, string[]> = {
  snapshot_judgment: [
    "company", "stage", "sector", "discoverySource", "thesis",
    "ventureMechanism", "disposition", "confidence", "crux",
    "supportingEvidence", "supportingSourceUrl", "disconfirmingSignal",
    "topUnknown", "nextEvidence",
  ],
  forecast: [
    "claim", "probability", "resolutionDate", "supportingEvidence",
    "disconfirmingCondition", "resolutionSource", "timezone",
  ],
  second_order_map: [
    "trigger", "firstOrder", "secondOrder", "thirdOrder", "bottlenecks", "incentives", "suppliers",
    "customers", "substitutes", "regulation", "adjacentEffects",
    "disconfirmingEvidence",
  ],
  founder_evidence_review: [
    "company", "founderName", "sourceType", "sourceUrlOrContext", "sourceDate",
    "sourceLimitations", "privacyBoundary", "dimensions", "charismaCheck",
    "counterEvidence", "provisionalJudgment", "confidence", "nextQuestion",
    "behavioralPrediction", "timezone",
  ],
  weekly_underwrite: [
    "snapshotId", "selectionReason", "questions", "evidenceLedger",
    "founderEvidence", "founderEvidenceSourceOrGap", "countercase", "causalInvestmentCase",
    "disposition", "confidence", "decisionDelta", "nextEvidence",
  ],
  weekly_plan: ["weekOf", "mode", "rationale", "totalMinutes", "dailyLoops"],
  calibration_review: [
    "reviewMonth", "sourcingResults", "analyticalMistakes", "judgmentComparison", "laterEvidence",
    "updatedDecisionRule", "findings", "restartPlan",
  ],
  sourcing_experiment: [
    "name", "channel", "targetSegment", "searchSurface", "hypothesis", "leadingSignal",
    "nonConsensusRationale", "startDate", "endDate", "plannedLeads", "successCondition",
    "stopRule", "timezone",
  ],
  sourcing_lead: [
    "company", "companyUrl", "normalizedCompanyDomain", "attributionClass", "channel",
    "sourceVisibility", "sourceReference", "discoveredOn", "discoveredAt", "sector", "companyStage",
    "observedSignal", "nonConsensusReason", "qualificationThesis", "ventureMechanism",
    "disqualifier", "initialDisposition", "outreachAngle", "nextAction", "dueDate",
    "initialStage", "timezone",
  ],
};

const allowedEventTypes = new Set([
  "reflection",
  "source_status",
  "metadata_correction",
  "coach_feedback",
  "later_usefulness",
  "missed_practice",
  ...ASSIGNMENT_EVENT_TYPES,
]);

const PRACTICE_DAY_LINKABLE_RECORD_TYPES = new Set([
  "sourcing_lead",
  "snapshot_judgment",
  "forecast",
  "recruiting_opportunity",
  "opportunity_observation",
  "recruiting_interaction",
  "application_attempt",
  "interview_practice",
  "portfolio_candidate",
  "weekly_underwrite",
  "revision_attempt",
]);

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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasValue(value: unknown): boolean {
  if (typeof value === "string") return Boolean(value.trim());
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function safeHttpUrl(value: unknown): boolean {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizedDomain(value: unknown): string {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function coachCompanyIdentity(db: D1Database, owner: string, record: {
  id: string;
  record_type: string;
  parent_id: string | null;
  title: string;
  payload_json: string;
}): Promise<string> {
  const payload = parseJson(record.payload_json);
  const direct = cleanText(payload.company, 180) || cleanText(payload.firm, 180);
  if (direct) return direct;
  let linkedId = "";
  let linkedType = "";
  if (record.record_type === "forecast") {
    linkedId = cleanText(payload.linkedSnapshotId, 80);
    linkedType = "snapshot_judgment";
  } else if (record.record_type === "weekly_underwrite") {
    linkedId = cleanText(payload.snapshotId, 80);
    linkedType = "snapshot_judgment";
  } else if (record.record_type === "diligence_stage") {
    linkedId = record.parent_id ?? "";
    linkedType = "diligence_case";
  } else if (record.record_type === "interview_practice") {
    linkedId = record.parent_id ?? "";
    linkedType = "recruiting_opportunity";
  }
  if (!linkedId || !linkedType) return "";
  const linked = await db.prepare(
    "SELECT payload_json FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = ?",
  ).bind(linkedId, owner, linkedType).first<{ payload_json: string }>();
  if (!linked) return "";
  const linkedPayload = parseJson(linked.payload_json);
  return cleanText(linkedPayload.company, 180) || cleanText(linkedPayload.firm, 180);
}

function validatePayload(recordType: string, payload: Record<string, unknown>): string | null {
  if ((COACH_RECORD_TYPES as readonly string[]).includes(recordType)) {
    const timezone = cleanText(payload.timezone, 100);
    const today = isValidTimeZone(timezone)
      ? dateInTimeZone(new Date(), timezone)
      : new Date().toISOString().slice(0, 10);
    return validateCoachPayload(recordType, payload, today);
  }
  if ((DILIGENCE_RECORD_TYPES as readonly string[]).includes(recordType)) {
    const timezone = cleanText(payload.timezone, 100);
    const today = isValidTimeZone(timezone)
      ? dateInTimeZone(new Date(), timezone)
      : new Date().toISOString().slice(0, 10);
    return validateDiligencePayload(recordType, payload, today);
  }
  if ((RECRUITING_RECORD_TYPES as readonly string[]).includes(recordType)) {
    const timezone = cleanText(payload.timezone, 100);
    const today = isValidTimeZone(timezone)
      ? dateInTimeZone(new Date(), timezone)
      : new Date().toISOString().slice(0, 10);
    return validateRecruitingPayload(recordType, payload, today);
  }
  const required = recordRequirements[recordType];
  if (!required) return "Unsupported record type.";
  const missing = required.filter((key) => !hasValue(payload[key]));
  if (missing.length) return `Complete the required evidence: ${missing.join(", ")}.`;
  if (JSON.stringify(payload).length > 100_000) return "This submission is too large.";

  if (recordType === "snapshot_judgment" && !safeHttpUrl(payload.supportingSourceUrl)) {
    return "The supporting evidence needs a valid source link.";
  }
  if (recordType === "snapshot_judgment") {
    const confidence = Number(payload.confidence);
    if (!new Set(["Pursue", "Watch", "Pass"]).has(cleanText(payload.disposition, 20))) {
      return "Choose Pursue, Watch, or Pass as the Practice Disposition.";
    }
    if (confidence < 1 || confidence > 99) return "Snapshot confidence must be between 1% and 99%.";
  }
  if (recordType === "forecast") {
    const probability = Number(payload.probability);
    if (!Number.isFinite(probability) || probability < 1 || probability > 99) return "Forecast probability must be between 1% and 99%.";
    if (!isCanonicalDate(payload.resolutionDate)) return "The Forecast needs a real resolution date in YYYY-MM-DD format.";
    if (!isValidTimeZone(payload.timezone)) return "The Forecast needs a valid preserved timezone.";
    if (payload.resolutionDate <= dateInTimeZone(new Date(), payload.timezone)) return "A Forecast must resolve after its committed local date.";
    if (!safeHttpUrl(payload.resolutionSource)) return "The Forecast needs a valid resolution source.";
  }
  if (recordType === "founder_evidence_review") {
    const allowedFounderKeys = new Set([
      "linkedSnapshotId", "company", "founderName", "sourceType", "sourceUrlOrContext",
      "sourceDate", "sourceLimitations", "privacyBoundary", "privateEvidenceConfirmed",
      "dimensions", "charismaCheck", "counterEvidence", "provisionalJudgment", "confidence",
      "nextQuestion", "behavioralPrediction", "timezone",
    ]);
    if (hasValue(payload.score) || hasValue(payload.founderScore)) {
      return "Founder Evidence is not a weighted founder score.";
    }
    if (Object.keys(payload).some((key) => !allowedFounderKeys.has(key))) {
      return "Founder Evidence contains an undeclared field; ratings, transcripts, and extra private material are not preserved.";
    }
    const founderTextLimits: Array<[string, number]> = [
      ["company", 180], ["founderName", 180], ["sourceUrlOrContext", 2000],
      ["sourceLimitations", 5000], ["privacyBoundary", 5000], ["charismaCheck", 5000],
      ["counterEvidence", 5000], ["provisionalJudgment", 5000], ["nextQuestion", 5000],
      ["behavioralPrediction", 5000],
    ];
    if (founderTextLimits.some(([key, limit]) => typeof payload[key] !== "string" || String(payload[key]).trim().length > limit)) {
      return "Founder Evidence fields must contain bounded written evidence.";
    }
    if (!(FOUNDER_SOURCE_TYPES as readonly string[]).includes(cleanText(payload.sourceType, 80))) {
      return "Choose a valid Founder Evidence source type.";
    }
    if (!isCanonicalDate(payload.sourceDate)) return "Founder Evidence needs a real observation date.";
    if (!isValidTimeZone(payload.timezone)) return "Founder Evidence needs a valid preserved timezone.";
    if (payload.sourceDate > dateInTimeZone(new Date(), payload.timezone)) return "Founder Evidence cannot be dated in the future.";
    if (payload.sourceType === "Public interview" && !safeHttpUrl(payload.sourceUrlOrContext)) {
      return "A public Founder Evidence source needs a valid original URL.";
    }
    if (payload.sourceType !== "Public interview" && String(payload.sourceUrlOrContext).length > 1000) {
      return "Private Founder Evidence should preserve concise context, not a raw transcript.";
    }
    if (payload.sourceType !== "Public interview" && payload.privateEvidenceConfirmed !== true) {
      return "Private Founder Evidence requires confirmation that only consented behavioral evidence is preserved.";
    }
    const confidence = Number(payload.confidence);
    if (!Number.isFinite(confidence) || confidence < 1 || confidence > 99) {
      return "Founder Evidence confidence must be between 1% and 99%.";
    }
    const dimensions = payload.dimensions;
    if (!Array.isArray(dimensions) || dimensions.length !== FOUNDER_DIMENSIONS.length || dimensions.some((item) => !isObject(item))) {
      return "Founder Evidence Review must cover all six behavior dimensions.";
    }
    const expectedDimensions = new Set(FOUNDER_DIMENSIONS.map((dimension) => dimension.key));
    const actualDimensions = new Set(dimensions.map((item) => cleanText((item as Record<string, unknown>).dimension, 80)));
    if (actualDimensions.size !== expectedDimensions.size || [...expectedDimensions].some((dimension) => !actualDimensions.has(dimension))) {
      return "Founder Evidence Review must cover all six behavior dimensions exactly once.";
    }
    for (const item of dimensions as Record<string, unknown>[]) {
      const direction = cleanText(item.direction, 20);
      const allowedDimensionKeys = new Set(["dimension", "direction", "observation", "inference"]);
      if (
        Object.keys(item).some((key) => !allowedDimensionKeys.has(key))
        || !new Set(["supports", "weakens", "gap"]).has(direction)
        || typeof item.observation !== "string"
        || typeof item.inference !== "string"
        || !item.observation.trim()
        || !item.inference.trim()
        || item.observation.length > 5000
        || item.inference.length > 5000
      ) {
        return "Every Founder Evidence dimension needs a direction, observed behavior or explicit gap, and a limited inference.";
      }
    }
  }
  if (recordType === "weekly_underwrite") {
    const questions = payload.questions;
    const ledger = payload.evidenceLedger;
    if (!Array.isArray(questions) || questions.length !== 3 || questions.some((item) => !hasValue(item))) {
      return "An Underwrite requires exactly three Load-Bearing Questions.";
    }
    if (!Array.isArray(ledger) || ledger.length !== 3 || ledger.some((item) => !isObject(item))) {
      return "Complete one Evidence Ledger entry for each Load-Bearing Question.";
    }
    const directions = new Set(ledger.map((item) => cleanText((item as Record<string, unknown>).direction, 20)));
    if (!directions.has("supports") || !directions.has("challenges")) {
      return "The Evidence Ledger requires material support and material disconfirmation.";
    }
    for (const item of ledger as Record<string, unknown>[]) {
      const required = ["loadBearingQuestion", "observation", "sourceUrl", "reliabilityLimits", "inference"];
      if (required.some((key) => !hasValue(item[key])) || !safeHttpUrl(item.sourceUrl)) {
        return "Each Evidence Ledger entry needs a question, observation, source link, reliability limit, and inference.";
      }
    }
    const confidence = Number(payload.confidence);
    if (!new Set(["Pursue", "Watch", "Pass"]).has(cleanText(payload.disposition, 20)) || confidence < 1 || confidence > 99) {
      return "Commit a valid final disposition and confidence between 1% and 99%.";
    }
  }
  if (recordType === "weekly_plan") {
    const definitions: Record<string, [number, number]> = {
      "Normal Week": [690, 5],
      "Monthly Calibration Week": [690, 5],
      "Recruiting Surge": [690, 3],
      "Exam Mode": [180, 1],
    };
    const expected = definitions[cleanText(payload.mode, 60)];
    if (!expected || Number(payload.totalMinutes) !== expected[0] || Number(payload.dailyLoops) !== expected[1]) {
      return "The selected practice mode does not match the accepted time architecture.";
    }
    if (payload.mode === "Recruiting Surge" && (!hasValue(payload.opportunity) || !hasValue(payload.deadline))) {
      return "Recruiting Surge requires a real opportunity and dated deadline.";
    }
  }
  if (recordType === "sourcing_experiment") {
    const allowedKeys = new Set(recordRequirements.sourcing_experiment);
    const boundedText = ["name", "targetSegment", "searchSurface", "hypothesis", "leadingSignal", "nonConsensusRationale", "successCondition", "stopRule"];
    if (Object.keys(payload).some((key) => !allowedKeys.has(key)) || boundedText.some((key) => cleanText(payload[key], 5000).length !== String(payload[key]).trim().length)) {
      return "Sourcing Experiments accept only bounded hypothesis and measurement fields.";
    }
    if (!(SOURCING_CHANNELS as readonly string[]).includes(cleanText(payload.channel, 100))) return "Choose a valid Sourcing Experiment channel.";
    if (!isCanonicalDate(payload.startDate) || !isCanonicalDate(payload.endDate) || payload.endDate < payload.startDate) {
      return "A Sourcing Experiment needs a valid date window with the end on or after the start.";
    }
    if (!isValidTimeZone(payload.timezone)) return "A Sourcing Experiment needs a valid timezone.";
    if (payload.startDate < dateInTimeZone(new Date(), payload.timezone)) {
      return "A Sourcing Experiment must be committed before results and cannot be backfilled.";
    }
    const plannedLeads = Number(payload.plannedLeads);
    if (!Number.isInteger(plannedLeads) || plannedLeads < 1 || plannedLeads > 100) return "Plan between 1 and 100 leads for one Sourcing Experiment.";
  }
  if (recordType === "sourcing_lead") {
    const allowedKeys = new Set([...recordRequirements.sourcing_lead, "experimentId", "privateEvidenceConfirmed"]);
    const boundedText = ["company", "sourceReference", "sector", "observedSignal", "nonConsensusReason", "qualificationThesis", "ventureMechanism", "disqualifier", "outreachAngle", "nextAction"];
    if (Object.keys(payload).some((key) => !allowedKeys.has(key)) || boundedText.some((key) => typeof payload[key] !== "string" || !payload[key].trim() || payload[key].length > 5000)) {
      return "Sourcing Leads accept only bounded provenance, qualification, and action fields; raw messages and contact details are rejected.";
    }
    if (!safeHttpUrl(payload.companyUrl) || normalizedDomain(payload.companyUrl) !== cleanText(payload.normalizedCompanyDomain, 255)) return "A Sourcing Lead needs a valid, normalized company website.";
    const attributionClass = cleanText(payload.attributionClass, 100);
    const channel = cleanText(payload.channel, 100);
    const sourceVisibility = cleanText(payload.sourceVisibility, 100);
    if (!(SOURCING_ATTRIBUTION_CLASSES as readonly string[]).includes(attributionClass)) return "Choose the honest Sourcing Attribution Class.";
    if (!(SOURCING_CHANNELS as readonly string[]).includes(channel)) return "Choose a valid Sourcing Channel.";
    if (!(SOURCING_VISIBILITIES as readonly string[]).includes(sourceVisibility)) return "Choose a valid sourcing source visibility.";
    if (!isConsistentSourcingAttribution(attributionClass, channel, sourceVisibility)) {
      return "The Sourcing Attribution Class, channel, and source visibility contradict one another.";
    }
    if (!(SOURCING_DISPOSITIONS as readonly string[]).includes(cleanText(payload.initialDisposition, 100))) return "Choose a valid initial Sourcing Disposition.";
    if (!new Set(["Pre-seed", "Seed", "Series A", "Unknown"]).has(cleanText(payload.companyStage, 40))) return "Choose a valid early-stage company stage.";
    if (payload.initialStage !== "discovered") return "Every Sourcing Lead begins at the Discovered stage.";
    if (!isCanonicalDate(payload.discoveredOn) || !isCanonicalDate(payload.dueDate) || !isValidTimeZone(payload.timezone)) return "A Sourcing Lead needs valid discovery, action, and timezone dates.";
    const discoveredAt = new Date(cleanText(payload.discoveredAt, 40));
    if (
      !Number.isFinite(discoveredAt.getTime())
      || discoveredAt.getTime() > Date.now()
      || dateInTimeZone(discoveredAt, payload.timezone) !== payload.discoveredOn
    ) return "A Sourcing Lead must preserve the server-recorded discovery time on its local discovery date.";
    if (payload.discoveredOn > dateInTimeZone(new Date(), payload.timezone)) return "A Sourcing Lead cannot be discovered in the future.";
    if (payload.dueDate < payload.discoveredOn) return "A Sourcing Lead next action cannot be due before discovery.";
    if (payload.sourceVisibility === "Public source" && !safeHttpUrl(payload.sourceReference)) return "A public Sourcing Lead needs its original source URL.";
    if (payload.sourceVisibility !== "Public source" && (payload.privateEvidenceConfirmed !== true || String(payload.sourceReference).length > 1000)) {
      return "Private sourcing context requires confirmation and a concise summary without raw messages or contact details.";
    }
  }
  return null;
}

function insertRecord(
  db: D1Database,
  values: {
    id: string;
    owner: string;
    recordType: string;
    parentId: string | null;
    title: string;
    payload: Record<string, unknown>;
    now: string;
  },
) {
  return db
    .prepare(
      `INSERT INTO lab_records
       (id, owner_id, record_type, parent_id, title, payload_json, committed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
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

export async function GET() {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });

  const db = await ensureLabSchema();
  const [recordsResult, eventsResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, record_type, parent_id, title, payload_json, committed_at, created_at
         FROM lab_records WHERE owner_id = ? ORDER BY committed_at DESC`,
      )
      .bind(owner)
      .all<DbRecord>(),
    db
      .prepare(
        `SELECT id, record_id, event_type, event_json, occurred_at, created_at
         FROM lab_events WHERE owner_id = ? ORDER BY occurred_at DESC`,
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
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = await ensureLabSchema();
  const operation = cleanText(body.operation, 40);

  if (operation === "register_lab_automation") {
    const fingerprint = await configuredAutomationFingerprint();
    if (!fingerprint) return Response.json({ error: "The private automation credential is not configured in this runtime." }, { status: 503 });
    const timezone = cleanText(body.timezone, 100);
    const practiceMode = cleanText(body.practiceMode, 100);
    const effectiveLearnerDate = cleanText(body.effectiveLearnerDate, 20);
    const notificationPreference = cleanText(body.notificationPreference, 100) || "ready_and_intervention";
    const expectedWeekdays = Array.isArray(body.expectedWeekdays)
      ? body.expectedWeekdays.map((value) => cleanText(value, 3)).filter(Boolean)
      : [];
    const allowedWeekdays = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    const modeDays: Record<string, [number, number]> = {
      "Normal Week": [5, 5],
      "Monthly Calibration Week": [5, 5],
      "Recruiting Surge": [3, 5],
      "Exam Mode": [1, 1],
      "Investing Milestone Substitution": [0, 1],
    };
    const modeBounds = modeDays[practiceMode];
    if (!isValidTimeZone(timezone) || !isCanonicalDate(effectiveLearnerDate) || !modeBounds
      || expectedWeekdays.some((day) => !allowedWeekdays.has(day))
      || new Set(expectedWeekdays).size !== expectedWeekdays.length
      || expectedWeekdays.length < modeBounds[0] || expectedWeekdays.length > modeBounds[1]) {
      return Response.json({ error: "Provide a valid immutable Lab Profile timezone, practice mode, effective date, and expected weekdays." }, { status: 400 });
    }
    if (notificationPreference !== "ready_and_intervention") {
      return Response.json({ error: "The first operating profile supports only bounded ready and intervention notifications." }, { status: 400 });
    }
    const existingCredential = await db.prepare(
      `SELECT id, owner_id, record_type FROM lab_records
       WHERE record_type IN ('lab_automation_registration', 'opportunity_monitor_registration')
       AND json_extract(payload_json, '$.tokenFingerprint') = ?
       ORDER BY CASE record_type WHEN 'lab_automation_registration' THEN 0 ELSE 1 END LIMIT 1`,
    ).bind(fingerprint).first<{ id: string; owner_id: string; record_type: string }>();
    if (existingCredential && existingCredential.owner_id !== owner) {
      return Response.json({ error: "This automation credential is already registered to another private owner." }, { status: 409 });
    }
    const existingProfile = await db.prepare(
      `SELECT id, profile_version, timezone, practice_mode, expected_weekdays_json, notification_preference
       FROM lab_profiles WHERE owner_id = ? AND effective_learner_date = ? LIMIT 1`,
    ).bind(owner, effectiveLearnerDate).first<{
      id: string; profile_version: string; timezone: string; practice_mode: string;
      expected_weekdays_json: string; notification_preference: string;
    }>();
    if (existingProfile) {
      const same = existingProfile.timezone === timezone
        && existingProfile.practice_mode === practiceMode
        && existingProfile.expected_weekdays_json === JSON.stringify(expectedWeekdays)
        && existingProfile.notification_preference === notificationPreference;
      if (!same) return Response.json({ error: "This effective learner date already has a different immutable Lab Profile." }, { status: 409 });
      return Response.json({
        registrationId: existingCredential?.record_type === "lab_automation_registration" ? existingCredential.id : null,
        profileId: existingProfile.id,
        profileVersion: existingProfile.profile_version,
        registered: Boolean(existingCredential?.record_type === "lab_automation_registration"),
        idempotent: true,
      });
    }
    const latestProfile = await db.prepare(
      `SELECT profile_version, effective_learner_date FROM lab_profiles
       WHERE owner_id = ? ORDER BY effective_learner_date DESC, created_at DESC, id DESC LIMIT 1`,
    ).bind(owner).first<{ profile_version: string; effective_learner_date: string }>();
    if (latestProfile && effectiveLearnerDate <= latestProfile.effective_learner_date) {
      return Response.json({
        error: "A changed Lab Profile must append on a later effective learner date; historical profile resolution cannot be rewritten.",
      }, { status: 409 });
    }
    if (latestProfile && effectiveLearnerDate <= dateInTimeZone(new Date(), timezone)) {
      return Response.json({ error: "A changed Lab Profile must become effective on a future learner date." }, { status: 409 });
    }
    const now = new Date().toISOString();
    const profileId = crypto.randomUUID();
    const profileVersion = `profile-${effectiveLearnerDate}`;
    const registrationId = existingCredential?.record_type === "lab_automation_registration" ? existingCredential.id : crypto.randomUUID();
    const statements: D1PreparedStatement[] = [];
    statements.push(db.prepare(
      `INSERT INTO lab_automation_credentials (token_fingerprint, owner_id, created_at)
       VALUES (?, ?, ?) ON CONFLICT(token_fingerprint) DO NOTHING`,
    ).bind(fingerprint, owner, now));
    if (existingCredential?.record_type !== "lab_automation_registration") {
      statements.push(insertRecord(db, {
        id: registrationId,
        owner,
        recordType: "lab_automation_registration",
        parentId: null,
        title: "Venture Judgment Lab — private automation registration",
        payload: {
          automationKind: "venture_judgment_lab",
          tokenFingerprint: fingerprint,
          registeredAt: now,
          schedule: "Weekdays 7:00 AM America/New_York",
          capabilities: LAB_AUTOMATION_CAPABILITIES,
          status: "active",
        },
        now,
      }));
    }
    statements.push(db.prepare(
      `INSERT INTO lab_profiles
       (id, owner_id, profile_version, timezone, practice_mode, expected_weekdays_json,
        notification_preference, effective_learner_date, automation_binding, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      profileId, owner, profileVersion, timezone, practiceMode, JSON.stringify(expectedWeekdays),
      notificationPreference, effectiveLearnerDate, registrationId, now,
    ));
    try {
      await db.batch(statements);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        return Response.json({ error: "The immutable automation registration or Lab Profile was concurrently created with different evidence." }, { status: 409 });
      }
      throw error;
    }
    return Response.json({ registrationId, profileId, profileVersion, registered: true, idempotent: false }, { status: 201 });
  }

  if (operation === "register_opportunity_monitor") {
    const fingerprint = await configuredAutomationFingerprint();
    if (!fingerprint) {
      return Response.json({ error: "The private automation credential is not configured in this runtime." }, { status: 503 });
    }
    const existingOwnerRegistration = await db
      .prepare(
        `SELECT id FROM lab_records WHERE owner_id = ? AND record_type = 'opportunity_monitor_registration'
         AND json_extract(payload_json, '$.automationKind') = 'opportunity_monitor'
         AND json_extract(payload_json, '$.status') = 'active' LIMIT 1`,
      )
      .bind(owner)
      .first<{ id: string }>();
    if (existingOwnerRegistration) return Response.json({ id: existingOwnerRegistration.id, registered: true, idempotent: true });
    const existingFingerprint = await db
      .prepare(
        `SELECT id, owner_id FROM lab_records WHERE record_type IN ('opportunity_monitor_registration', 'lab_automation_registration')
         AND json_extract(payload_json, '$.tokenFingerprint') = ? LIMIT 1`,
      )
      .bind(fingerprint)
      .first<{ id: string; owner_id: string }>();
    if (existingFingerprint && existingFingerprint.owner_id !== owner) {
      return Response.json({ error: "This automation credential is already registered to another private owner." }, { status: 409 });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await db.batch([
        db.prepare(
          `INSERT INTO lab_automation_credentials (token_fingerprint, owner_id, created_at)
           VALUES (?, ?, ?) ON CONFLICT(token_fingerprint) DO NOTHING`,
        ).bind(fingerprint, owner, now),
        insertRecord(db, {
          id,
          owner,
          recordType: "opportunity_monitor_registration",
          parentId: null,
          title: "Official Opportunity Monitor — private registration",
          payload: {
            automationKind: "opportunity_monitor",
            tokenFingerprint: fingerprint,
            registeredAt: now,
            schedule: "Monday 8:00 AM America/New_York",
            status: "active",
          },
          now,
        }),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        const racedRegistration = await db
          .prepare(
            `SELECT id, owner_id FROM lab_records WHERE record_type IN ('opportunity_monitor_registration', 'lab_automation_registration')
             AND json_extract(payload_json, '$.tokenFingerprint') = ? LIMIT 1`,
          )
          .bind(fingerprint)
          .first<{ id: string; owner_id: string }>();
        if (racedRegistration?.owner_id === owner) {
          return Response.json({ id: racedRegistration.id, registered: true, idempotent: true });
        }
        return Response.json({ error: "This automation credential is already registered to another private owner." }, { status: 409 });
      }
      throw error;
    }
    return Response.json({ id, registered: true, idempotent: false }, { status: 201 });
  }

  if (operation === "commit_daily_brief") {
    const briefVersion = cleanText(body.briefVersion, 80);
    const assignedDate = cleanText(body.assignedDate, 20);
    const timezone = cleanText(body.timezone, 80);
    const carryForward = cleanText(body.carryForward, 5000);
    const readings = body.readings;
    if (!briefVersion || !assignedDate || !timezone || !carryForward || !Array.isArray(readings) || readings.length !== 4) {
      return Response.json({ error: "Complete all four readings and the carry-forward judgment." }, { status: 400 });
    }

    const requiredReadingFields = [
      "readingId", "lane", "title", "authorOrOrganization", "publisher",
      "sourceType", "sourceRole", "claimRole", "issuerInterest", "canonicalUrl",
      "publishedDate", "sourceUpdatedDate", "accessedAt", "estimatedMinutes",
      "assignedSection", "rightsOrLicense", "accessMode", "materialReviewed",
      "teachingPurpose", "carryQuestion", "downstreamTarget",
      "selectionRationale", "corroborationNotes", "versionStatus", "learnerResponse",
    ];
    for (const item of readings) {
      if (!isObject(item) || requiredReadingFields.some((key) => !hasValue(item[key])) || !safeHttpUrl(item.canonicalUrl)) {
        return Response.json({ error: "Each reading needs verified source metadata, a valid link, and your response." }, { status: 400 });
      }
    }

    const expectedLanes = new Set(["Current signal", "Durable investing insight", "Cross-domain input", "Career or freeflow"]);
    const actualLanes = new Set(readings.map((item) => cleanText((item as Record<string, unknown>).lane, 80)));
    const publishers = new Set(readings.map((item) => cleanText((item as Record<string, unknown>).publisher, 180).toLowerCase()));
    const canonicalUrls = new Set(readings.map((item) => cleanText((item as Record<string, unknown>).canonicalUrl, 2000)));
    const evidenceOwnerCount = readings.filter((item) => cleanText((item as Record<string, unknown>).sourceRole, 80).toLowerCase() === "evidence owner").length;
    const totalMinutes = readings.reduce((sum, item) => sum + Number((item as Record<string, unknown>).estimatedMinutes || 0), 0);
    if (
      actualLanes.size !== 4
      || [...expectedLanes].some((lane) => !actualLanes.has(lane))
      || publishers.size !== 4
      || canonicalUrls.size !== 4
      || evidenceOwnerCount < 2
      || totalMinutes > 55
      || totalMinutes <= 0
    ) {
      return Response.json({ error: "The Daily Brief must contain all four distinct lanes within 55 minutes." }, { status: 400 });
    }

    const duplicate = await db
      .prepare(
        `SELECT id FROM lab_records
         WHERE owner_id = ? AND record_type = 'daily_brief'
         AND json_extract(payload_json, '$.assignedDate') = ?
         AND json_extract(payload_json, '$.briefVersion') = ? LIMIT 1`,
      )
      .bind(owner, assignedDate, briefVersion)
      .first<{ id: string }>();
    if (duplicate) return Response.json({ error: "This dated Daily Brief is already preserved." }, { status: 409 });

    const now = new Date().toISOString();
    const briefId = crypto.randomUUID();
    const readingIds = readings.map(() => crypto.randomUUID());
    const statements = [
      insertRecord(db, {
        id: briefId,
        owner,
        recordType: "daily_brief",
        parentId: null,
        title: `Daily Brief — ${assignedDate}`,
        payload: { briefVersion, assignedDate, timezone, carryForward, totalMinutes, readingIds },
        now,
      }),
      ...readings.map((item, index) => insertRecord(db, {
        id: readingIds[index],
        owner,
        recordType: "reading_record",
        parentId: briefId,
        title: cleanText((item as Record<string, unknown>).title, 180),
        payload: item as Record<string, unknown>,
        now,
      })),
    ];
    await db.batch(statements);
    return Response.json({ id: briefId, readingIds, committedAt: now }, { status: 201 });
  }

  if (operation === "commit_calibration_review") {
    const title = cleanText(body.title, 180);
    const payload = body.payload;
    const resolvedForecasts = body.resolvedForecasts;
    if (!title || !isObject(payload) || !Array.isArray(resolvedForecasts)) {
      return Response.json({ error: "Complete the Calibration Review and its Forecast outcomes." }, { status: 400 });
    }
    const invalid = validatePayload("calibration_review", payload);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(cleanText(payload.reviewMonth, 20))) {
      return Response.json({ error: "Choose a valid month for the Calibration Review." }, { status: 400 });
    }
    const reviewedJudgmentIds = Array.isArray(payload.reviewedJudgmentIds)
      ? payload.reviewedJudgmentIds.map((value) => cleanText(value, 80)).filter(Boolean)
      : [];
    if (new Set(reviewedJudgmentIds).size !== reviewedJudgmentIds.length) {
      return Response.json({ error: "Choose each prior investment judgment only once." }, { status: 400 });
    }

    const seen = new Set<string>();
    const requested = [] as Array<{
      forecastId: string;
      outcome: ForecastOutcome;
      resolutionEvidence: string;
      resolutionSource: string;
    }>;
    for (const item of resolvedForecasts) {
      if (!isObject(item)) return Response.json({ error: "Every Forecast outcome must be structured evidence." }, { status: 400 });
      const forecastId = cleanText(item.forecastId, 80);
      const outcome = Number(item.outcome) as ForecastOutcome;
      const resolutionEvidence = cleanText(item.resolutionEvidence, 5000);
      const resolutionSource = cleanText(item.resolutionSource, 2000);
      if (!forecastId || seen.has(forecastId) || (outcome !== 0 && outcome !== 1) || !resolutionEvidence || !safeHttpUrl(resolutionSource)) {
        return Response.json({ error: "Each resolved Forecast needs one binary outcome, evidence, and a valid source." }, { status: 400 });
      }
      seen.add(forecastId);
      requested.push({ forecastId, outcome, resolutionEvidence, resolutionSource });
    }

    const [forecastRows, resolutionRows, judgmentRows] = await Promise.all([
      db.prepare(
        "SELECT id, payload_json FROM lab_records WHERE owner_id = ? AND record_type = 'forecast'",
      ).bind(owner).all<{ id: string; payload_json: string }>(),
      db.prepare(
        "SELECT record_id FROM lab_events WHERE owner_id = ? AND event_type = 'forecast_resolution'",
      ).bind(owner).all<{ record_id: string }>(),
      db.prepare(
        "SELECT id FROM lab_records WHERE owner_id = ? AND record_type IN ('snapshot_judgment', 'weekly_underwrite')",
      ).bind(owner).all<{ id: string }>(),
    ]);
    const forecastById = new Map((forecastRows.results ?? []).map((row) => [row.id, parseJson(row.payload_json)]));
    const alreadyResolved = new Set((resolutionRows.results ?? []).map((row) => row.record_id));
    if (requested.some((item) => !forecastById.has(item.forecastId))) {
      return Response.json({ error: "A selected Forecast was not found in your private record." }, { status: 404 });
    }
    if (requested.some((item) => alreadyResolved.has(item.forecastId))) {
      return Response.json({ error: "A selected Forecast already has a preserved resolution." }, { status: 409 });
    }
    const prematurelyNegative = requested.find((item) => {
      const originalForecast = forecastById.get(item.forecastId);
      const resolutionDate = cleanText(originalForecast?.resolutionDate, 20);
      const timezone = cleanText(originalForecast?.timezone, 80);
      return item.outcome === 0 && resolutionDate >= dateInTimeZone(new Date(), timezone);
    });
    if (prematurelyNegative) {
      const originalForecast = forecastById.get(prematurelyNegative.forecastId);
      const resolutionDate = cleanText(originalForecast?.resolutionDate, 20);
      const timezone = cleanText(originalForecast?.timezone, 80);
      return Response.json({ error: `A Forecast cannot be resolved negatively until ${resolutionDate} has fully elapsed in ${timezone}.` }, { status: 400 });
    }
    const availableJudgmentIds = new Set((judgmentRows.results ?? []).map((row) => row.id));
    if (availableJudgmentIds.size > 0 && reviewedJudgmentIds.length === 0) {
      return Response.json({ error: "Compare at least one prior Snapshot or Underwrite in this Calibration Review." }, { status: 400 });
    }
    if (reviewedJudgmentIds.some((id) => !availableJudgmentIds.has(id))) {
      return Response.json({ error: "A selected investment judgment was not found in your private record." }, { status: 404 });
    }

    const scoredForecasts = requested.map((item) => {
      const originalForecast = forecastById.get(item.forecastId);
      const originalProbability = Number(originalForecast?.probability);
      if (!Number.isFinite(originalProbability) || originalProbability < 1 || originalProbability > 99) {
        throw new Error("A selected Forecast has an invalid original probability.");
      }
      return { ...item, originalProbability };
    });
    const brierScore = calculateBrierScore(scoredForecasts.map((item) => ({ probability: item.originalProbability, outcome: item.outcome })));
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const reviewPayload = {
      ...payload,
      resolvedForecasts: scoredForecasts,
      brierScore,
      calibrationStatus: scoredForecasts.length ? "scored" : "no_resolved_forecasts",
    };
    const statements = [
      insertRecord(db, { id, owner, recordType: "calibration_review", parentId: null, title, payload: reviewPayload, now }),
      ...scoredForecasts.map((item) => db.prepare(
        `INSERT INTO lab_events
         (id, owner_id, record_id, event_type, event_json, occurred_at, created_at)
         VALUES (?, ?, ?, 'forecast_resolution', ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        owner,
        item.forecastId,
        JSON.stringify({
          text: `${item.outcome === 1 ? "Occurred" : "Did not occur"}. ${item.resolutionEvidence}`,
          outcome: item.outcome,
          originalProbability: item.originalProbability,
          resolutionEvidence: item.resolutionEvidence,
          resolutionSource: item.resolutionSource,
          calibrationReviewId: id,
          originalPreserved: true,
        }),
        now,
        now,
      )),
    ];
    try {
      await db.batch(statements);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        return Response.json({ error: "A selected Forecast already has a preserved resolution." }, { status: 409 });
      }
      throw error;
    }
    return Response.json({ id, committedAt: now, brierScore, resolvedCount: scoredForecasts.length }, { status: 201 });
  }

  if (operation === "advance_sourcing_lead") {
    const leadId = cleanText(body.leadId, 80);
    const progress = body.progress;
    if (!leadId || !isObject(progress)) return Response.json({ error: "Choose a Sourcing Lead and complete its funnel evidence." }, { status: 400 });
    const allowedKeys = new Set([
      "leadId", "updateKind", "occurredOn", "nextStage", "outreachChannel", "observedEvidence",
      "relationshipQuality", "outcome", "nextAction", "dueDate", "privateEvidenceConfirmed", "timezone",
      "alternateDiscoveryChannel", "correctionField", "correctionReason", "correctedValue",
    ]);
    if (
      JSON.stringify(progress).length > 20_000
      || Object.keys(progress).some((key) => !allowedKeys.has(key))
      || cleanText(progress.leadId, 80) !== leadId
    ) {
      return Response.json({ error: "Sourcing Progress rejects raw messages, contact details, ratings, and undeclared fields." }, { status: 400 });
    }
    const updateKind = cleanText(progress.updateKind, 80);
    const nextStage = cleanText(progress.nextStage, 80) as SourcingStage;
    const observedEvidence = cleanText(progress.observedEvidence, 5000);
    const nextAction = cleanText(progress.nextAction, 1000);
    const correctionReason = cleanText(progress.correctionReason, 2000);
    const timezone = cleanText(progress.timezone, 80);
    if (
      !(SOURCING_UPDATE_KINDS as readonly string[]).includes(updateKind)
      || sourcingStageIndex(nextStage) < 0
      || !observedEvidence
      || String(progress.observedEvidence).trim().length !== observedEvidence.length
      || !nextAction
      || String(progress.nextAction).trim().length !== nextAction.length
      || String(progress.correctionReason ?? "").trim().length !== correctionReason.length
      || !isCanonicalDate(progress.occurredOn)
      || !isCanonicalDate(progress.dueDate)
      || !isValidTimeZone(timezone)
      || progress.occurredOn > dateInTimeZone(new Date(), timezone)
      || progress.dueDate < progress.occurredOn
      || progress.privateEvidenceConfirmed !== true
    ) {
      return Response.json({ error: "Complete a dated, privacy-confirmed Sourcing Progress update with bounded behavioral evidence." }, { status: 400 });
    }
    const lead = await db
      .prepare("SELECT id, parent_id, payload_json FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = 'sourcing_lead'")
      .bind(leadId, owner)
      .first<{ id: string; parent_id: string | null; payload_json: string }>();
    if (!lead) return Response.json({ error: "The Sourcing Lead was not found." }, { status: 404 });
    const leadPayload = parseJson(lead.payload_json);
    if (timezone !== cleanText(leadPayload.timezone, 80)) {
      return Response.json({ error: "Sourcing Progress must preserve the Sourcing Lead's original timezone." }, { status: 400 });
    }
    const priorEvents = await db
      .prepare("SELECT event_type, event_json, occurred_at FROM lab_events WHERE owner_id = ? AND record_id = ? AND event_type IN ('sourcing_progress', 'sourcing_rediscovery', 'sourcing_metadata_correction') ORDER BY occurred_at ASC")
      .bind(owner, leadId)
      .all<{ event_type: string; event_json: string; occurred_at: string }>();
    let currentStage: SourcingStage = "discovered";
    const priorSourcingEvents: SourcingEventLike[] = (priorEvents.results ?? []).map((event, index) => ({
      id: `prior-${index}`,
      recordId: leadId,
      eventType: event.event_type,
      eventData: parseJson(event.event_json),
      occurredAt: event.occurred_at,
    }));
    const effectiveLeadPayload = applySourcingCorrections(leadPayload, priorSourcingEvents);
    const earliestSourcingEvidenceDate = priorSourcingEvents
      .map((event) => cleanText(event.eventData.occurredOn, 20))
      .filter(Boolean)
      .sort()[0] ?? cleanText(progress.occurredOn, 20);
    let latestEvidenceDate = cleanText(effectiveLeadPayload.discoveredOn, 20);
    if (progress.occurredOn < latestEvidenceDate) {
      return Response.json({ error: "Sourcing Progress cannot predate the effective discovery date." }, { status: 400 });
    }
    for (const event of priorEvents.results ?? []) {
      const prior = parseJson(event.event_json);
      if (event.event_type === "sourcing_progress") {
        const priorStage = cleanText(prior.nextStage, 80) as SourcingStage;
        if (sourcingStageIndex(priorStage) > sourcingStageIndex(currentStage)) currentStage = priorStage;
      }
      const priorDate = cleanText(prior.occurredOn, 20);
      if (priorDate > latestEvidenceDate) latestEvidenceDate = priorDate;
    }
    if (progress.occurredOn < latestEvidenceDate) {
      return Response.json({ error: "Sourcing Progress dates cannot move backward; use a metadata correction for historical errors." }, { status: 400 });
    }
    let eventType: "sourcing_progress" | "sourcing_rediscovery" | "sourcing_metadata_correction";
    const eventData: Record<string, unknown> = {
      updateKind,
      occurredOn: cleanText(progress.occurredOn, 20),
      nextStage,
      observedEvidence,
      nextAction,
      dueDate: cleanText(progress.dueDate, 20),
      timezone,
      privateEvidenceConfirmed: true,
      text: observedEvidence,
      originalPreserved: true,
    };
    if (updateKind === "Sourcing Progress") {
      const outreachChannel = cleanText(progress.outreachChannel, 100);
      const relationshipQuality = cleanText(progress.relationshipQuality, 100);
      const outcome = cleanText(progress.outcome, 100);
      const distance = sourcingStageIndex(nextStage) - sourcingStageIndex(currentStage);
      if (
        distance < 0
        || distance > 1
        || !(OUTREACH_CHANNELS as readonly string[]).includes(outreachChannel)
        || !(RELATIONSHIP_QUALITY_STATES as readonly string[]).includes(relationshipQuality)
        || !(SOURCING_OUTCOMES as readonly string[]).includes(outcome)
      ) {
        return Response.json({ error: "Sourcing Progress cannot skip or reverse funnel stages and must use valid interaction evidence." }, { status: 400 });
      }
      const relationshipQualityIndex = (RELATIONSHIP_QUALITY_STATES as readonly string[]).indexOf(relationshipQuality);
      if (sourcingStageIndex(nextStage) >= sourcingStageIndex("outreach_sent") && outreachChannel === "No outreach yet") {
        return Response.json({ error: "Outreach-stage progress must name the outreach channel." }, { status: 400 });
      }
      if (
        sourcingStageIndex(nextStage) >= sourcingStageIndex("response_received")
        && (relationshipQualityIndex < 2 || outcome === "No response")
      ) {
        return Response.json({ error: "Response-stage progress requires a responsive exchange and cannot claim no response." }, { status: 400 });
      }
      if (
        nextStage === "relationship_active"
        && (relationshipQualityIndex < 3 || !new Set(["Active", "Relationship ongoing"]).has(outcome))
      ) {
        return Response.json({ error: "An active relationship requires reciprocal evidence and an active or ongoing outcome." }, { status: 400 });
      }
      if (outcome === "No response" && nextStage !== "outreach_sent") {
        return Response.json({ error: "No response is evidence only for the Outreach Sent stage." }, { status: 400 });
      }
      eventType = "sourcing_progress";
      Object.assign(eventData, { outreachChannel, relationshipQuality, outcome });
    } else if (updateKind === "Rediscovery or channel evidence") {
      const alternateDiscoveryChannel = cleanText(progress.alternateDiscoveryChannel, 100);
      if (
        nextStage !== currentStage
        || !(SOURCING_CHANNELS as readonly string[]).includes(alternateDiscoveryChannel)
        || alternateDiscoveryChannel === cleanText(effectiveLeadPayload.channel, 100)
      ) {
        return Response.json({ error: "Rediscovery evidence must preserve the funnel stage and add a different valid channel." }, { status: 400 });
      }
      eventType = "sourcing_rediscovery";
      eventData.alternateDiscoveryChannel = alternateDiscoveryChannel;
    } else {
      const correctionField = cleanText(progress.correctionField, 100);
      let correctedValue: string | Record<string, unknown> = "";
      let correctedDiscoveryWithinExperiment = true;
      if (correctionField === "Company name") {
        correctedValue = cleanText(progress.correctedValue, 180);
      } else if (correctionField === "Discovery date") {
        correctedValue = cleanText(progress.correctedValue, 20);
      } else if (correctionField === "Sector") {
        correctedValue = cleanText(progress.correctedValue, 200);
      } else if (correctionField === "Company stage") {
        correctedValue = cleanText(progress.correctedValue, 40);
      } else if (correctionField === "Discovery provenance" && isObject(progress.correctedValue)) {
        const allowedProvenanceKeys = new Set(["attributionClass", "channel", "sourceVisibility", "sourceReference"]);
        const attributionClass = cleanText(progress.correctedValue.attributionClass, 100);
        const channel = cleanText(progress.correctedValue.channel, 100);
        const sourceVisibility = cleanText(progress.correctedValue.sourceVisibility, 100);
        const sourceReference = cleanText(progress.correctedValue.sourceReference, 1000);
        if (
          Object.keys(progress.correctedValue).some((key) => !allowedProvenanceKeys.has(key))
          || !(SOURCING_ATTRIBUTION_CLASSES as readonly string[]).includes(attributionClass)
          || !(SOURCING_CHANNELS as readonly string[]).includes(channel)
          || !(SOURCING_VISIBILITIES as readonly string[]).includes(sourceVisibility)
          || !isConsistentSourcingAttribution(attributionClass, channel, sourceVisibility)
          || !sourceReference
          || String(progress.correctedValue.sourceReference ?? "").trim().length !== sourceReference.length
          || (sourceVisibility === "Public source" && !safeHttpUrl(sourceReference))
        ) {
          return Response.json({ error: "A discovery-provenance correction needs a complete, internally consistent source bundle." }, { status: 400 });
        }
        if (lead.parent_id) {
          const experiment = await db
            .prepare("SELECT payload_json FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = 'sourcing_experiment'")
            .bind(lead.parent_id, owner)
            .first<{ payload_json: string }>();
          if (!experiment) {
            return Response.json({ error: "The linked Sourcing Experiment was not found for this provenance correction." }, { status: 409 });
          }
          const experimentChannel = cleanText(parseJson(experiment.payload_json).channel, 100);
          if (channel !== experimentChannel) {
            return Response.json({ error: "Corrected discovery provenance must preserve the linked Sourcing Experiment channel." }, { status: 400 });
          }
        }
        correctedValue = { attributionClass, channel, sourceVisibility, sourceReference };
      }
      if (correctionField === "Discovery date" && lead.parent_id && typeof correctedValue === "string") {
        const experiment = await db
          .prepare("SELECT payload_json FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = 'sourcing_experiment'")
          .bind(lead.parent_id, owner)
          .first<{ payload_json: string }>();
        if (!experiment) {
          return Response.json({ error: "The linked Sourcing Experiment was not found for this discovery-date correction." }, { status: 409 });
        }
        const experimentPayload = parseJson(experiment.payload_json);
        correctedDiscoveryWithinExperiment = (
          correctedValue >= cleanText(experimentPayload.startDate, 20)
          && correctedValue <= cleanText(experimentPayload.endDate, 20)
        );
      }
      if (
        nextStage !== currentStage
        || !(SOURCING_CORRECTION_FIELDS as readonly string[]).includes(correctionField)
        || !correctionReason
        || !hasValue(correctedValue)
        || (correctionField !== "Discovery provenance" && (
          typeof progress.correctedValue !== "string"
          || progress.correctedValue.trim().length !== (correctedValue as string).length
        ))
        || (correctionField === "Discovery date" && (
          typeof correctedValue !== "string"
          || !isCanonicalDate(correctedValue)
          || !correctedDiscoveryWithinExperiment
          || correctedValue > dateInTimeZone(new Date(), timezone)
          || correctedValue > progress.occurredOn
          || correctedValue > earliestSourcingEvidenceDate
        ))
        || (correctionField === "Company stage" && (
          typeof correctedValue !== "string"
          || !new Set(["Pre-seed", "Seed", "Series A", "Unknown"]).has(correctedValue)
        ))
      ) {
        return Response.json({ error: "A metadata correction must preserve the funnel stage, name the corrected field, provide a valid corrected value, and explain the original error." }, { status: 400 });
      }
      eventType = "sourcing_metadata_correction";
      Object.assign(eventData, { correctionField, correctionReason, correctedValue });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO lab_events
       (id, owner_id, record_id, event_type, event_json, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, owner, leadId, eventType, JSON.stringify(eventData), now, now).run();
    return Response.json({
      id,
      occurredAt: now,
      currentStage: eventType === "sourcing_progress" ? nextStage : currentStage,
      eventType,
    }, { status: 201 });
  }

  if (operation === "commit_record") {
    const recordType = cleanText(body.recordType, 60);
    const title = cleanText(body.title, 180);
    const parentId = cleanText(body.parentId, 80) || null;
    const submittedPayload = body.payload;
    if (!title || !isObject(submittedPayload)) {
      return Response.json({ error: "A title and structured evidence are required." }, { status: 400 });
    }
    const submittedPracticeDayId = cleanText(submittedPayload.practiceDayId, 80);
    if (Object.hasOwn(submittedPayload, "practiceDayId") && !submittedPracticeDayId) {
      return Response.json({ error: "The Practice Day link must be a non-empty immutable record id." }, { status: 400 });
    }
    let payload: Record<string, unknown> = { ...submittedPayload };
    delete payload.practiceDayId;
    if (recordType === "calibration_review") {
      return Response.json({ error: "Commit Calibration Reviews through the scoring workflow." }, { status: 400 });
    }
    if (recordType === "coach_feedback" || recordType === "mastery_evidence") {
      return Response.json({ error: "Coach Feedback and Mastery Evidence can be appended only through the bearer-protected Judgment Coach operator." }, { status: 400 });
    }
    if (recordType === "sourcing_lead") {
      payload = {
        ...payload,
        normalizedCompanyDomain: normalizedDomain(payload.companyUrl),
        discoveredAt: new Date().toISOString(),
      };
    }
    if (recordType === "recruiting_opportunity") {
      payload = {
        ...payload,
        normalizedOfficialUrl: normalizeRecruitingUrl(payload.officialUrl),
      };
    }
    if ((RECRUITING_RECORD_TYPES as readonly string[]).includes(recordType)) {
      payload = {
        ...payload,
        recordKey: recruitingRecordKey(recordType, payload),
      };
    }
    if (recordType === "diligence_case") {
      payload = { ...payload, caseKey: cleanText(payload.underwriteId, 80) };
    }
    if (recordType === "diligence_stage") {
      const stage = diligenceStageDefinition(payload.stageKey);
      payload = {
        ...payload,
        stageIndex: stage ? DILIGENCE_STAGE_DEFINITIONS.indexOf(stage) : -1,
        stageLabel: stage?.label ?? "",
        recordKey: `${parentId ?? ""}|${cleanText(payload.stageKey, 80)}`,
      };
    }
    if (recordType === "coach_request") {
      if (!parentId) return Response.json({ error: "A Coach Request must link to committed original work." }, { status: 400 });
      const source = await db.prepare(
        "SELECT id, record_type, parent_id, title, payload_json, committed_at FROM lab_records WHERE id = ? AND owner_id = ?",
      ).bind(parentId, owner).first<{ id: string; record_type: string; parent_id: string | null; title: string; payload_json: string; committed_at: string }>();
      if (!source) return Response.json({ error: "The committed coaching source was not found." }, { status: 404 });
      const dimension = cleanText(payload.dimension, 80);
      if (!isCoachSource(source.record_type, dimension)) {
        return Response.json({ error: "This committed work does not support the selected coaching dimension." }, { status: 400 });
      }
      const companyIdentity = await coachCompanyIdentity(db, owner, source);
      if (!companyIdentity) return Response.json({ error: "Coaching evidence must preserve a source-linked company identity." }, { status: 400 });
      payload = {
        ...payload,
        sourceRecordId: source.id,
        sourceRecordType: source.record_type,
        companyIdentity,
        requestKey: `${source.id}|${dimension}`,
      };
    }
    if (recordType === "revision_attempt") {
      if (!parentId) return Response.json({ error: "A Revision Attempt must link to Coach Feedback." }, { status: 400 });
      const feedback = await db.prepare(
        "SELECT id, record_type, payload_json FROM lab_records WHERE id = ? AND owner_id = ?",
      ).bind(parentId, owner).first<{ id: string; record_type: string; payload_json: string }>();
      if (!feedback) return Response.json({ error: "The linked Coach Feedback was not found." }, { status: 404 });
      if (feedback.record_type !== "coach_feedback") return Response.json({ error: "A Revision Attempt can link only to Coach Feedback." }, { status: 400 });
      const feedbackPayload = parseJson(feedback.payload_json);
      payload = {
        ...payload,
        coachFeedbackId: feedback.id,
        sourceRecordId: cleanText(feedbackPayload.sourceRecordId, 80),
        dimension: cleanText(feedbackPayload.dimension, 80),
        companyIdentity: cleanText(feedbackPayload.companyIdentity, 180),
        revisionKey: feedback.id,
      };
    }
    const invalid = validatePayload(recordType, payload);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });
    if (submittedPracticeDayId) {
      if (!PRACTICE_DAY_LINKABLE_RECORD_TYPES.has(recordType)) {
        return Response.json({ error: "This record type cannot contribute to derived Practice Day progress." }, { status: 400 });
      }
      const practiceDay = await db.prepare(
        "SELECT id FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = 'practice_day' LIMIT 1",
      ).bind(submittedPracticeDayId, owner).first<{ id: string }>();
      if (!practiceDay) {
        return Response.json({ error: "The linked Practice Day was not found in your private curriculum epoch." }, { status: 404 });
      }
      payload = { ...payload, practiceDayId: practiceDay.id };
      if (recordType === "snapshot_judgment") {
        const discovered = await db.prepare(
          `SELECT COUNT(*) AS count FROM lab_records
           WHERE owner_id = ? AND record_type = 'sourcing_lead'
             AND json_extract(payload_json, '$.practiceDayId') = ?`,
        ).bind(owner, practiceDay.id).first<{ count: number }>();
        if (Number(discovered?.count ?? 0) < 3) {
          return Response.json({ error: "Discover and preserve three companies independently in this Practice Day before locking one Snapshot." }, { status: 409 });
        }
      }
    }

    const isRecruitingChild = (RECRUITING_CHILD_RECORD_TYPES as readonly string[]).includes(recordType);
    const isDiligenceChild = recordType === "diligence_stage";
    const isCoachChild = recordType === "coach_request" || recordType === "revision_attempt";
    if (recordType === "recruiting_opportunity" && parentId) {
      return Response.json({ error: "A Recruiting Opportunity is a top-level immutable record." }, { status: 400 });
    }
    if (isRecruitingChild && !parentId) {
      return Response.json({ error: "Recruiting evidence must link to its Recruiting Opportunity." }, { status: 400 });
    }
    if (recordType === "diligence_case" && !parentId) {
      return Response.json({ error: "A Diligence Case must link to its Weekly Underwrite." }, { status: 400 });
    }
    if (isDiligenceChild && !parentId) {
      return Response.json({ error: "A Diligence stage must link to its Diligence Case." }, { status: 400 });
    }
    if (isCoachChild && !parentId) {
      return Response.json({ error: "Judgment Coach evidence must link to its immutable parent." }, { status: 400 });
    }

    if (parentId) {
      const parent = await db
        .prepare("SELECT id, record_type, parent_id, payload_json, committed_at FROM lab_records WHERE id = ? AND owner_id = ?")
        .bind(parentId, owner)
        .first<{ id: string; record_type: string; parent_id: string | null; payload_json: string; committed_at: string }>();
      if (!parent) return Response.json({ error: "The linked record was not found." }, { status: 404 });
      if (new Set(["founder_evidence_review", "weekly_underwrite"]).has(recordType) && parent.record_type !== "snapshot_judgment") {
        return Response.json({ error: "Founder Evidence Reviews and Underwrites must link to a Snapshot Judgment." }, { status: 400 });
      }
      if (recordType === "coach_request") {
        if (
          cleanText(payload.sourceRecordId, 80) !== parent.id
          || cleanText(payload.sourceRecordType, 80) !== parent.record_type
          || !isCoachSource(parent.record_type, payload.dimension)
        ) return Response.json({ error: "A Coach Request must preserve the exact committed source and coaching dimension." }, { status: 400 });
      }
      if (recordType === "revision_attempt") {
        const feedbackPayload = parseJson(parent.payload_json);
        if (
          parent.record_type !== "coach_feedback"
          || cleanText(payload.coachFeedbackId, 80) !== parent.id
          || cleanText(payload.sourceRecordId, 80) !== cleanText(feedbackPayload.sourceRecordId, 80)
          || cleanText(payload.dimension, 80) !== cleanText(feedbackPayload.dimension, 80)
          || cleanText(payload.companyIdentity, 180) !== cleanText(feedbackPayload.companyIdentity, 180)
        ) return Response.json({ error: "A Revision Attempt must preserve its Coach Feedback, source, dimension, and company identity." }, { status: 400 });
      }
      if (isRecruitingChild) {
        if (parent.record_type !== "recruiting_opportunity" || cleanText(payload.opportunityId, 80) !== parentId) {
          return Response.json({ error: "Recruiting evidence can link only to its declared Recruiting Opportunity." }, { status: 400 });
        }
        const opportunityPayload = parseJson(parent.payload_json);
        if (cleanText(opportunityPayload.timezone, 100) !== cleanText(payload.timezone, 100)) {
          return Response.json({ error: "Recruiting evidence must preserve the linked opportunity's timezone." }, { status: 400 });
        }
        const childDateKeys: Record<string, string> = {
          opportunity_observation: "observedOn",
          recruiting_interaction: "occurredOn",
          application_attempt: "attemptedOn",
          interview_practice: "practicedOn",
          portfolio_candidate: "capturedOn",
        };
        const childDate = cleanText(payload[childDateKeys[recordType]], 20);
        if (childDate < cleanText(opportunityPayload.discoveredOn, 20)) {
          return Response.json({ error: "Recruiting evidence cannot predate its opportunity's preserved discovery." }, { status: 400 });
        }
        if (recordType === "opportunity_observation") {
          const expectedFunnelClass = expectedRecruitingFunnelClass(cleanText(payload.opportunityClass, 100));
          const observedFunnelClass = cleanText(payload.funnelClass, 100);
          if (observedFunnelClass !== expectedFunnelClass && observedFunnelClass !== "Archived") {
            return Response.json({ error: "An Opportunity Observation must preserve an evidence-backed class and its matching funnel, or archive it." }, { status: 400 });
          }
        }
        if (recordType === "application_attempt") {
          const latestObservation = await db
            .prepare(
              `SELECT payload_json FROM lab_records
               WHERE owner_id = ? AND parent_id = ? AND record_type = 'opportunity_observation'
               AND json_extract(payload_json, '$.observedOn') <= ?
               ORDER BY json_extract(payload_json, '$.observedOn') DESC, committed_at DESC LIMIT 1`,
            )
            .bind(owner, parentId, childDate)
            .first<{ payload_json: string }>();
          const effectiveImmigrationState = latestObservation
            ? cleanText(parseJson(latestObservation.payload_json).immigrationState, 100)
            : cleanText(opportunityPayload.immigrationState, 100);
          if (cleanText(payload.immigrationState, 100) !== effectiveImmigrationState) {
            return Response.json({ error: "An Application Attempt must preserve the opportunity's effective Immigration Evidence State." }, { status: 400 });
          }
        }
      }
      if (recordType === "sourcing_lead") {
        if (parent.record_type !== "sourcing_experiment" || cleanText(payload.experimentId, 80) !== parentId) {
          return Response.json({ error: "A Sourcing Lead can link only to its declared Sourcing Experiment." }, { status: 400 });
        }
        const experimentPayload = parseJson(parent.payload_json);
        if (cleanText(experimentPayload.timezone, 80) !== cleanText(payload.timezone, 80)) {
          return Response.json({ error: "A Sourcing Lead must preserve the linked experiment's timezone." }, { status: 400 });
        }
        if (cleanText(experimentPayload.channel, 100) !== cleanText(payload.channel, 100)) {
          return Response.json({ error: "A Sourcing Lead must preserve the linked experiment's discovery channel." }, { status: 400 });
        }
        const experimentStart = cleanText(experimentPayload.startDate, 20);
        const experimentEnd = cleanText(experimentPayload.endDate, 20);
        const discoveredOn = cleanText(payload.discoveredOn, 20);
        if (discoveredOn < experimentStart || discoveredOn > experimentEnd) {
          return Response.json({ error: "A Sourcing Lead discovery must fall within the linked experiment's committed date window." }, { status: 400 });
        }
        if (cleanText(payload.discoveredAt, 40) <= parent.committed_at) {
          return Response.json({ error: "A Sourcing Lead must be recorded after its linked Sourcing Experiment was committed." }, { status: 400 });
        }
      }
      if (recordType === "snapshot_judgment") {
        if (parent.record_type !== "sourcing_lead" || cleanText(payload.sourcingLeadId, 80) !== parentId) {
          return Response.json({ error: "A sourced Snapshot can link only to its declared Sourcing Lead." }, { status: 400 });
        }
        const originalLeadPayload = parseJson(parent.payload_json);
        if (submittedPracticeDayId && cleanText(originalLeadPayload.practiceDayId, 80) !== submittedPracticeDayId) {
          return Response.json({ error: "The selected company must have been independently discovered in this same Practice Day." }, { status: 400 });
        }
        const progressRows = await db
          .prepare("SELECT event_type, event_json, occurred_at FROM lab_events WHERE owner_id = ? AND record_id = ? AND event_type IN ('sourcing_progress', 'sourcing_metadata_correction')")
          .bind(owner, parentId)
          .all<{ event_type: string; event_json: string; occurred_at: string }>();
        let sourceStage: SourcingStage = "discovered";
        const sourceEvents: SourcingEventLike[] = (progressRows.results ?? []).map((row, index) => {
          const eventData = parseJson(row.event_json);
          if (row.event_type === "sourcing_progress") {
            const candidate = cleanText(eventData.nextStage, 80) as SourcingStage;
            if (sourcingStageIndex(candidate) > sourcingStageIndex(sourceStage)) sourceStage = candidate;
          }
          return {
            id: `source-${index}`,
            recordId: parentId,
            eventType: row.event_type,
            eventData,
            occurredAt: row.occurred_at,
          };
        });
        const leadPayload = applySourcingCorrections(originalLeadPayload, sourceEvents);
        if (sourcingStageIndex(sourceStage) < sourcingStageIndex("qualified")) {
          return Response.json({ error: "A Sourcing Lead must reach Qualified through preserved funnel evidence before it can parent a Snapshot." }, { status: 400 });
        }
        if (cleanText(leadPayload.company, 180).toLowerCase() !== cleanText(payload.company, 180).toLowerCase()) {
          return Response.json({ error: "The Snapshot company must match its linked Sourcing Lead." }, { status: 400 });
        }
        const expectedDiscoverySource = `${cleanText(leadPayload.attributionClass, 100)} · ${cleanText(leadPayload.channel, 100)}`;
        if (cleanText(payload.discoverySource, 240) !== expectedDiscoverySource) {
          return Response.json({ error: "The Snapshot must preserve its Sourcing Lead attribution and channel." }, { status: 400 });
        }
      }
      if (recordType === "founder_evidence_review") {
        const founderCompany = cleanText(payload.company, 180).toLowerCase();
        const snapshotCompany = cleanText(parseJson(parent.payload_json).company, 180).toLowerCase();
        if (!founderCompany || founderCompany !== snapshotCompany) {
          return Response.json({ error: "The Founder Evidence Review company must match its linked Snapshot." }, { status: 400 });
        }
      }
      if (recordType === "diligence_case") {
        const underwritePayload = parseJson(parent.payload_json);
        const snapshotId = cleanText(payload.snapshotId, 80);
        if (
          parent.record_type !== "weekly_underwrite"
          || cleanText(payload.underwriteId, 80) !== parentId
          || parent.parent_id !== snapshotId
          || cleanText(underwritePayload.snapshotId, 80) !== snapshotId
        ) {
          return Response.json({ error: "A Diligence Case must link one matching locked Snapshot and Weekly Underwrite." }, { status: 400 });
        }
        const snapshotRecord = await db
          .prepare("SELECT payload_json FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = 'snapshot_judgment'")
          .bind(snapshotId, owner)
          .first<{ payload_json: string }>();
        if (!snapshotRecord) return Response.json({ error: "The linked Snapshot was not found in your private record." }, { status: 404 });
        const snapshotPayload = parseJson(snapshotRecord.payload_json);
        if (cleanText(snapshotPayload.company, 180).toLowerCase() !== cleanText(payload.company, 180).toLowerCase()) {
          return Response.json({ error: "The Diligence Case company must match its locked Snapshot." }, { status: 400 });
        }
        const snapshotTimezone = cleanText(snapshotPayload.timezone, 100);
        if (snapshotTimezone && snapshotTimezone !== cleanText(payload.timezone, 100)) {
          return Response.json({ error: "The Diligence Case must preserve the linked Snapshot's timezone." }, { status: 400 });
        }
      }
      if (recordType === "diligence_stage") {
        if (parent.record_type !== "diligence_case" || cleanText(payload.caseId, 80) !== parentId) {
          return Response.json({ error: "A Diligence stage can link only to its declared Diligence Case." }, { status: 400 });
        }
        const casePayload = parseJson(parent.payload_json);
        if (cleanText(casePayload.timezone, 100) !== cleanText(payload.timezone, 100)) {
          return Response.json({ error: "A Diligence stage must preserve its case timezone." }, { status: 400 });
        }
        if (cleanText(payload.committedOn, 20) < cleanText(casePayload.openedOn, 20)) {
          return Response.json({ error: "A Diligence stage cannot predate its case." }, { status: 400 });
        }
        const stageRows = await db
          .prepare("SELECT id, parent_id, title, payload_json, committed_at FROM lab_records WHERE owner_id = ? AND parent_id = ? AND record_type = 'diligence_stage'")
          .bind(owner, parentId)
          .all<{ id: string; parent_id: string | null; title: string; payload_json: string; committed_at: string }>();
        const sequence = diligenceSequenceStatus((stageRows.results ?? []).map((row) => ({
          id: row.id,
          recordType: "diligence_stage",
          parentId: row.parent_id,
          title: row.title,
          payload: parseJson(row.payload_json),
          committedAt: row.committed_at,
        })), parentId);
        if (!sequence.validPrefix) {
          return Response.json({ error: "The preserved Diligence Case sequence is inconsistent; no later stage may be added." }, { status: 409 });
        }
        if (sequence.committedKeys.includes(cleanText(payload.stageKey, 80))) {
          return Response.json({ error: "This Diligence stage is already immutable." }, { status: 409 });
        }
        if (!sequence.nextStage) {
          return Response.json({ error: "This Diligence Case already completed every stage." }, { status: 409 });
        }
        if (cleanText(payload.stageKey, 80) !== sequence.nextStage.key) {
          return Response.json({ error: `Commit ${sequence.nextStage.label} before any later Diligence stage.` }, { status: 400 });
        }
      }
    }
    if (recordType === "founder_evidence_review" && cleanText(payload.linkedSnapshotId, 80) !== (parentId ?? "")) {
      return Response.json({ error: "The Founder Evidence Review Snapshot link is inconsistent." }, { status: 400 });
    }
    if (recordType === "weekly_underwrite" && cleanText(payload.snapshotId, 80) !== (parentId ?? "")) {
      return Response.json({ error: "The Weekly Underwrite Snapshot link is inconsistent." }, { status: 400 });
    }
    if (recordType === "sourcing_lead" && cleanText(payload.experimentId, 80) !== (parentId ?? "")) {
      return Response.json({ error: "The Sourcing Experiment link is inconsistent." }, { status: 400 });
    }
    if (recordType === "snapshot_judgment" && cleanText(payload.sourcingLeadId, 80) !== (parentId ?? "")) {
      return Response.json({ error: "The Snapshot Sourcing Lead link is inconsistent." }, { status: 400 });
    }
    if (recordType === "weekly_underwrite" && hasValue(payload.founderReviewId)) {
      const founderReviewId = cleanText(payload.founderReviewId, 80);
      const founderReview = await db
        .prepare("SELECT id, parent_id FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = 'founder_evidence_review'")
        .bind(founderReviewId, owner)
        .first<{ id: string; parent_id: string | null }>();
      if (!founderReview) return Response.json({ error: "The linked Founder Evidence Review was not found." }, { status: 404 });
      if (founderReview.parent_id !== parentId) {
        return Response.json({ error: "The Founder Evidence Review belongs to a different company Snapshot." }, { status: 400 });
      }
    }
    if (recordType === "weekly_plan" && hasValue(payload.sourcingExperimentId)) {
      const experiment = await db
        .prepare("SELECT id FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = 'sourcing_experiment'")
        .bind(cleanText(payload.sourcingExperimentId, 80), owner)
        .first<{ id: string }>();
      if (!experiment) return Response.json({ error: "The active Sourcing Experiment was not found in your private record." }, { status: 404 });
    }
    if (recordType === "portfolio_candidate") {
      const allowedArtifactTypes = new Set(PORTFOLIO_SOURCE_RECORD_TYPES as readonly string[]);
      const artifact = await db
        .prepare("SELECT id, record_type FROM lab_records WHERE id = ? AND owner_id = ?")
        .bind(cleanText(payload.sourceRecordId, 80), owner)
        .first<{ id: string; record_type: string }>();
      if (!artifact || !allowedArtifactTypes.has(artifact.record_type)) {
        return Response.json({ error: "A Portfolio Candidate must link to an eligible artifact in your private record." }, { status: 404 });
      }
      if (cleanText(payload.artifactType, 100) !== portfolioArtifactTypeForRecord(artifact.record_type)) {
        return Response.json({ error: "A Portfolio Candidate's artifact type must match its linked private record." }, { status: 400 });
      }
    }
    if (recordType === "diligence_case") {
      const duplicate = await db.prepare(
        `SELECT id FROM lab_records
         WHERE owner_id = ? AND record_type = 'diligence_case'
         AND json_extract(payload_json, '$.caseKey') = ? LIMIT 1`,
      ).bind(owner, cleanText(payload.caseKey, 80)).first<{ id: string }>();
      if (duplicate) return Response.json({ error: "This Weekly Underwrite already has a Diligence Case." }, { status: 409 });
    }
    if (recordType === "diligence_stage") {
      const duplicate = await db.prepare(
        `SELECT id FROM lab_records
         WHERE owner_id = ? AND record_type = 'diligence_stage' AND parent_id = ?
         AND json_extract(payload_json, '$.stageKey') = ? LIMIT 1`,
      ).bind(owner, parentId, cleanText(payload.stageKey, 80)).first<{ id: string }>();
      if (duplicate) return Response.json({ error: "This Diligence stage is already immutable." }, { status: 409 });
    }
    if (recordType === "coach_request") {
      const duplicate = await db.prepare(
        `SELECT id FROM lab_records WHERE owner_id = ? AND record_type = 'coach_request'
         AND parent_id = ? AND json_extract(payload_json, '$.dimension') = ? LIMIT 1`,
      ).bind(owner, parentId, cleanText(payload.dimension, 80)).first<{ id: string }>();
      if (duplicate) return Response.json({ error: "This committed work already has a Coach Request for that dimension." }, { status: 409 });
    }
    if (recordType === "revision_attempt") {
      const duplicate = await db.prepare(
        "SELECT id FROM lab_records WHERE owner_id = ? AND record_type = 'revision_attempt' AND parent_id = ? LIMIT 1",
      ).bind(owner, parentId).first<{ id: string }>();
      if (duplicate) return Response.json({ error: "This Coach Feedback already has a preserved Revision Attempt." }, { status: 409 });
    }
    if (recordType === "sourcing_lead") {
      const duplicate = await db.prepare(
        `SELECT id FROM lab_records
         WHERE owner_id = ? AND record_type = 'sourcing_lead'
         AND json_extract(payload_json, '$.normalizedCompanyDomain') = ? LIMIT 1`,
      ).bind(owner, cleanText(payload.normalizedCompanyDomain, 255)).first<{ id: string }>();
      if (duplicate) return Response.json({ error: "This company already has a Sourcing Lead; append new channel or relationship evidence instead." }, { status: 409 });
    }
    if (recordType === "recruiting_opportunity") {
      const duplicate = await db.prepare(
        `SELECT id FROM lab_records
         WHERE owner_id = ? AND record_type = 'recruiting_opportunity'
         AND json_extract(payload_json, '$.recordKey') = ? LIMIT 1`,
      ).bind(owner, cleanText(payload.recordKey, 5000)).first<{ id: string }>();
      if (duplicate) return Response.json({ error: "This Recruiting Opportunity cycle already exists; add a dated Opportunity Observation instead." }, { status: 409 });
      const legacyDuplicates = await db.prepare(
        `SELECT id, payload_json FROM lab_records
         WHERE owner_id = ? AND record_type = 'recruiting_opportunity'
         AND json_extract(payload_json, '$.normalizedOfficialUrl') = ?
         AND coalesce(json_extract(payload_json, '$.cycleKey'), '') = ''`,
      ).bind(owner, cleanText(payload.normalizedOfficialUrl, 2000)).all<{ id: string; payload_json: string }>();
      const legacyDuplicate = (legacyDuplicates.results ?? []).find((row) => (
        legacyRecruitingCycleKey(parseJson(row.payload_json)) === cleanText(payload.cycleKey, 120)
      ));
      if (legacyDuplicate) return Response.json({ error: "This known legacy Recruiting Opportunity already represents the same role cycle; add a dated Observation or a genuinely new cycle." }, { status: 409 });
    }
    if (isRecruitingChild) {
      const duplicate = await db.prepare(
        `SELECT id FROM lab_records
         WHERE owner_id = ? AND record_type = ? AND parent_id = ?
         AND json_extract(payload_json, '$.recordKey') = ? LIMIT 1`,
      ).bind(owner, recordType, parentId, cleanText(payload.recordKey, 5000)).first<{ id: string }>();
      if (duplicate) return Response.json({ error: "This dated Recruiting evidence is already preserved for the opportunity." }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    if (recordType === "revision_attempt") {
      const dimension = cleanText(payload.dimension, 80) as CoachDimension;
      const masteryId = crypto.randomUUID();
      const evaluatedOn = cleanText(payload.attemptedOn, 20);
      const timezone = cleanText(payload.timezone, 100);
      for (let writeAttempt = 0; writeAttempt < 5; writeAttempt += 1) {
        const history = await loadOwnerCoachHistory(db, owner);
        if (historyHasCoachChild(history, "revision_attempt", parentId!)) {
          return Response.json({ error: "This Coach Feedback already has a preserved Revision Attempt." }, { status: 409 });
        }
        const expectedHistoryVersion = coachDimensionHistoryVersion(history, dimension);
        const evaluation = evaluateMasteryFromHistory(history, dimension, [{
          id,
          recordType: "revision_attempt",
          parentId: parentId!,
          title,
          payload,
          committedAt: now,
        }]);
        const masteryPayload = masteryEvidencePayload({
          evaluation,
          triggerRecordId: id,
          triggerRecordType: "revision_attempt",
          evaluatedOn,
          timezone,
        });
        const masteryError = validatePayload("mastery_evidence", masteryPayload);
        if (masteryError) return Response.json({ error: masteryError }, { status: 400 });
        const writes = await db.batch([
          insertCoachRecordWhenHistoryCurrent(db, {
            id, owner, recordType: "revision_attempt", parentId: parentId!, title, payload, now,
            dimension, expectedHistoryVersion,
          }),
          insertCoachRecordWhenTriggerExists(db, {
            id: masteryId, owner, recordType: "mastery_evidence", parentId: id,
            title: `Mastery Evidence — ${dimension.replaceAll("_", " ")}`, payload: masteryPayload, now,
            triggerId: id,
          }),
        ]);
        if (Number(writes[0]?.meta?.changes ?? 0) !== 1 || Number(writes[1]?.meta?.changes ?? 0) !== 1) continue;
        return Response.json({
          id,
          committedAt: now,
          masteryEvidenceId: masteryId,
          evidenceState: evaluation.evidenceState,
          remainingGaps: evaluation.remainingGaps,
        }, { status: 201 });
      }
      return Response.json({ error: "Coaching evidence changed concurrently; retry this bounded Revision Attempt." }, { status: 409 });
    }
    try {
      await insertRecord(db, { id, owner, recordType, parentId, title, payload, now }).run();
    } catch (error) {
      if (recordType === "sourcing_lead" && error instanceof Error && error.message.toLowerCase().includes("unique")) {
        return Response.json({ error: "This company already has a Sourcing Lead; append new channel or relationship evidence instead." }, { status: 409 });
      }
      if ((RECRUITING_RECORD_TYPES as readonly string[]).includes(recordType) && error instanceof Error && error.message.toLowerCase().includes("unique")) {
        return Response.json({ error: "This Recruiting evidence already exists; preserve only a materially new dated observation." }, { status: 409 });
      }
      if ((DILIGENCE_RECORD_TYPES as readonly string[]).includes(recordType) && error instanceof Error && error.message.toLowerCase().includes("unique")) {
        return Response.json({ error: "This Diligence Case or stage already exists; preserved evidence cannot be replaced." }, { status: 409 });
      }
      if ((COACH_RECORD_TYPES as readonly string[]).includes(recordType) && error instanceof Error && error.message.toLowerCase().includes("unique")) {
        return Response.json({ error: "This Judgment Coach identity already exists; preserved evidence cannot be replaced." }, { status: 409 });
      }
      throw error;
    }
    return Response.json({
      id,
      committedAt: now,
      record: mapLabRecord({
        id,
        record_type: recordType,
        parent_id: parentId,
        title,
        payload_json: JSON.stringify(payload),
        committed_at: now,
        created_at: now,
      } satisfies DbLabRecord),
    }, { status: 201 });
  }

  if (operation === "append_event") {
    const recordId = cleanText(body.recordId, 80);
    const eventType = cleanText(body.eventType, 60);
    const eventData = body.eventData;
    if (!recordId || !allowedEventTypes.has(eventType) || !isObject(eventData) || JSON.stringify(eventData).length > 20_000) {
      return Response.json({ error: "Choose a record, update type, and valid update body." }, { status: 400 });
    }
    const parent = await db
      .prepare("SELECT id, record_type, payload_json FROM lab_records WHERE id = ? AND owner_id = ?")
      .bind(recordId, owner)
      .first<{ id: string; record_type: string; payload_json: string }>();
    if (!parent) return Response.json({ error: "The record was not found." }, { status: 404 });
    const assignmentOnlyEvent = new Set([
      "learner_response", "artifact_link", "replacement_link", "revisit",
      "continuation", "completion", "missed_practice",
    ]).has(eventType);
    if (
      (parent.record_type === "daily_brief" || parent.record_type === "reading_record")
      && (ASSIGNMENT_EVENT_TYPES as readonly string[]).includes(eventType)
      || assignmentOnlyEvent
    ) {
      const assignmentEventError = validateAssignmentEvent(parent.record_type, eventType, eventData);
      if (assignmentEventError) return Response.json({ error: assignmentEventError }, { status: 400 });
      if (eventType === "artifact_link") {
        const artifact = await db.prepare(
          "SELECT id, record_type FROM lab_records WHERE id = ? AND owner_id = ? LIMIT 1",
        ).bind(cleanText(eventData.artifactRecordId, 80), owner).first<{ id: string; record_type: string }>();
        if (!artifact || artifact.record_type !== cleanText(eventData.artifactType, 80)) {
          return Response.json({ error: "The linked private artifact was not found with the declared type." }, { status: 404 });
        }
      }
      if (eventType === "completion" || eventType === "missed_practice") {
        const assignmentPayload = parseJson(parent.payload_json);
        const assignedDate = cleanText(assignmentPayload.assignedDate, 20);
        if (eventType === "completion" && eventData.completedLearnerDate !== assignedDate) {
          return Response.json({ error: "Completion must preserve the Daily Brief's actual learner date." }, { status: 400 });
        }
        if (eventType === "completion") {
          const [readings, responses] = await Promise.all([
            db.prepare(
              `SELECT id FROM lab_records WHERE owner_id = ? AND parent_id = ?
               AND record_type = 'reading_record' ORDER BY id ASC`,
            ).bind(owner, recordId).all<{ id: string }>(),
            db.prepare(
              `SELECT event.record_id FROM lab_events event
               JOIN lab_records reading ON reading.id = event.record_id AND reading.owner_id = event.owner_id
               WHERE event.owner_id = ? AND reading.parent_id = ? AND reading.record_type = 'reading_record'
               AND event.event_type = 'learner_response' ORDER BY event.record_id ASC, event.id ASC`,
            ).bind(owner, recordId).all<{ record_id: string }>(),
          ]);
          const completionError = completionReadiness(
            (readings.results ?? []).map((reading) => reading.id),
            (responses.results ?? []).map((response) => response.record_id),
          );
          if (completionError) return Response.json({ error: completionError }, { status: 409 });
        }
        if (eventType === "missed_practice") {
          const timezone = cleanText(assignmentPayload.timezone, 100);
          if (eventData.learnerDate !== assignedDate || !isValidTimeZone(timezone) || dateInTimeZone(new Date(), timezone) <= assignedDate) {
            return Response.json({ error: "Missed practice can be preserved only after the matching learner date has ended." }, { status: 400 });
          }
        }
        const existingTerminal = await db.prepare(
          `SELECT id, event_type FROM lab_events WHERE owner_id = ? AND record_id = ?
           AND event_type IN ('completion', 'missed_practice') LIMIT 1`,
        ).bind(owner, recordId).first<{ id: string; event_type: string }>();
        if (existingTerminal) {
          return Response.json({ error: `This Daily Brief already has immutable ${existingTerminal.event_type.replaceAll("_", " ")} evidence.` }, { status: 409 });
        }
      }
    }
    if (parent.record_type === "sourcing_lead") {
      return Response.json({ error: "Append Sourcing Lead evidence through the staged sourcing workflow so funnel integrity is preserved." }, { status: 400 });
    }
    if ((RECRUITING_RECORD_TYPES as readonly string[]).includes(parent.record_type)) {
      return Response.json({ error: "Append Recruiting evidence through the typed Recruiting workspace so dates, approvals, and funnel integrity are preserved." }, { status: 400 });
    }
    if (parent.record_type === "opportunity_monitor_run" || parent.record_type === "opportunity_monitor_registration") {
      return Response.json({ error: "Opportunity Monitor evidence is immutable and can be created only through its bounded registration and run workflows." }, { status: 400 });
    }
    if ((COACH_RECORD_TYPES as readonly string[]).includes(parent.record_type)) {
      const allowedCoachEventKeys = new Set(["text", "originalPreserved", "privateEvidenceConfirmed"]);
      if (
        Object.keys(eventData).some((key) => !allowedCoachEventKeys.has(key))
        || typeof eventData.text !== "string"
        || !eventData.text.trim()
        || eventData.text.length > 5000
        || eventData.originalPreserved !== true
        || eventData.privateEvidenceConfirmed !== true
      ) {
        return Response.json({ error: "Judgment Coach corrections and hindsight require a bounded note, preservation marker, and privacy confirmation; they cannot replace typed evidence or alter prior Mastery Evidence." }, { status: 400 });
      }
    }
    if (parent.record_type === "founder_evidence_review") {
      const allowedFounderEventKeys = new Set(["text", "originalPreserved", "privateEvidenceConfirmed"]);
      if (
        Object.keys(eventData).some((key) => !allowedFounderEventKeys.has(key))
        || typeof eventData.text !== "string"
        || !eventData.text.trim()
        || eventData.text.length > 5000
        || eventData.originalPreserved !== true
        || eventData.privateEvidenceConfirmed !== true
      ) {
        return Response.json({ error: "Founder Evidence updates require a concise behavioral note, preservation marker, and privacy confirmation; transcripts, ratings, and undeclared fields are rejected." }, { status: 400 });
      }
    }
    if ((DILIGENCE_RECORD_TYPES as readonly string[]).includes(parent.record_type)) {
      const allowedDiligenceEventKeys = new Set(["text", "originalPreserved", "privateEvidenceConfirmed"]);
      if (
        Object.keys(eventData).some((key) => !allowedDiligenceEventKeys.has(key))
        || typeof eventData.text !== "string"
        || !eventData.text.trim()
        || eventData.text.length > 5000
        || eventData.originalPreserved !== true
        || eventData.privateEvidenceConfirmed !== true
      ) {
        return Response.json({ error: "Diligence updates require a bounded note, preservation marker, and privacy confirmation; they never alter or unlock a stage." }, { status: 400 });
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await db
        .prepare(
          `INSERT INTO lab_events
           (id, owner_id, record_id, event_type, event_json, occurred_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, owner, recordId, eventType, JSON.stringify(eventData), now, now)
        .run();
    } catch (error) {
      if (
        (eventType === "completion" || eventType === "missed_practice")
        && error instanceof Error
        && error.message.toLowerCase().includes("unique")
      ) {
        return Response.json({ error: "This Daily Brief already has an immutable terminal outcome." }, { status: 409 });
      }
      if (
        eventType === "learner_response"
        && error instanceof Error
        && error.message.toLowerCase().includes("unique")
      ) {
        return Response.json({ error: "This Reading Record already has its immutable learner response." }, { status: 409 });
      }
      throw error;
    }
    return Response.json({
      id,
      occurredAt: now,
      event: mapLabEvent({
        id,
        record_id: recordId,
        event_type: eventType,
        event_json: JSON.stringify(eventData),
        occurred_at: now,
        created_at: now,
      } satisfies DbLabEvent),
    }, { status: 201 });
  }

  return Response.json({ error: "Unsupported operation." }, { status: 400 });
}
