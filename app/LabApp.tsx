"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { calculateBrierScore, dateInTimeZone, type ForecastOutcome } from "./calibration";
import { dailyBrief } from "./dailyBrief";
import {
  emptyFounderDimensions,
  FOUNDER_DIMENSIONS,
  FOUNDER_SOURCE_TYPES,
  type FounderDimensionObservation,
  type FounderSourceType,
} from "./founderEvidence";

type View = "today" | "brief" | "snapshot" | "forecast" | "map" | "founder" | "underwrite" | "calibrate" | "plan" | "history";

type LabRecord = {
  id: string;
  recordType: string;
  parentId: string | null;
  title: string;
  payload: Record<string, unknown>;
  committedAt: string;
  createdAt: string;
};

type LabEvent = {
  id: string;
  recordId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

type LabData = { records: LabRecord[]; events: LabEvent[] };

type EvidenceRow = {
  observation: string;
  sourceUrl: string;
  direction: "supports" | "challenges" | "complicates";
  reliabilityLimits: string;
  inference: string;
};

type ResolutionDraft = {
  selected: boolean;
  outcome: ForecastOutcome;
  resolutionEvidence: string;
  resolutionSource: string;
};

const navItems: Array<{ id: View; key: string; label: string; hint: string }> = [
  { id: "today", key: "T", label: "Today", hint: "The next judgment" },
  { id: "brief", key: "B", label: "Brief", hint: "Four real readings" },
  { id: "snapshot", key: "S", label: "Snapshot", hint: "Lock the first pass" },
  { id: "forecast", key: "F", label: "Forecast", hint: "Put odds on it" },
  { id: "map", key: "M", label: "2nd Order", hint: "Trace consequences" },
  { id: "founder", key: "E", label: "Founder", hint: "Observe behavior" },
  { id: "underwrite", key: "U", label: "Underwrite", hint: "Test the crux" },
  { id: "calibrate", key: "C", label: "Calibrate", hint: "Score prior judgment" },
  { id: "plan", key: "P", label: "Practice", hint: "Choose the week mode" },
  { id: "history", key: "H", label: "History", hint: "Nothing rewritten" },
];

const practiceModes = {
  "Normal Week": {
    totalMinutes: 690,
    dailyLoops: 5,
    promise: "Five 90-minute judgment loops plus a four-hour weekend block.",
    allocation: ["Daily loops · 450m", "Underwrite · 165m", "Recruiting · 60m", "Reflection · 15m"],
  },
  "Monthly Calibration Week": {
    totalMinutes: 690,
    dailyLoops: 5,
    promise: "Keep all weekday repetitions and use the weekend to score earlier judgment.",
    allocation: ["Daily loops · 450m", "Underwrite · 120m", "Calibration · 60m", "Recruiting + plan · 60m"],
  },
  "Recruiting Surge": {
    totalMinutes: 690,
    dailyLoops: 3,
    promise: "Substitute deadline work without exceeding the normal weekly load.",
    allocation: ["Three loops · 270m", "Recruiting · 315m", "Underwrite · 90m", "Reflection · 15m"],
  },
  "Exam Mode": {
    totalMinutes: 180,
    dailyLoops: 1,
    promise: "Protect academics, preserve the minimum practice floor, and create no catch-up debt.",
    allocation: ["Brief · 60m", "Snapshot + Forecast · 30m", "Urgent opportunity · 60m", "Restart plan · 30m"],
  },
} as const;

type PracticeMode = keyof typeof practiceModes;

const emptySnapshot = {
  company: "",
  stage: "Pre-seed",
  sector: "",
  discoverySource: "",
  thesis: "",
  ventureMechanism: "",
  disposition: "Watch",
  confidence: 50,
  crux: "",
  supportingEvidence: "",
  supportingSourceUrl: "",
  disconfirmingSignal: "",
  disconfirmingSourceUrl: "",
  topUnknown: "",
  nextEvidence: "",
};

const emptyForecast = {
  linkedSnapshotId: "",
  claim: "",
  probability: 50,
  resolutionDate: "2026-11-05",
  supportingEvidence: "",
  disconfirmingCondition: "",
  resolutionSource: "",
};

const emptyMap = {
  trigger: "",
  firstOrder: "",
  secondOrder: "",
  thirdOrder: "",
  bottlenecks: "",
  incentives: "",
  suppliers: "",
  customers: "",
  substitutes: "",
  regulation: "",
  adjacentEffects: "",
  disconfirmingEvidence: "",
};

const emptyCalibration = {
  reviewMonth: "2026-08",
  sourcingResults: "",
  analyticalMistakes: "",
  judgmentComparison: "",
  laterEvidence: "",
  updatedDecisionRule: "",
  findings: "",
  restartPlan: "",
};

const emptyResolutionDraft = (): ResolutionDraft => ({
  selected: false,
  outcome: 1,
  resolutionEvidence: "",
  resolutionSource: "",
});

const emptyUnderwrite = {
  snapshotId: "",
  selectionReason: "",
  preDiligenceNote: "",
  question1: "",
  question2: "",
  question3: "",
  founderReviewId: "",
  founderEvidence: "",
  founderEvidenceSourceOrGap: "",
  countercase: "",
  causalInvestmentCase: "",
  disposition: "Watch",
  confidence: 50,
  decisionDelta: "",
  nextEvidence: "",
};

const emptyFounderReview = () => ({
  linkedSnapshotId: "",
  company: "",
  founderName: "",
  sourceType: "Public interview" as FounderSourceType,
  sourceUrlOrContext: "",
  sourceDate: dateInTimeZone(new Date(), dailyBrief.timezone),
  sourceLimitations: "",
  privacyBoundary: "",
  privateEvidenceConfirmed: false,
  dimensions: emptyFounderDimensions(),
  charismaCheck: "",
  counterEvidence: "",
  provisionalJudgment: "",
  confidence: 50,
  nextQuestion: "",
  behavioralPrediction: "",
});

const emptyEvidenceRow = (): EvidenceRow => ({
  observation: "",
  sourceUrl: "",
  direction: "supports",
  reliabilityLimits: "",
  inference: "",
});

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBriefDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: dailyBrief.timezone,
  }).format(new Date(`${value}T12:00:00-05:00`));
}

function recordLabel(type: string): string {
  return {
    daily_brief: "Daily Brief",
    reading_record: "Reading Record",
    snapshot_judgment: "Snapshot Judgment",
    forecast: "Forecast",
    second_order_map: "Second-Order Map",
    founder_evidence_review: "Founder Evidence Review",
    weekly_underwrite: "Weekly Underwrite",
    weekly_plan: "Practice Plan",
    calibration_review: "Calibration Review",
  }[type] ?? type.replaceAll("_", " ");
}

function eventLabel(type: string): string {
  return type.replaceAll("_", " ");
}

function textValue(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function numberValue(payload: Record<string, unknown>, key: string): number {
  const value = payload[key];
  return typeof value === "number" ? value : Number(value || 0);
}

function recordSummary(record: LabRecord): string {
  if (record.recordType === "daily_brief") return textValue(record.payload, "carryForward");
  if (record.recordType === "snapshot_judgment") return textValue(record.payload, "thesis");
  if (record.recordType === "forecast") return `${numberValue(record.payload, "probability")}% — ${textValue(record.payload, "claim")}`;
  if (record.recordType === "second_order_map") return textValue(record.payload, "firstOrder");
  if (record.recordType === "founder_evidence_review") return textValue(record.payload, "provisionalJudgment");
  if (record.recordType === "weekly_underwrite") return textValue(record.payload, "decisionDelta");
  if (record.recordType === "weekly_plan") return textValue(record.payload, "rationale");
  if (record.recordType === "calibration_review") return textValue(record.payload, "findings");
  return "Committed evidence";
}

function keyEvidence(record: LabRecord): Array<[string, string]> {
  const p = record.payload;
  if (record.recordType === "snapshot_judgment") return [
    ["Disposition", `${textValue(p, "disposition")} · ${numberValue(p, "confidence")}%`],
    ["Crux", textValue(p, "crux")],
    ["Top unknown", textValue(p, "topUnknown")],
    ["Next evidence", textValue(p, "nextEvidence")],
  ];
  if (record.recordType === "forecast") return [
    ["Probability", `${numberValue(p, "probability")}%`],
    ["Resolve by", textValue(p, "resolutionDate")],
    ["Disconfirming condition", textValue(p, "disconfirmingCondition")],
  ];
  if (record.recordType === "weekly_underwrite") return [
    ["Final disposition", `${textValue(p, "disposition")} · ${numberValue(p, "confidence")}%`],
    ["Countercase", textValue(p, "countercase")],
    ["Decision Delta", textValue(p, "decisionDelta")],
  ];
  if (record.recordType === "second_order_map") return [
    ["Trigger", textValue(p, "trigger")],
    ["First order", textValue(p, "firstOrder")],
    ["Second order", textValue(p, "secondOrder")],
    ["Third order", textValue(p, "thirdOrder")],
  ];
  if (record.recordType === "calibration_review") return [
    ["Brier score", p.brierScore === null ? "No resolved Forecasts" : String(p.brierScore)],
    ["Analytical mistakes", textValue(p, "analyticalMistakes")],
    ["Updated decision rule", textValue(p, "updatedDecisionRule")],
  ];
  if (record.recordType === "founder_evidence_review") return [
    ["Evidence source", `${textValue(p, "sourceType")} · ${textValue(p, "sourceDate")}`],
    ["Source context", textValue(p, "sourceUrlOrContext")],
    ["Source limitations", textValue(p, "sourceLimitations")],
    ["Privacy boundary", textValue(p, "privacyBoundary")],
    ["Charisma and pedigree check", textValue(p, "charismaCheck")],
    ["Provisional judgment", `${numberValue(p, "confidence")}% confidence · ${textValue(p, "provisionalJudgment")}`],
    ["Counterevidence", textValue(p, "counterEvidence")],
    ["Next question", textValue(p, "nextQuestion")],
    ["Behavioral prediction", textValue(p, "behavioralPrediction")],
    ...(Array.isArray(p.dimensions) ? p.dimensions.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const dimension = item as Record<string, unknown>;
      const definition = FOUNDER_DIMENSIONS.find((candidate) => candidate.key === dimension.dimension);
      const direction = typeof dimension.direction === "string" ? dimension.direction : "gap";
      const observation = typeof dimension.observation === "string" ? dimension.observation : "";
      const inference = typeof dimension.inference === "string" ? dimension.inference : "";
      return definition ? [[definition.label, `${direction}: ${observation} Inference: ${inference}`] as [string, string]] : [];
    }) : []),
  ];
  return [];
}

export function LabApp({ displayName }: { displayName: string }) {
  const [view, setView] = useState<View>("today");
  const [data, setData] = useState<LabData>({ records: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [briefChecks, setBriefChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(dailyBrief.readings.map((reading) => [reading.readingId, false])),
  );
  const [briefResponses, setBriefResponses] = useState<Record<string, string>>(() =>
    Object.fromEntries(dailyBrief.readings.map((reading) => [reading.readingId, ""])),
  );
  const [briefCarry, setBriefCarry] = useState("");
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [forecast, setForecast] = useState(emptyForecast);
  const [secondOrder, setSecondOrder] = useState(emptyMap);
  const [founderReview, setFounderReview] = useState(emptyFounderReview);
  const [underwrite, setUnderwrite] = useState(emptyUnderwrite);
  const [calibration, setCalibration] = useState(emptyCalibration);
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, ResolutionDraft>>({});
  const [reviewedJudgmentIds, setReviewedJudgmentIds] = useState<string[]>([]);
  const [ledger, setLedger] = useState<EvidenceRow[]>([emptyEvidenceRow(), emptyEvidenceRow(), emptyEvidenceRow()]);
  const [plan, setPlan] = useState({
    weekOf: "2026-08-03",
    mode: "Normal Week" as PracticeMode,
    rationale: "Default sustainable practice week.",
    opportunity: "",
    deadline: "",
    substitutions: "None.",
  });
  const [updateRecord, setUpdateRecord] = useState("");
  const [updateType, setUpdateType] = useState("reflection");
  const [updateText, setUpdateText] = useState("");
  const [updatePrivateEvidenceConfirmed, setUpdatePrivateEvidenceConfirmed] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");

  const snapshots = useMemo(
    () => data.records.filter((record) => record.recordType === "snapshot_judgment"),
    [data.records],
  );
  const founderReviews = useMemo(
    () => data.records.filter((record) => record.recordType === "founder_evidence_review"),
    [data.records],
  );
  const eligibleFounderReviews = useMemo(
    () => founderReviews.filter((record) => record.parentId === underwrite.snapshotId),
    [founderReviews, underwrite.snapshotId],
  );
  const forecasts = useMemo(
    () => data.records.filter((record) => record.recordType === "forecast"),
    [data.records],
  );
  const resolvedForecastIds = useMemo(
    () => new Set(data.events.filter((event) => event.eventType === "forecast_resolution").map((event) => event.recordId)),
    [data.events],
  );
  const openForecasts = useMemo(
    () => forecasts.filter((record) => !resolvedForecastIds.has(record.id)),
    [forecasts, resolvedForecastIds],
  );
  const priorJudgments = useMemo(
    () => data.records.filter((record) => new Set(["snapshot_judgment", "weekly_underwrite"]).has(record.recordType)),
    [data.records],
  );
  const topLevelRecords = useMemo(
    () => data.records.filter((record) => record.recordType !== "reading_record"),
    [data.records],
  );
  const filteredRecords = useMemo(
    () => historyFilter === "all" ? topLevelRecords : topLevelRecords.filter((record) => record.recordType === historyFilter),
    [historyFilter, topLevelRecords],
  );
  const savedBrief = data.records.find(
    (record) => record.recordType === "daily_brief"
      && textValue(record.payload, "assignedDate") === dailyBrief.assignedDate
      && textValue(record.payload, "briefVersion") === dailyBrief.version,
  );
  const savedReadingRecords = savedBrief
    ? data.records.filter((record) => record.recordType === "reading_record" && record.parentId === savedBrief.id)
    : [];

  async function refresh() {
    try {
      const response = await fetch("/api/lab", { cache: "no-store" });
      if (!response.ok) throw new Error("Your private record could not be loaded.");
      setData((await response.json()) as LabData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your private record could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!savedBrief || !savedReadingRecords.length) return;
    setBriefCarry(textValue(savedBrief.payload, "carryForward"));
    setBriefChecks(Object.fromEntries(dailyBrief.readings.map((reading) => [reading.readingId, true])));
    setBriefResponses(Object.fromEntries(dailyBrief.readings.map((reading) => {
      const saved = savedReadingRecords.find((record) => textValue(record.payload, "readingId") === reading.readingId);
      return [reading.readingId, saved ? textValue(saved.payload, "learnerResponse") : "Preserved in the original record."];
    })));
  }, [savedBrief?.id, savedReadingRecords.length]);

  async function post(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The record could not be preserved.");
      await refresh();
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The record could not be preserved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function commitBrief() {
    const incomplete = dailyBrief.readings.find(
      (reading) => !briefChecks[reading.readingId] || !briefResponses[reading.readingId]?.trim(),
    );
    if (incomplete || !briefCarry.trim()) {
      setNotice("Read every source, write an Independent First Pass for each, and record the idea you will carry forward.");
      return;
    }
    const saved = await post({
      operation: "commit_daily_brief",
      briefVersion: dailyBrief.version,
      assignedDate: dailyBrief.assignedDate,
      timezone: dailyBrief.timezone,
      carryForward: briefCarry.trim(),
      readings: dailyBrief.readings.map((reading) => ({
        ...reading,
        assignedDate: dailyBrief.assignedDate,
        assignedTimezone: dailyBrief.timezone,
        learnerResponse: briefResponses[reading.readingId].trim(),
        completionStatus: "completed",
      })),
    });
    if (saved) {
      setNotice("Daily Brief and all four Reading Records are locked in your history.");
      setView("snapshot");
    }
  }

  async function commitSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await post({
      operation: "commit_record",
      recordType: "snapshot_judgment",
      title: `${snapshot.company} — ${snapshot.disposition} at ${snapshot.confidence}%`,
      payload: { ...snapshot, timezone: dailyBrief.timezone, timeboxMinutes: 20 },
    });
    if (saved) {
      setSnapshot(emptySnapshot);
      setNotice("Snapshot locked. Deeper work can update your view, but cannot rewrite it.");
      setView("forecast");
    }
  }

  async function commitForecast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parent = snapshots.find((record) => record.id === forecast.linkedSnapshotId);
    const saved = await post({
      operation: "commit_record",
      recordType: "forecast",
      parentId: parent?.id ?? null,
      title: `Forecast — ${forecast.probability}% by ${forecast.resolutionDate}`,
      payload: { ...forecast, timezone: dailyBrief.timezone, timeboxMinutes: 10, status: "open" },
    });
    if (saved) {
      setForecast(emptyForecast);
      setNotice("Forecast locked. Resolve it later by appending evidence—not changing the original odds.");
      setView("today");
    }
  }

  async function commitSecondOrderMap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await post({
      operation: "commit_record",
      recordType: "second_order_map",
      title: `Second-Order Map — ${secondOrder.trigger.slice(0, 90)}`,
      payload: { ...secondOrder, timezone: dailyBrief.timezone },
    });
    if (saved) {
      setSecondOrder(emptyMap);
      setNotice("Causal map preserved. Later outcomes belong in appended updates.");
      setView("history");
    }
  }

  function updateFounderDimension(index: number, patch: Partial<FounderDimensionObservation>) {
    setFounderReview((current) => ({
      ...current,
      dimensions: current.dimensions.map((dimension, dimensionIndex) => (
        dimensionIndex === index ? { ...dimension, ...patch } : dimension
      )),
    }));
  }

  async function commitFounderReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parent = snapshots.find((record) => record.id === founderReview.linkedSnapshotId);
    const saved = await post({
      operation: "commit_record",
      recordType: "founder_evidence_review",
      parentId: parent?.id ?? null,
      title: `${founderReview.company} — Founder Evidence Review`,
      payload: { ...founderReview, timezone: dailyBrief.timezone },
    });
    if (saved) {
      setFounderReview(emptyFounderReview());
      setNotice("Founder Evidence Review preserved. Later behavior belongs in an appended update or a new review.");
      setView("underwrite");
    }
  }

  function updateResolution(forecastId: string, patch: Partial<ResolutionDraft>) {
    setResolutionDrafts((current) => ({
      ...current,
      [forecastId]: { ...(current[forecastId] ?? emptyResolutionDraft()), ...patch },
    }));
  }

  async function commitCalibration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const resolvedForecasts = openForecasts
      .filter((record) => resolutionDrafts[record.id]?.selected)
      .map((record) => {
        const draft = resolutionDrafts[record.id];
        return {
          forecastId: record.id,
          outcome: draft.outcome,
          resolutionEvidence: draft.resolutionEvidence.trim(),
          resolutionSource: draft.resolutionSource.trim(),
        };
      });
    const incomplete = resolvedForecasts.some((item) => !item.resolutionEvidence || !item.resolutionSource);
    if (incomplete) {
      setNotice("Every resolved Forecast needs outcome evidence and a resolution source.");
      return;
    }
    const saved = await post({
      operation: "commit_calibration_review",
      title: `Calibration Review — ${calibration.reviewMonth}`,
      payload: { ...calibration, reviewedJudgmentIds },
      resolvedForecasts,
    });
    if (saved) {
      setCalibration(emptyCalibration);
      setResolutionDrafts({});
      setReviewedJudgmentIds([]);
      setNotice("Calibration Review preserved. Original probabilities remain unchanged beside their outcomes.");
      setView("history");
    }
  }

  function updateLedger(index: number, patch: Partial<EvidenceRow>) {
    setLedger((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  async function commitUnderwrite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parent = snapshots.find((record) => record.id === underwrite.snapshotId);
    if (!parent) {
      setNotice("Choose the locked Snapshot this Underwrite investigates.");
      return;
    }
    const directions = new Set(ledger.map((row) => row.direction));
    if (!directions.has("supports") || !directions.has("challenges")) {
      setNotice("The Evidence Ledger must contain material support and material disconfirmation.");
      return;
    }
    const questions = [underwrite.question1, underwrite.question2, underwrite.question3];
    const saved = await post({
      operation: "commit_record",
      recordType: "weekly_underwrite",
      parentId: parent.id,
      title: `${parent.title.split(" — ")[0]} — Underwrite`,
      payload: {
        ...underwrite,
        questions,
        evidenceLedger: ledger.map((row, index) => ({ ...row, loadBearingQuestion: questions[index] })),
        mode: "Normal Week",
        timeboxMinutes: 165,
        coachStatus: "available_after_commitment",
      },
    });
    if (saved) {
      setUnderwrite(emptyUnderwrite);
      setLedger([emptyEvidenceRow(), emptyEvidenceRow(), emptyEvidenceRow()]);
      setNotice("Underwrite locked beside its original Snapshot. The Decision Delta is now auditable.");
      setView("history");
    }
  }

  async function commitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mode = practiceModes[plan.mode];
    const saved = await post({
      operation: "commit_record",
      recordType: "weekly_plan",
      title: `${plan.mode} — week of ${plan.weekOf}`,
      payload: { ...plan, totalMinutes: mode.totalMinutes, dailyLoops: mode.dailyLoops },
    });
    if (saved) {
      setNotice("Weekly mode preserved with its rationale and substitutions. No hidden backlog was created.");
      setView("today");
    }
  }

  async function appendUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!updateRecord || !updateText.trim()) {
      setNotice("Choose an original record and write the dated update.");
      return;
    }
    const selectedRecord = data.records.find((record) => record.id === updateRecord);
    if (selectedRecord?.recordType === "founder_evidence_review" && !updatePrivateEvidenceConfirmed) {
      setNotice("Confirm that the Founder Evidence update contains only consented behavioral evidence.");
      return;
    }
    const saved = await post({
      operation: "append_event",
      recordId: updateRecord,
      eventType: updateType,
      eventData: {
        text: updateText.trim(),
        originalPreserved: true,
        ...(selectedRecord?.recordType === "founder_evidence_review" ? { privateEvidenceConfirmed: true } : {}),
      },
    });
    if (saved) {
      setUpdateText("");
      setUpdatePrivateEvidenceConfirmed(false);
      setNotice("Update appended. The original submission and probability remain unchanged.");
    }
  }

  const latestPlan = topLevelRecords.find((record) => record.recordType === "weekly_plan");
  const selectedUpdateRecord = data.records.find((record) => record.id === updateRecord);
  const activeMode = (latestPlan ? textValue(latestPlan.payload, "mode") : "Normal Week") as PracticeMode;
  const modeDefinition = practiceModes[activeMode] ?? practiceModes["Normal Week"];
  const progress = {
    briefs: topLevelRecords.filter((record) => record.recordType === "daily_brief").length,
    snapshots: snapshots.length,
    forecasts: topLevelRecords.filter((record) => record.recordType === "forecast").length,
    underwrites: topLevelRecords.filter((record) => record.recordType === "weekly_underwrite").length,
    founderReviews: topLevelRecords.filter((record) => record.recordType === "founder_evidence_review").length,
    calibrations: topLevelRecords.filter((record) => record.recordType === "calibration_review").length,
  };
  const latestSnapshot = snapshots[0];
  const calibrationPreview = openForecasts
    .filter((record) => resolutionDrafts[record.id]?.selected)
    .map((record) => {
      const probability = numberValue(record.payload, "probability");
      const outcome = resolutionDrafts[record.id]?.outcome ?? 1;
      return { probability, outcome };
    });
  const previewBrier = calculateBrierScore(calibrationPreview);

  return (
    <div className="lab-shell">
      <aside className="rail">
        <button className="brand" onClick={() => setView("today")} aria-label="Venture Judgment Lab home">
          <span className="brand-mark">VJ</span>
          <span><strong>Venture</strong><em>Judgment Lab</em></span>
        </button>
        <nav aria-label="Lab sections">
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)} aria-current={view === item.id ? "page" : undefined}>
              <span className="nav-key">{item.key}</span>
              <span><strong>{item.label}</strong><small>{item.hint}</small></span>
            </button>
          ))}
        </nav>
        <div className="rail-foot"><span className="privacy-dot" /><span><strong>Private record</strong><small>Append-only by design</small></span></div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">{formatBriefDate(dailyBrief.assignedDate)}</span><h1>{view === "today" ? `Good morning, ${displayName}.` : navItems.find((item) => item.id === view)?.label}</h1></div>
          <button className="mode-chip" onClick={() => setView("plan")}><span>{activeMode}</span><strong>{modeDefinition.totalMinutes / 60}h</strong></button>
        </header>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}

        {view === "today" && (
          <section className="view today-view">
            <div className="hero-grid">
              <article className="hero-card">
                <div className="hero-index">01</div>
                <div className="hero-copy">
                  <span className="eyebrow coral">Today’s judgment loop · 90 minutes</span>
                  <h2>Read the evidence.<br />Then commit the view.</h2>
                  <p>The Lab remembers what you believed before the outcome was obvious.</p>
                  <button className="primary" onClick={() => setView("brief")}>{savedBrief ? "Reopen today’s sources" : "Begin with four readings"} <span>→</span></button>
                </div>
                <div className="loop-dial" aria-label={`${progress.snapshots} Snapshot Judgments preserved`}><strong>{String(progress.snapshots).padStart(2, "0")}</strong><span>judgments<br />preserved</span></div>
              </article>
              <aside className="standard-card">
                <span className="eyebrow">Active practice mode</span>
                <h3>{activeMode}</h3>
                <p>{modeDefinition.promise}</p>
                <div className="rule"><span>{modeDefinition.dailyLoops}</span><small>independent<br />loops</small></div>
                <div className="rule"><span>{modeDefinition.totalMinutes}</span><small>minutes<br />this week</small></div>
              </aside>
            </div>

            <div className="section-heading"><div><span className="eyebrow">The work in front of you</span><h3>One loop, four commitments</h3></div><span className="quiet">Flexible blocks · no catch-up debt</span></div>
            <div className="commitment-grid">
              {[
                ["01", "Daily Brief", savedBrief ? "Preserved" : "Four verified sources", `${dailyBrief.totalMinutes} min`, "brief"],
                ["02", "Snapshot Judgment", "Commit the causal view", "20 min · evidence link required", "snapshot"],
                ["03", "Forecast", "Make one falsifiable claim", "10 min · probability required", "forecast"],
                ["04", "Preserve", "Append later evidence", "5 min · no rewriting", "history"],
              ].map(([number, title, copy, meta, target]) => (
                <button className="commitment" key={title} onClick={() => setView(target as View)}>
                  <span className="commitment-number">{number}</span><strong>{title}</strong><p>{copy}</p><small>{meta}</small>
                </button>
              ))}
            </div>

            <div className="progress-strip" aria-label="Evidence repetitions">
              <div><strong>{progress.briefs}</strong><span>Briefs</span></div>
              <div><strong>{progress.snapshots}</strong><span>Snapshots</span></div>
              <div><strong>{progress.forecasts}</strong><span>Forecasts</span></div>
              <div><strong>{progress.underwrites}</strong><span>Underwrites</span></div>
              <div><strong>{progress.founderReviews}</strong><span>Founder reviews</span></div>
              <div><strong>{progress.calibrations}</strong><span>Calibrations</span></div>
              <p>Repetitions are evidence, not points. Quality appears in later updates and calibration.</p>
            </div>

            {latestSnapshot && <article className="latest-card"><span className="eyebrow">Latest locked judgment</span><h3>{latestSnapshot.title}</h3><p>{textValue(latestSnapshot.payload, "thesis")}</p><button className="text-button" onClick={() => setView("history")}>Open immutable record →</button></article>}
          </section>
        )}

        {view === "brief" && (
          <section className="view">
            <div className="intro-row">
              <div><span className="eyebrow coral">Daily Brief · {dailyBrief.totalMinutes} minutes</span><h2>Four sources. Four different jobs.</h2></div>
              <p>Open the original source, read the assigned material, then write your view before the Lab gives you any interpretation.</p>
            </div>
            {savedBrief && <div className="locked-banner"><strong>Committed {formatTime(savedBrief.committedAt)}</strong><span>The assignment and your responses are read-only. Source-status changes can be appended in History.</span></div>}
            <div className="reading-list">
              {dailyBrief.readings.map((reading, index) => (
                <article className={briefChecks[reading.readingId] ? "reading-card complete" : "reading-card"} key={reading.readingId}>
                  <div className="reading-order">0{index + 1}</div>
                  <div className="reading-main">
                    <div className="reading-meta"><span>{reading.lane}</span><span>{reading.estimatedMinutes} min</span><span>{reading.sourceRole}</span></div>
                    <h3>{reading.title}</h3>
                    <p className="source">{reading.authorOrOrganization} · {reading.publisher} · {reading.publishedDate}</p>
                    <p className="reading-summary">{reading.labSummary}</p>
                    <p className="assigned-section"><strong>Read:</strong> {reading.assignedSection}</p>
                    <div className="teaching-note"><strong>Why this is assigned</strong><p>{reading.teachingPurpose}</p><strong>Carry question</strong><p>{reading.carryQuestion}</p></div>
                    <div className="source-actions">
                      <a className="article-link" href={reading.canonicalUrl} target="_blank" rel="noreferrer">Open original source <span>↗</span></a>
                      <span>{reading.accessMode} · {reading.materialReviewed.replaceAll("_", " ")}</span>
                    </div>
                    <label className="reading-response"><span>Your Independent First Pass</span><textarea disabled={Boolean(savedBrief)} required rows={3} value={briefResponses[reading.readingId]} onChange={(event) => setBriefResponses((current) => ({ ...current, [reading.readingId]: event.target.value }))} placeholder="What claim mattered, what evidence supports it, and what remains uncertain?" /></label>
                  </div>
                  <label className="read-check"><input disabled={Boolean(savedBrief)} type="checkbox" checked={briefChecks[reading.readingId]} onChange={(event) => setBriefChecks((current) => ({ ...current, [reading.readingId]: event.target.checked }))} /><span>{briefChecks[reading.readingId] ? "Read" : "Mark read"}</span></label>
                </article>
              ))}
            </div>
            <div className="commit-panel"><label><span>What idea will you carry into today’s company judgment?</span><textarea disabled={Boolean(savedBrief)} value={briefCarry} onChange={(event) => setBriefCarry(event.target.value)} placeholder="Connect one reading to a company, Forecast, or decision." rows={3} /></label><button className="primary" onClick={commitBrief} disabled={busy || Boolean(savedBrief)}>{savedBrief ? "Daily Brief preserved" : busy ? "Preserving…" : "Commit four Reading Records"}</button></div>
          </section>
        )}

        {view === "snapshot" && (
          <section className="view form-view">
            <div className="intro-row"><div><span className="eyebrow coral">Independent First Pass · 20-minute cap</span><h2>Commit before you know everything.</h2></div><p>A valid Snapshot makes the causal view, evidence, uncertainty, and confidence visible. It does not pretend to be complete.</p></div>
            <form className="judgment-form" onSubmit={commitSnapshot}>
              <fieldset><legend><span>01</span> Identify the opportunity</legend><div className="field-grid three"><label>Company<input required value={snapshot.company} onChange={(e) => setSnapshot({ ...snapshot, company: e.target.value })} placeholder="Company name" /></label><label>Stage<select value={snapshot.stage} onChange={(e) => setSnapshot({ ...snapshot, stage: e.target.value })}><option>Pre-seed</option><option>Seed</option><option>Series A</option><option>Unknown</option></select></label><label>Sector<input required value={snapshot.sector} onChange={(e) => setSnapshot({ ...snapshot, sector: e.target.value })} placeholder="Specific domain" /></label></div><label>How did you find it?<input required value={snapshot.discoverySource} onChange={(e) => setSnapshot({ ...snapshot, discoverySource: e.target.value })} placeholder="Reading, founder, database, event, or independent search" /></label></fieldset>
              <fieldset><legend><span>02</span> State the causal view</legend><label>One-sentence investment thesis<textarea required rows={3} value={snapshot.thesis} onChange={(e) => setSnapshot({ ...snapshot, thesis: e.target.value })} placeholder="This company could matter because…" /></label><label>Venture-scale mechanism<textarea required rows={3} value={snapshot.ventureMechanism} onChange={(e) => setSnapshot({ ...snapshot, ventureMechanism: e.target.value })} placeholder="Explain the mechanism, not the market adjective." /></label></fieldset>
              <fieldset><legend><span>03</span> Commit the judgment</legend><div className="field-grid two"><label>Practice Disposition<select value={snapshot.disposition} onChange={(e) => setSnapshot({ ...snapshot, disposition: e.target.value })}><option>Pursue</option><option>Watch</option><option>Pass</option></select><small>Watch requires a trigger. Pass states what must change.</small></label><label>Confidence <strong>{snapshot.confidence}%</strong><input className="range" type="range" min="1" max="99" value={snapshot.confidence} onChange={(e) => setSnapshot({ ...snapshot, confidence: Number(e.target.value) })} /></label></div><label>The crux<textarea required rows={2} value={snapshot.crux} onChange={(e) => setSnapshot({ ...snapshot, crux: e.target.value })} placeholder="The single claim on which your view most depends." /></label></fieldset>
              <fieldset><legend><span>04</span> Expose the evidence gap</legend><label>Strongest supporting evidence<textarea required rows={2} value={snapshot.supportingEvidence} onChange={(e) => setSnapshot({ ...snapshot, supportingEvidence: e.target.value })} placeholder="Observation—not a marketing conclusion." /></label><label>Supporting source URL<input required type="url" value={snapshot.supportingSourceUrl} onChange={(e) => setSnapshot({ ...snapshot, supportingSourceUrl: e.target.value })} placeholder="https://" /></label><label>Strongest disconfirming signal<textarea required rows={2} value={snapshot.disconfirmingSignal} onChange={(e) => setSnapshot({ ...snapshot, disconfirmingSignal: e.target.value })} placeholder="If none was found in the timebox, say so explicitly." /></label><label>Disconfirming source URL <small>Optional only when no material signal was found.</small><input type="url" value={snapshot.disconfirmingSourceUrl} onChange={(e) => setSnapshot({ ...snapshot, disconfirmingSourceUrl: e.target.value })} placeholder="https://" /></label><div className="field-grid two"><label>Top unknown<textarea required rows={3} value={snapshot.topUnknown} onChange={(e) => setSnapshot({ ...snapshot, topUnknown: e.target.value })} /></label><label>Next evidence that would change the view<textarea required rows={3} value={snapshot.nextEvidence} onChange={(e) => setSnapshot({ ...snapshot, nextEvidence: e.target.value })} /></label></div></fieldset>
              <CommitBar busy={busy} label="Commit Snapshot" busyLabel="Committing…" />
            </form>
          </section>
        )}

        {view === "forecast" && (
          <section className="view form-view">
            <div className="intro-row"><div><span className="eyebrow coral">Falsifiable Forecast · 10-minute cap</span><h2>Put odds and a date on the claim.</h2></div><p>A forecast must be resolvable by an identified source. “The market will grow” is not a forecast.</p></div>
            <form className="judgment-form narrow" onSubmit={commitForecast}>
              <fieldset><legend><span>01</span> Define the event</legend><label>Link a Snapshot <small>Optional, but useful when the event tests a company thesis.</small><select value={forecast.linkedSnapshotId} onChange={(e) => setForecast({ ...forecast, linkedSnapshotId: e.target.value })}><option value="">No linked Snapshot</option>{snapshots.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label><label>Falsifiable claim<textarea required rows={3} value={forecast.claim} onChange={(e) => setForecast({ ...forecast, claim: e.target.value })} placeholder="By [date], [observable event] will occur." /></label><div className="field-grid two"><label>Probability <strong>{forecast.probability}%</strong><input className="range" type="range" min="1" max="99" value={forecast.probability} onChange={(e) => setForecast({ ...forecast, probability: Number(e.target.value) })} /></label><label>Resolution date<input required type="date" value={forecast.resolutionDate} onChange={(e) => setForecast({ ...forecast, resolutionDate: e.target.value })} /></label></div></fieldset>
              <fieldset><legend><span>02</span> Make resolution unambiguous</legend><label>Supporting evidence or base rate<textarea required rows={3} value={forecast.supportingEvidence} onChange={(e) => setForecast({ ...forecast, supportingEvidence: e.target.value })} /></label><label>What evidence would disconfirm the claim?<textarea required rows={3} value={forecast.disconfirmingCondition} onChange={(e) => setForecast({ ...forecast, disconfirmingCondition: e.target.value })} /></label><label>Resolution source URL<input required type="url" value={forecast.resolutionSource} onChange={(e) => setForecast({ ...forecast, resolutionSource: e.target.value })} placeholder="https:// official data, filing, or clearly defined source" /></label></fieldset>
              <CommitBar busy={busy} label="Commit Forecast" busyLabel="Locking odds…" />
            </form>
          </section>
        )}

        {view === "map" && (
          <section className="view form-view">
            <div className="intro-row"><div><span className="eyebrow coral">Second-Order Map</span><h2>Trace what changes after the headline.</h2></div><p>Follow bottlenecks and incentives across the system. Do not turn a trend into a list of themes.</p></div>
            <form className="judgment-form" onSubmit={commitSecondOrderMap}>
              <fieldset><legend><span>01</span> Trace three causal steps</legend><label>Trigger event<textarea required rows={2} value={secondOrder.trigger} onChange={(e) => setSecondOrder({ ...secondOrder, trigger: e.target.value })} /></label><label>First-order consequence<textarea required rows={2} value={secondOrder.firstOrder} onChange={(e) => setSecondOrder({ ...secondOrder, firstOrder: e.target.value })} placeholder="What changes directly because of the trigger?" /></label><label>Second-order consequence<textarea required rows={2} value={secondOrder.secondOrder} onChange={(e) => setSecondOrder({ ...secondOrder, secondOrder: e.target.value })} placeholder="What changes because actors respond to the first effect?" /></label><label>Third-order consequence<textarea required rows={2} value={secondOrder.thirdOrder} onChange={(e) => setSecondOrder({ ...secondOrder, thirdOrder: e.target.value })} placeholder="What new equilibrium, behavior, or adjacent effect follows?" /></label></fieldset>
              <fieldset><legend><span>02</span> Stress-test the system</legend><div className="field-grid two"><label>Bottlenecks<textarea required rows={3} value={secondOrder.bottlenecks} onChange={(e) => setSecondOrder({ ...secondOrder, bottlenecks: e.target.value })} /></label><label>Incentives<textarea required rows={3} value={secondOrder.incentives} onChange={(e) => setSecondOrder({ ...secondOrder, incentives: e.target.value })} /></label><label>Suppliers<textarea required rows={3} value={secondOrder.suppliers} onChange={(e) => setSecondOrder({ ...secondOrder, suppliers: e.target.value })} /></label><label>Customers<textarea required rows={3} value={secondOrder.customers} onChange={(e) => setSecondOrder({ ...secondOrder, customers: e.target.value })} /></label><label>Substitutes<textarea required rows={3} value={secondOrder.substitutes} onChange={(e) => setSecondOrder({ ...secondOrder, substitutes: e.target.value })} /></label><label>Regulation<textarea required rows={3} value={secondOrder.regulation} onChange={(e) => setSecondOrder({ ...secondOrder, regulation: e.target.value })} /></label></div><label>Adjacent-domain effects<textarea required rows={3} value={secondOrder.adjacentEffects} onChange={(e) => setSecondOrder({ ...secondOrder, adjacentEffects: e.target.value })} /></label><label>Evidence that would break this causal map<textarea required rows={3} value={secondOrder.disconfirmingEvidence} onChange={(e) => setSecondOrder({ ...secondOrder, disconfirmingEvidence: e.target.value })} /></label></fieldset>
              <CommitBar busy={busy} label="Commit Second-Order Map" busyLabel="Preserving…" />
            </form>
          </section>
        )}

        {view === "founder" && (
          <section className="view form-view">
            <div className="intro-row"><div><span className="eyebrow coral">Founder Evidence Review</span><h2>Observable behavior, not founder vibes.</h2></div><p>Review one public source or real interaction. Separate what happened from what you infer, preserve missing evidence, and never turn charisma or pedigree into a founder score.</p></div>
            <form className="judgment-form" onSubmit={commitFounderReview}>
              <fieldset><legend><span>01</span> Identify the evidence encounter</legend><label>Link a Snapshot <small>Optional, but required when this review will support that company’s Underwrite.</small><select value={founderReview.linkedSnapshotId} onChange={(e) => { const linked = snapshots.find((record) => record.id === e.target.value); setFounderReview({ ...founderReview, linkedSnapshotId: e.target.value, company: linked ? textValue(linked.payload, "company") : founderReview.company }); }}><option value="">No linked Snapshot</option>{snapshots.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label><div className="field-grid two"><label>Company {founderReview.linkedSnapshotId && <small>Locked to the selected Snapshot.</small>}<input required readOnly={Boolean(founderReview.linkedSnapshotId)} value={founderReview.company} onChange={(e) => setFounderReview({ ...founderReview, company: e.target.value })} /></label><label>Founder<input required value={founderReview.founderName} onChange={(e) => setFounderReview({ ...founderReview, founderName: e.target.value })} /></label><label>Evidence source type<select value={founderReview.sourceType} onChange={(e) => setFounderReview({ ...founderReview, sourceType: e.target.value as FounderSourceType, privateEvidenceConfirmed: false })}>{FOUNDER_SOURCE_TYPES.map((sourceType) => <option key={sourceType}>{sourceType}</option>)}</select></label><label>Observed on<input required type="date" value={founderReview.sourceDate} onChange={(e) => setFounderReview({ ...founderReview, sourceDate: e.target.value })} /></label></div><label>{founderReview.sourceType === "Public interview" ? "Original source URL" : "Source context—no transcript required"}<input required type={founderReview.sourceType === "Public interview" ? "url" : "text"} value={founderReview.sourceUrlOrContext} onChange={(e) => setFounderReview({ ...founderReview, sourceUrlOrContext: e.target.value })} placeholder={founderReview.sourceType === "Public interview" ? "https://" : "Private conversation, event, or reference context"} /></label><label>Source limitations<textarea required rows={3} value={founderReview.sourceLimitations} onChange={(e) => setFounderReview({ ...founderReview, sourceLimitations: e.target.value })} placeholder="Editing, incentives, selection effects, missing context, or relationship limits." /></label><label>Privacy and consent boundary<textarea required rows={2} value={founderReview.privacyBoundary} onChange={(e) => setFounderReview({ ...founderReview, privacyBoundary: e.target.value })} placeholder="Record behavioral evidence only. Name what must remain private or was not consented for reuse." /></label>{founderReview.sourceType !== "Public interview" && <label className="privacy-confirmation"><input required type="checkbox" checked={founderReview.privateEvidenceConfirmed} onChange={(e) => setFounderReview({ ...founderReview, privateEvidenceConfirmed: e.target.checked })} />I confirm this review contains only consented behavioral evidence and omits raw transcripts and confidential details.</label>}</fieldset>
              <fieldset><legend><span>02</span> Examine all six behavior dimensions</legend><p className="fieldset-note">A gap is valid. Invented certainty is not. Every row needs the observation and the limited inference it supports.</p><div className="founder-dimension-grid">{FOUNDER_DIMENSIONS.map((definition, index) => { const dimension = founderReview.dimensions[index]; return <article className="founder-dimension" key={definition.key}><div className="dimension-head"><div><span>0{index + 1}</span><h3>{definition.label}</h3></div><select aria-label={`${definition.label} evidence direction`} value={dimension.direction} onChange={(e) => updateFounderDimension(index, { direction: e.target.value as FounderDimensionObservation["direction"] })}><option value="supports">Supports</option><option value="weakens">Weakens</option><option value="gap">Evidence gap</option></select></div><p>{definition.prompt}</p><label>Observed behavior<textarea required rows={3} value={dimension.observation} onChange={(e) => updateFounderDimension(index, { observation: e.target.value })} placeholder={dimension.direction === "gap" ? "State exactly what behavior could not be observed." : "Describe the concrete statement, choice, sequence, or response."} /></label><label>Limited inference<textarea required rows={3} value={dimension.inference} onChange={(e) => updateFounderDimension(index, { inference: e.target.value })} placeholder="What does this support or weaken—and what does it still not prove?" /></label></article>; })}</div></fieldset>
              <fieldset><legend><span>03</span> Fight halo effects and seek disconfirmation</legend><label>Charisma and pedigree check<textarea required rows={3} value={founderReview.charismaCheck} onChange={(e) => setFounderReview({ ...founderReview, charismaCheck: e.target.value })} placeholder="Which impressions came from polish, confidence, school, employer, funder, or status—and what behavioral evidence remains after removing them?" /></label><label>Strongest counterevidence<textarea required rows={3} value={founderReview.counterEvidence} onChange={(e) => setFounderReview({ ...founderReview, counterEvidence: e.target.value })} placeholder="Name the observation that most weakens your emerging view, or the precise gap preventing confidence." /></label></fieldset>
              <fieldset><legend><span>04</span> Commit a provisional, testable view</legend><label>Provisional Founder Evidence judgment<textarea required rows={4} value={founderReview.provisionalJudgment} onChange={(e) => setFounderReview({ ...founderReview, provisionalJudgment: e.target.value })} placeholder="Synthesize only the observable evidence. This is not a founder grade or personality verdict." /></label><label>Confidence in this evidence-based view <strong>{founderReview.confidence}%</strong><input className="range" type="range" min="1" max="99" value={founderReview.confidence} onChange={(e) => setFounderReview({ ...founderReview, confidence: Number(e.target.value) })} /></label><label>Next decisive question<textarea required rows={3} value={founderReview.nextQuestion} onChange={(e) => setFounderReview({ ...founderReview, nextQuestion: e.target.value })} placeholder="What would you ask in the next interview, conversation, or reference call?" /></label><label>Behavioral prediction<textarea required rows={3} value={founderReview.behavioralPrediction} onChange={(e) => setFounderReview({ ...founderReview, behavioralPrediction: e.target.value })} placeholder="What observable future behavior would strengthen or weaken this view?" /></label></fieldset>
              <CommitBar busy={busy} label="Commit Founder Evidence Review" busyLabel="Preserving behavior evidence…" />
            </form>
          </section>
        )}

        {view === "underwrite" && (
          <section className="view form-view">
            <div className="intro-row"><div><span className="eyebrow coral">Normal Week · 165 minutes</span><h2>Investigate what can change the view.</h2></div><p>Exactly three questions. Claim-linked evidence for and against. No weighted startup score.</p></div>
            {!snapshots.length ? <EmptyState code="U" title="An Underwrite begins with a locked Snapshot." copy="Commit the independent first pass before opening deeper diligence." action="Create Snapshot" onAction={() => setView("snapshot")} /> : (
              <form className="judgment-form" onSubmit={commitUnderwrite}>
                <fieldset><legend><span>01</span> Reopen without rewriting</legend><label>Locked Snapshot<select required value={underwrite.snapshotId} onChange={(e) => setUnderwrite({ ...underwrite, snapshotId: e.target.value, founderReviewId: "" })}><option value="">Choose a Snapshot…</option>{snapshots.map((record) => <option key={record.id} value={record.id}>{record.title} · {formatTime(record.committedAt)}</option>)}</select></label>{underwrite.snapshotId && (() => { const chosen = snapshots.find((record) => record.id === underwrite.snapshotId); return chosen ? <div className="locked-view"><span>Original thesis</span><p>{textValue(chosen.payload, "thesis")}</p><small>Locked {formatTime(chosen.committedAt)} · {textValue(chosen.payload, "crux")}</small></div> : null; })()}<label>Why this company now?<textarea required rows={2} value={underwrite.selectionReason} onChange={(e) => setUnderwrite({ ...underwrite, selectionReason: e.target.value })} placeholder="Name the load-bearing uncertainty, learner weakness, sector relevance, or deadline." /></label><label>Pre-diligence note <small>Optional and appended beside the Snapshot.</small><textarea rows={2} value={underwrite.preDiligenceNote} onChange={(e) => setUnderwrite({ ...underwrite, preDiligenceNote: e.target.value })} /></label></fieldset>
                <fieldset><legend><span>02</span> Frame exactly three Load-Bearing Questions</legend>{(["question1", "question2", "question3"] as const).map((key, index) => <label key={key}>Question {index + 1}<input required value={underwrite[key]} onChange={(e) => setUnderwrite({ ...underwrite, [key]: e.target.value })} placeholder="What answer could materially change the disposition?" /></label>)}</fieldset>
                <fieldset><legend><span>03</span> Build the claim-linked Evidence Ledger</legend>{ledger.map((row, index) => <div className="ledger-row" key={index}><div className="ledger-head"><strong>Evidence for question {index + 1}</strong><select aria-label={`Direction for evidence ${index + 1}`} value={row.direction} onChange={(e) => updateLedger(index, { direction: e.target.value as EvidenceRow["direction"] })}><option value="supports">Supports</option><option value="challenges">Challenges</option><option value="complicates">Complicates</option></select></div><label>Observation<textarea required rows={2} value={row.observation} onChange={(e) => updateLedger(index, { observation: e.target.value })} placeholder="What the source actually shows." /></label><label>Source URL<input required type="url" value={row.sourceUrl} onChange={(e) => updateLedger(index, { sourceUrl: e.target.value })} placeholder="https://" /></label><div className="field-grid two"><label>Reliability limits<textarea required rows={2} value={row.reliabilityLimits} onChange={(e) => updateLedger(index, { reliabilityLimits: e.target.value })} /></label><label>Your inference<textarea required rows={2} value={row.inference} onChange={(e) => updateLedger(index, { inference: e.target.value })} /></label></div></div>)}</fieldset>
                <fieldset><legend><span>04</span> Founder Evidence and Countercase</legend><label>Linked Founder Evidence Review <small>Optional only when no qualified review exists; the explicit gap remains required below.</small><select value={underwrite.founderReviewId} onChange={(e) => setUnderwrite({ ...underwrite, founderReviewId: e.target.value })}><option value="">No linked review—record the gap</option>{eligibleFounderReviews.map((record) => <option key={record.id} value={record.id}>{record.title} · {formatTime(record.committedAt)}</option>)}</select></label>{underwrite.founderReviewId && (() => { const review = eligibleFounderReviews.find((record) => record.id === underwrite.founderReviewId); return review ? <div className="locked-view"><span>Committed Founder Evidence</span><p>{textValue(review.payload, "provisionalJudgment")}</p><small>{numberValue(review.payload, "confidence")}% confidence · {textValue(review.payload, "sourceType")}</small></div> : null; })()}<label>Observable Founder Evidence—or the explicit gap<textarea required rows={3} value={underwrite.founderEvidence} onChange={(e) => setUnderwrite({ ...underwrite, founderEvidence: e.target.value })} placeholder="Behavior only. No charisma or pedigree inference." /></label><label>Founder source or exact evidence gap<textarea required rows={2} value={underwrite.founderEvidenceSourceOrGap} onChange={(e) => setUnderwrite({ ...underwrite, founderEvidenceSourceOrGap: e.target.value })} /></label><label>Strongest evidence-based Countercase<textarea required rows={4} value={underwrite.countercase} onChange={(e) => setUnderwrite({ ...underwrite, countercase: e.target.value })} placeholder="The causal path by which this fails to create venture-scale value." /></label></fieldset>
                <fieldset><legend><span>05</span> Commit the deeper judgment</legend><label>Causal investment case<textarea required rows={4} value={underwrite.causalInvestmentCase} onChange={(e) => setUnderwrite({ ...underwrite, causalInvestmentCase: e.target.value })} /></label><div className="field-grid two"><label>Final Practice Disposition<select value={underwrite.disposition} onChange={(e) => setUnderwrite({ ...underwrite, disposition: e.target.value })}><option>Pursue</option><option>Watch</option><option>Pass</option></select></label><label>Final confidence <strong>{underwrite.confidence}%</strong><input className="range" type="range" min="1" max="99" value={underwrite.confidence} onChange={(e) => setUnderwrite({ ...underwrite, confidence: Number(e.target.value) })} /></label></div><label>Decision Delta<textarea required rows={3} value={underwrite.decisionDelta} onChange={(e) => setUnderwrite({ ...underwrite, decisionDelta: e.target.value })} placeholder="What stayed, changed, or reversed—and which evidence caused it?" /></label><label>Next decisive evidence<textarea required rows={3} value={underwrite.nextEvidence} onChange={(e) => setUnderwrite({ ...underwrite, nextEvidence: e.target.value })} /></label></fieldset>
                <CommitBar busy={busy} label="Commit Underwrite" busyLabel="Locking deeper view…" />
              </form>
            )}
          </section>
        )}

        {view === "calibrate" && (
          <section className="view form-view">
            <div className="intro-row"><div><span className="eyebrow coral">Monthly Calibration Review · 60 minutes</span><h2>Score the prediction. Diagnose the process.</h2></div><p>Resolve prior Forecasts against evidence, measure probabilistic accuracy, and change one decision rule. Persuasive hindsight earns no credit.</p></div>
            <form className="judgment-form" onSubmit={commitCalibration}>
              <fieldset><legend><span>01</span> Resolve eligible Forecasts</legend><label>Review month<input required type="month" value={calibration.reviewMonth} onChange={(e) => setCalibration({ ...calibration, reviewMonth: e.target.value })} /></label>
                {!openForecasts.length && <div className="locked-view"><span>No unresolved Forecasts</span><p>Complete the process review below. Your Brier score will remain unscored until an outcome resolves.</p></div>}
                <div className="resolution-list">{openForecasts.map((record) => { const draft = resolutionDrafts[record.id] ?? emptyResolutionDraft(); const forecastTimezone = textValue(record.payload, "timezone") || dailyBrief.timezone; const canResolveNegative = dateInTimeZone(new Date(), forecastTimezone) > textValue(record.payload, "resolutionDate"); return <article className={draft.selected ? "resolution-row selected" : "resolution-row"} key={record.id}><label className="resolution-check"><input type="checkbox" checked={draft.selected} onChange={(e) => updateResolution(record.id, { selected: e.target.checked })} /><span><strong>{numberValue(record.payload, "probability")}%</strong>{textValue(record.payload, "claim")}</span></label>{draft.selected && <div className="resolution-fields"><label>Observed outcome<select value={draft.outcome} onChange={(e) => updateResolution(record.id, { outcome: Number(e.target.value) as ForecastOutcome })}><option value={1}>Occurred</option><option value={0} disabled={!canResolveNegative}>Did not occur</option></select>{!canResolveNegative && <small>A negative outcome can be resolved only after {textValue(record.payload, "resolutionDate")} has fully elapsed in {forecastTimezone}. An event that already occurred may be resolved early.</small>}</label><label>Resolution evidence<textarea required rows={2} value={draft.resolutionEvidence} onChange={(e) => updateResolution(record.id, { resolutionEvidence: e.target.value })} placeholder="What happened, stated without rewriting the original claim." /></label><label>Resolution source URL<input required type="url" value={draft.resolutionSource} onChange={(e) => updateResolution(record.id, { resolutionSource: e.target.value })} placeholder="https://" /></label></div>}</article>; })}</div>
                <div className="score-card"><span className="eyebrow">Brier score</span><strong>{previewBrier ?? "—"}</strong><p>0 is perfect. Lower is better. The score uses the original probability and the observed binary outcome.</p></div>
              </fieldset>
              <fieldset><legend><span>02</span> Compare investment judgments with later evidence</legend>{!priorJudgments.length ? <div className="locked-view"><span>No prior company judgments</span><p>Record that absence explicitly below; future reviews will compare locked Snapshots and Underwrites.</p></div> : <div className="judgment-choice-list">{priorJudgments.map((record) => <label className="judgment-choice" key={record.id}><input type="checkbox" checked={reviewedJudgmentIds.includes(record.id)} onChange={(e) => setReviewedJudgmentIds((current) => e.target.checked ? [...current, record.id] : current.filter((id) => id !== record.id))} /><span><strong>{recordLabel(record.recordType)}</strong>{record.title}</span></label>)}</div>}<label>Later evidence<textarea required rows={3} value={calibration.laterEvidence} onChange={(e) => setCalibration({ ...calibration, laterEvidence: e.target.value })} placeholder="What became observable after the original Snapshot or Underwrite? Cite the decisive evidence in the text or append its source in History." /></label><label>Judgment comparison<textarea required rows={3} value={calibration.judgmentComparison} onChange={(e) => setCalibration({ ...calibration, judgmentComparison: e.target.value })} placeholder="What did the original judgment get right, wrong, or leave unresolved—and was the process sound?" /></label></fieldset>
              <fieldset><legend><span>03</span> Audit sourcing and analytical mistakes</legend><label>Sourcing results<textarea required rows={3} value={calibration.sourcingResults} onChange={(e) => setCalibration({ ...calibration, sourcingResults: e.target.value })} placeholder="Which discovery channels produced credible companies, conversations, or dead ends?" /></label><label>Analytical mistakes<textarea required rows={3} value={calibration.analyticalMistakes} onChange={(e) => setCalibration({ ...calibration, analyticalMistakes: e.target.value })} placeholder="Name the reasoning error, missing evidence, or confidence failure—not merely the bad outcome." /></label><label>Calibration findings<textarea required rows={3} value={calibration.findings} onChange={(e) => setCalibration({ ...calibration, findings: e.target.value })} placeholder="Where were you overconfident, underconfident, right for the wrong reason, or still unresolved?" /></label></fieldset>
              <fieldset><legend><span>04</span> Change future behavior</legend><label>Updated decision rule<textarea required rows={3} value={calibration.updatedDecisionRule} onChange={(e) => setCalibration({ ...calibration, updatedDecisionRule: e.target.value })} placeholder="When the same pattern appears again, what concrete rule will govern your evidence or confidence?" /></label><label>Restart plan<textarea required rows={3} value={calibration.restartPlan} onChange={(e) => setCalibration({ ...calibration, restartPlan: e.target.value })} placeholder="Name the next Forecast, company judgment, sourcing test, or map that applies the update." /></label></fieldset>
              <CommitBar busy={busy} label="Commit Calibration Review" busyLabel="Scoring and preserving…" />
            </form>
          </section>
        )}

        {view === "plan" && (
          <section className="view form-view">
            <div className="intro-row"><div><span className="eyebrow coral">Sustainable practice architecture</span><h2>Change the mix, never inflate the week.</h2></div><p>Exam Mode wins when conditions overlap. Displaced work is recorded and never becomes catch-up debt.</p></div>
            <div className="mode-grid">{(Object.keys(practiceModes) as PracticeMode[]).map((modeName) => { const mode = practiceModes[modeName]; return <button type="button" key={modeName} onClick={() => setPlan({ ...plan, mode: modeName, rationale: modeName === "Normal Week" ? "Default sustainable practice week." : "Record the condition that activates this mode." })} className={plan.mode === modeName ? "mode-card selected" : "mode-card"}><span>{mode.totalMinutes} min</span><h3>{modeName}</h3><p>{mode.promise}</p><strong>{mode.dailyLoops} independent loop{mode.dailyLoops === 1 ? "" : "s"}</strong></button>; })}</div>
            <form className="judgment-form narrow" onSubmit={commitPlan}>
              <fieldset><legend><span>01</span> Record this week’s operating mode</legend><div className="field-grid two"><label>Week of<input required type="date" value={plan.weekOf} onChange={(e) => setPlan({ ...plan, weekOf: e.target.value })} /></label><label>Selected mode<select value={plan.mode} onChange={(e) => setPlan({ ...plan, mode: e.target.value as PracticeMode })}>{Object.keys(practiceModes).map((mode) => <option key={mode}>{mode}</option>)}</select></label></div><label>Why this mode applies<textarea required rows={3} value={plan.rationale} onChange={(e) => setPlan({ ...plan, rationale: e.target.value })} /></label><div className="field-grid two"><label>Dated recruiting opportunity <small>Required only for Recruiting Surge.</small><input value={plan.opportunity} onChange={(e) => setPlan({ ...plan, opportunity: e.target.value })} /></label><label>Deadline<input type="date" value={plan.deadline} onChange={(e) => setPlan({ ...plan, deadline: e.target.value })} /></label></div><label>Substitutions or deferred work<textarea required rows={3} value={plan.substitutions} onChange={(e) => setPlan({ ...plan, substitutions: e.target.value })} placeholder="Name what is displaced and why. Write None when nothing is displaced." /></label></fieldset>
              <div className="allocation-card"><div><span className="eyebrow">Verified arithmetic</span><h3>{practiceModes[plan.mode].totalMinutes / 60} hours · {practiceModes[plan.mode].dailyLoops} loops</h3></div><ul>{practiceModes[plan.mode].allocation.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <CommitBar busy={busy} label="Commit Weekly Mode" busyLabel="Preserving…" />
            </form>
          </section>
        )}

        {view === "history" && (
          <section className="view">
            <div className="intro-row"><div><span className="eyebrow coral">Private Learning Record</span><h2>Originals stay. Updates accumulate.</h2></div><p>Resolve Forecasts, record corrections, and add hindsight here. Nothing below edits the evidence you committed earlier.</p></div>
            <div className="history-tools"><label>Show<select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}><option value="all">All records</option><option value="daily_brief">Daily Briefs</option><option value="snapshot_judgment">Snapshots</option><option value="forecast">Forecasts</option><option value="second_order_map">Second-Order Maps</option><option value="founder_evidence_review">Founder Evidence Reviews</option><option value="weekly_underwrite">Underwrites</option><option value="calibration_review">Calibration Reviews</option><option value="weekly_plan">Practice plans</option></select></label><span>{filteredRecords.length} immutable submission{filteredRecords.length === 1 ? "" : "s"}</span></div>
            <div className="history-layout">
              <div className="timeline">
                {loading && <div className="empty-history"><p>Opening your private record…</p></div>}
                {!loading && !filteredRecords.length && <div className="empty-history"><p>No committed work yet.</p><span>Your first submission will appear here with its original timestamp.</span></div>}
                {filteredRecords.map((record) => {
                  const childReadings = data.records.filter((item) => item.parentId === record.id && item.recordType === "reading_record");
                  const events = data.events.filter((event) => event.recordId === record.id || childReadings.some((reading) => reading.id === event.recordId));
                  const founderSource = record.recordType === "founder_evidence_review" ? textValue(record.payload, "sourceUrlOrContext") : "";
                  return <article className="timeline-record" key={record.id}><span className="timeline-dot" /><div className="record-head"><span>{recordLabel(record.recordType)}</span><time>{formatTime(record.committedAt)}</time></div><h3>{record.title}</h3><p>{recordSummary(record)}</p>{founderSource.startsWith("http") && <a className="history-source-link" href={founderSource} target="_blank" rel="noreferrer">Open Founder Evidence source ↗</a>}{childReadings.length > 0 && <div className="reading-archive">{childReadings.map((reading) => <a key={reading.id} href={textValue(reading.payload, "canonicalUrl")} target="_blank" rel="noreferrer"><span>{textValue(reading.payload, "lane")}</span><strong>{reading.title}</strong><small>{textValue(reading.payload, "learnerResponse")}</small></a>)}</div>}{keyEvidence(record).length > 0 && <details className="evidence-details"><summary>Inspect committed evidence</summary>{keyEvidence(record).map(([label, value]) => <div key={label}><strong>{label}</strong><p>{value}</p></div>)}</details>}{events.map((event) => { const resolutionSource = textValue(event.eventData, "resolutionSource"); const reviewId = textValue(event.eventData, "calibrationReviewId"); const linkedReview = reviewId ? data.records.find((item) => item.id === reviewId) : undefined; return <div className="event" key={event.id}><span>{eventLabel(event.eventType)}</span><time>{formatTime(event.occurredAt)}</time><p>{textValue(event.eventData, "text")}</p>{(resolutionSource || linkedReview) && <div className="event-links">{resolutionSource && <a href={resolutionSource} target="_blank" rel="noreferrer">Open resolution source ↗</a>}{linkedReview && <span>Recorded in {linkedReview.title}</span>}</div>}</div>; })}</article>;
                })}
              </div>
              <aside className="append-card"><span className="eyebrow coral">Append, never overwrite</span><h3>Add later evidence</h3><p>Use this for reflection, correction, source status, coaching, or later usefulness. Resolve Forecasts only through a Calibration Review so outcome evidence and scoring remain complete.</p><form onSubmit={appendUpdate}><label>Original record<select required value={updateRecord} onChange={(e) => { setUpdateRecord(e.target.value); setUpdatePrivateEvidenceConfirmed(false); }}><option value="">Choose a record…</option>{data.records.map((record) => <option key={record.id} value={record.id}>{recordLabel(record.recordType)} · {record.title}</option>)}</select></label><label>Update type<select value={updateType} onChange={(e) => setUpdateType(e.target.value)}><option value="reflection">Reflection</option><option value="coach_feedback">Coach feedback</option><option value="later_usefulness">Later usefulness</option><option value="source_status">Source status</option><option value="metadata_correction">Metadata correction</option><option value="missed_practice">Missed practice</option></select></label><label>Dated update<textarea required rows={5} value={updateText} onChange={(e) => setUpdateText(e.target.value)} placeholder="State the new evidence, source, outcome, or correction. Do not restate history as if you knew it earlier." /></label>{selectedUpdateRecord?.recordType === "founder_evidence_review" && <label className="privacy-confirmation"><input required type="checkbox" checked={updatePrivateEvidenceConfirmed} onChange={(e) => setUpdatePrivateEvidenceConfirmed(e.target.checked)} />I confirm this update contains only consented behavioral evidence and omits raw transcripts, ratings, and confidential details.</label>}<button className="primary" disabled={busy}>{busy ? "Appending…" : "Append update"}</button></form></aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function CommitBar({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return <div className="form-commit"><div><span className="lock-mark">↳</span><p><strong>This submission becomes immutable.</strong><br />Later evidence will be appended as a dated event.</p></div><button className="primary" disabled={busy}>{busy ? busyLabel : label}</button></div>;
}

function EmptyState({ code, title, copy, action, onAction }: { code: string; title: string; copy: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span>{code}</span><h3>{title}</h3><p>{copy}</p><button className="primary" onClick={onAction}>{action}</button></div>;
}
