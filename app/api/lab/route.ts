import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  calculateBrierScore,
  dateInTimeZone,
  isCanonicalDate,
  isValidTimeZone,
  type ForecastOutcome,
} from "@/app/calibration";
import { ensureLabSchema } from "@/db/runtime";
import { FOUNDER_DIMENSIONS, FOUNDER_SOURCE_TYPES } from "@/app/founderEvidence";

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
};

const allowedEventTypes = new Set([
  "reflection",
  "source_status",
  "metadata_correction",
  "coach_feedback",
  "later_usefulness",
  "missed_practice",
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

function validatePayload(recordType: string, payload: Record<string, unknown>): string | null {
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
  const owner = await ownerId();
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

  if (operation === "commit_record") {
    const recordType = cleanText(body.recordType, 60);
    const title = cleanText(body.title, 180);
    const parentId = cleanText(body.parentId, 80) || null;
    const payload = body.payload;
    if (!title || !isObject(payload)) {
      return Response.json({ error: "A title and structured evidence are required." }, { status: 400 });
    }
    if (recordType === "calibration_review") {
      return Response.json({ error: "Commit Calibration Reviews through the scoring workflow." }, { status: 400 });
    }
    const invalid = validatePayload(recordType, payload);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });

    if (parentId) {
      const parent = await db
        .prepare("SELECT id, record_type, payload_json FROM lab_records WHERE id = ? AND owner_id = ?")
        .bind(parentId, owner)
        .first<{ id: string; record_type: string; payload_json: string }>();
      if (!parent) return Response.json({ error: "The linked record was not found." }, { status: 404 });
      if (new Set(["founder_evidence_review", "weekly_underwrite"]).has(recordType) && parent.record_type !== "snapshot_judgment") {
        return Response.json({ error: "Founder Evidence Reviews and Underwrites must link to a Snapshot Judgment." }, { status: 400 });
      }
      if (recordType === "founder_evidence_review") {
        const founderCompany = cleanText(payload.company, 180).toLowerCase();
        const snapshotCompany = cleanText(parseJson(parent.payload_json).company, 180).toLowerCase();
        if (!founderCompany || founderCompany !== snapshotCompany) {
          return Response.json({ error: "The Founder Evidence Review company must match its linked Snapshot." }, { status: 400 });
        }
      }
    }
    if (recordType === "founder_evidence_review" && cleanText(payload.linkedSnapshotId, 80) !== (parentId ?? "")) {
      return Response.json({ error: "The Founder Evidence Review Snapshot link is inconsistent." }, { status: 400 });
    }
    if (recordType === "weekly_underwrite" && cleanText(payload.snapshotId, 80) !== (parentId ?? "")) {
      return Response.json({ error: "The Weekly Underwrite Snapshot link is inconsistent." }, { status: 400 });
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

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await insertRecord(db, { id, owner, recordType, parentId, title, payload, now }).run();
    return Response.json({ id, committedAt: now }, { status: 201 });
  }

  if (operation === "append_event") {
    const recordId = cleanText(body.recordId, 80);
    const eventType = cleanText(body.eventType, 60);
    const eventData = body.eventData;
    if (!recordId || !allowedEventTypes.has(eventType) || !isObject(eventData) || JSON.stringify(eventData).length > 20_000) {
      return Response.json({ error: "Choose a record, update type, and valid update body." }, { status: 400 });
    }
    const parent = await db
      .prepare("SELECT id, record_type FROM lab_records WHERE id = ? AND owner_id = ?")
      .bind(recordId, owner)
      .first<{ id: string; record_type: string }>();
    if (!parent) return Response.json({ error: "The record was not found." }, { status: 404 });
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
