"use client";

import { FormEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { calculateBrierScore, dateInTimeZone, type ForecastOutcome } from "./calibration";
import {
  DailyAssignmentView,
  type TodayAssignment,
  type TodayAssignmentResponse,
} from "./DailyAssignmentView";
import {
  emptyFounderDimensions,
  FOUNDER_DIMENSIONS,
  FOUNDER_SOURCE_TYPES,
  type FounderDimensionObservation,
  type FounderSourceType,
} from "./founderEvidence";
import { applySourcingCorrections, currentSourcingStage, sourcingStageIndex } from "./sourcing";
import type { ConversationWorkflow } from "./conversation";
import type { PrimaryDestination } from "./LabWorkspace";

const ConversationTeacherSurface = lazy(() => import("./TeacherSurface").then((module) => ({ default: module.ConversationTeacherSurface })));
const TeacherEntrySurface = lazy(() => import("./TeacherEntrySurface").then((module) => ({ default: module.TeacherEntrySurface })));
const TeacherLauncherSurface = lazy(() => import("./TeacherEntrySurface").then((module) => ({ default: module.TeacherLauncherSurface })));
const SourcingView = lazy(() => import("./SourcingView").then((module) => ({ default: module.SourcingView })));
const RecruitingView = lazy(() => import("./RecruitingView").then((module) => ({ default: module.RecruitingView })));
const DiligenceView = lazy(() => import("./DiligenceView").then((module) => ({ default: module.DiligenceView })));
const CoachView = lazy(() => import("./CoachView").then((module) => ({ default: module.CoachView })));
const HistoryView = lazy(() => import("./HistoryView").then((module) => ({ default: module.HistoryView })));

export type View = "today" | "teacher" | "brief" | "source" | "recruit" | "snapshot" | "forecast" | "map" | "founder" | "underwrite" | "diligence" | "coach" | "calibrate" | "plan" | "history";

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

type LabData = { records: LabRecord[]; events: LabEvent[]; nextCursor?: string | null };

type AssignmentHistoryItem = {
  id: string;
  learnerDate: string;
  state: string;
  createdAt: string;
  evidence: { id: string; title: string };
  profile: { version: string; timezone: string; practiceMode: string };
  run: { id: string; scheduledFor: string; notificationIntent: string; evidenceRecordId: string };
  archive: { status: "preserved" | "pending"; preservedAt: string | null };
};

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

const DEFAULT_LAB_TIMEZONE = "America/Chicago";

const navItems: Array<{ id: View; key: string; label: string; hint: string }> = [
  { id: "today", key: "T", label: "Today", hint: "The next judgment" },
  { id: "teacher", key: "AI", label: "Teacher", hint: "Talk, then preserve" },
  { id: "brief", key: "B", label: "Brief", hint: "Four real readings" },
  { id: "source", key: "D", label: "Sourcing", hint: "Discover companies early" },
  { id: "recruit", key: "R", label: "Recruit", hint: "Count real outcomes" },
  { id: "snapshot", key: "S", label: "Snapshot", hint: "Lock the first pass" },
  { id: "forecast", key: "F", label: "Forecast", hint: "Put odds on it" },
  { id: "map", key: "M", label: "2nd Order", hint: "Trace consequences" },
  { id: "founder", key: "E", label: "Founder", hint: "Observe behavior" },
  { id: "underwrite", key: "U", label: "Underwrite", hint: "Test the crux" },
  { id: "diligence", key: "L", label: "Diligence", hint: "Earn and defend the memo" },
  { id: "coach", key: "J", label: "Coach", hint: "Diagnose after commitment" },
  { id: "calibrate", key: "C", label: "Calibrate", hint: "Score prior judgment" },
  { id: "plan", key: "P", label: "Practice", hint: "Choose the week mode" },
  { id: "history", key: "H", label: "History", hint: "Nothing rewritten" },
];

const viewWorkflows: Partial<Record<View, ConversationWorkflow>> = {
  source: "sourcing_lead",
  recruit: "recruiting_opportunity",
  snapshot: "snapshot_judgment",
  forecast: "forecast",
  map: "second_order_map",
  founder: "founder_evidence_review",
  underwrite: "weekly_underwrite",
  diligence: "diligence_stage",
  coach: "coach_request",
  calibrate: "calibration_review",
  plan: "weekly_plan",
};

const viewRecordTypes: Partial<Record<View, string[]>> = {
  source: ["sourcing_experiment", "sourcing_lead", "snapshot_judgment", "weekly_underwrite"],
  recruit: ["recruiting_opportunity", "opportunity_observation", "opportunity_monitor_run", "opportunity_monitor_registration", "recruiting_interaction", "application_attempt", "interview_practice", "portfolio_candidate"],
  snapshot: ["sourcing_experiment", "sourcing_lead", "snapshot_judgment"],
  forecast: ["snapshot_judgment", "forecast"],
  founder: ["snapshot_judgment", "founder_evidence_review"],
  underwrite: ["snapshot_judgment", "founder_evidence_review", "weekly_underwrite"],
  diligence: ["snapshot_judgment", "weekly_underwrite", "diligence_case", "diligence_stage"],
  coach: ["snapshot_judgment", "weekly_underwrite", "forecast", "second_order_map", "founder_evidence_review", "diligence_stage", "coach_request", "coach_feedback", "revision_attempt", "mastery_evidence"],
  calibrate: ["forecast", "snapshot_judgment", "weekly_underwrite", "calibration_review"],
  plan: ["sourcing_experiment", "weekly_plan"],
};

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
  sourcingLeadId: "",
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
  sourceDate: dateInTimeZone(new Date(), DEFAULT_LAB_TIMEZONE),
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

function formatBriefDate(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
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
    sourcing_experiment: "Sourcing Experiment",
    sourcing_lead: "Sourcing Lead",
    recruiting_opportunity: "Recruiting Opportunity",
    opportunity_observation: "Opportunity Observation",
    opportunity_monitor_registration: "Opportunity Monitor Registration",
    opportunity_monitor_run: "Opportunity Monitor Run",
    recruiting_interaction: "Recruiting Interaction",
    application_attempt: "Application Attempt",
    interview_practice: "Interview Practice",
    portfolio_candidate: "Portfolio Candidate",
    weekly_underwrite: "Weekly Underwrite",
    diligence_case: "Diligence Case",
    diligence_stage: "Diligence Stage",
    coach_request: "Coach Request",
    coach_feedback: "Coach Feedback",
    revision_attempt: "Revision Attempt",
    mastery_evidence: "Mastery Evidence",
    weekly_plan: "Practice Plan",
    calibration_review: "Calibration Review",
  }[type] ?? type.replaceAll("_", " ");
}

function textValue(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function numberValue(payload: Record<string, unknown>, key: string): number {
  const value = payload[key];
  return typeof value === "number" ? value : Number(value || 0);
}

export function AdvancedFormsView({ displayName, initialView = "snapshot", onExit }: { displayName: string; initialView?: View; onExit?: (destination: PrimaryDestination) => void }) {
  const [view, setView] = useState<View>(initialView);
  const [teacherWorkflow, setTeacherWorkflow] = useState<ConversationWorkflow>("snapshot_judgment");
  const [advancedEntryVisible, setAdvancedEntryVisible] = useState(false);
  const [data, setData] = useState<LabData>({ records: [], events: [] });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const viewCache = useRef(new Map<string, LabData>());

  const [assignment, setAssignment] = useState<TodayAssignment | null>(null);
  const [assignmentDate, setAssignmentDate] = useState(dateInTimeZone(new Date(), DEFAULT_LAB_TIMEZONE));
  const [assignmentTimezone, setAssignmentTimezone] = useState(DEFAULT_LAB_TIMEZONE);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryItem[]>([]);
  const [assignmentHistoryError, setAssignmentHistoryError] = useState("");
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
    sourcingExperimentId: "",
  });

  const snapshots = useMemo(
    () => data.records.filter((record) => record.recordType === "snapshot_judgment"),
    [data.records],
  );
  const founderReviews = useMemo(
    () => data.records.filter((record) => record.recordType === "founder_evidence_review"),
    [data.records],
  );
  const eventsByRecord = useMemo(() => {
    const index = new Map<string, LabEvent[]>();
    for (const event of data.events) index.set(event.recordId, [...(index.get(event.recordId) ?? []), event]);
    return index;
  }, [data.events]);
  const sourcingLeads = useMemo(
    () => data.records
      .filter((record) => record.recordType === "sourcing_lead")
      .map((record) => ({
        ...record,
        payload: applySourcingCorrections(record.payload, eventsByRecord.get(record.id) ?? []),
      })),
    [data.records, eventsByRecord],
  );
  const sourcingExperiments = useMemo(
    () => data.records.filter((record) => record.recordType === "sourcing_experiment"),
    [data.records],
  );
  const qualifiedSourcingLeads = useMemo(
    () => sourcingLeads.filter((lead) => (
      sourcingStageIndex(currentSourcingStage(lead, eventsByRecord.get(lead.id) ?? [])) >= sourcingStageIndex("qualified")
    )),
    [eventsByRecord, sourcingLeads],
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
  const currentTimezone = assignment?.timezone || assignmentTimezone;

  async function refresh(targetView: View = view) {
    const types = viewRecordTypes[targetView] ?? [];
    if (types.length === 0) {
      setData({ records: [], events: [] });
      return;
    }
    const cacheKey = types.join(",");
    const cached = viewCache.current.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }
    try {
      const loaded: LabData = { records: [], events: [] };
      let cursor: string | null = null;
      do {
        const params = new URLSearchParams({ types: types.join(","), limit: "200", includeEvents: "1" });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/lab/records?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Your private record could not be loaded.");
        const result = await response.json() as LabData;
        loaded.records.push(...(result.records ?? []));
        loaded.events.push(...(result.events ?? []));
        cursor = result.nextCursor ?? null;
      } while (cursor);
      viewCache.current.set(cacheKey, loaded);
      setData(loaded);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your private record could not be loaded.");
    } finally {
      // View-scoped loading is handled by the route-level Suspense boundary.
    }
  }

  async function refreshAssignment() {
    setAssignmentLoading(true);
    setAssignmentError("");
    try {
      const response = await fetch("/api/lab/assignment/today", { cache: "no-store" });
      const result = (await response.json()) as TodayAssignmentResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Your private assignment could not be loaded.");
      setAssignmentDate(result.learnerDate);
      setAssignmentTimezone(result.timezone);
      setAssignment(result.assignment ? {
        ...result.assignment,
        learnerDate: result.learnerDate,
        timezone: result.timezone,
        profileVersion: result.profile?.version ?? result.assignment.profileVersion ?? "unknown",
        practiceMode: result.profile?.practiceMode ?? result.assignment.practiceMode ?? "Normal Week",
        events: result.assignment.events ?? [],
      } : null);
    } catch (error) {
      setAssignment(null);
      setAssignmentError(error instanceof Error ? error.message : "Your private assignment could not be loaded.");
    } finally {
      setAssignmentLoading(false);
    }
  }

  async function refreshAssignmentHistory() {
    setAssignmentHistoryError("");
    try {
      const response = await fetch("/api/lab/assignments/history", { cache: "no-store" });
      const result = (await response.json()) as { assignments?: AssignmentHistoryItem[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Assignment history could not be loaded.");
      setAssignmentHistory(result.assignments ?? []);
    } catch (error) {
      setAssignmentHistory([]);
      setAssignmentHistoryError(error instanceof Error ? error.message : "Assignment history could not be loaded.");
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void refresh(view);
      if (view === "today" || view === "brief") void refreshAssignment();
      if (view === "history") void refreshAssignmentHistory();
    }, 0);
    return () => window.clearTimeout(initialLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view selects the scoped query set.
  }, [view]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAdvancedEntryVisible(false), 0);
    return () => window.clearTimeout(timer);
  }, [view]);

  function openTeacher(workflow?: ConversationWorkflow) {
    if (workflow) setTeacherWorkflow(workflow);
    setView("teacher");
  }

  async function post(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string; record?: LabRecord; event?: LabEvent };
      if (!response.ok) throw new Error(result.error ?? "The record could not be preserved.");
      viewCache.current.clear();
      if (result.record) {
        setData((current) => ({ ...current, records: [result.record!, ...current.records.filter((record) => record.id !== result.record!.id)] }));
      } else if (result.event) {
        setData((current) => ({ ...current, events: [...current.events.filter((event) => event.id !== result.event!.id), result.event!] }));
      } else {
        await refresh(view);
      }
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The record could not be preserved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function appendAssignmentEvent(
    recordId: string,
    eventType: string,
    eventData: Record<string, unknown>,
  ): Promise<boolean> {
    const saved = await post({ operation: "append_event", recordId, eventType, eventData });
    if (saved) {
      await refreshAssignment();
      await refreshAssignmentHistory();
      setNotice(eventType === "completion"
        ? "Today’s Brief is complete. The original assignment and every response remain preserved."
        : "Independent First Pass preserved beside the original reading.");
    }
    return saved;
  }

  async function commitSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sourceLead = qualifiedSourcingLeads.find((record) => record.id === snapshot.sourcingLeadId);
    const saved = await post({
      operation: "commit_record",
      recordType: "snapshot_judgment",
      parentId: sourceLead?.id ?? null,
      title: `${snapshot.company} — ${snapshot.disposition} at ${snapshot.confidence}%`,
      payload: { ...snapshot, timezone: currentTimezone, timeboxMinutes: 20 },
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
      payload: { ...forecast, timezone: currentTimezone, timeboxMinutes: 10, status: "open" },
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
      payload: { ...secondOrder, timezone: currentTimezone },
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
      payload: { ...founderReview, timezone: currentTimezone },
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

  const latestPlan = topLevelRecords.find((record) => record.recordType === "weekly_plan");
  const activeMode = (assignment?.practiceMode || (latestPlan ? textValue(latestPlan.payload, "mode") : "Normal Week")) as PracticeMode;
  const modeDefinition = practiceModes[activeMode] ?? practiceModes["Normal Week"];
  const progress = {
    briefs: topLevelRecords.filter((record) => record.recordType === "daily_brief").length,
    sourcingLeads: sourcingLeads.length,
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
  const entryWorkflow = viewWorkflows[view];

  return (
    <div className="lab-shell">
      <aside className="rail">
        <button className="brand" onClick={() => onExit ? onExit("today") : setView("today")} aria-label="Venture Judgment Lab home">
          <span className="brand-mark">VJ</span>
          <span><strong>Venture</strong><em>Judgment Lab</em></span>
        </button>
        <nav aria-label="Lab sections">
          {(onExit ? [
            { id: "today", key: "T", label: "Today", hint: "Talk through the next step" },
            { id: "work", key: "W", label: "Work", hint: "Active practice and drafts" },
            { id: "record", key: "R", label: "Record", hint: "Search what is preserved" },
            { id: "more", key: "M", label: "More", hint: "Tools and advanced entry" },
          ] : navItems).map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => onExit ? onExit(item.id as PrimaryDestination) : setView(item.id as View)} aria-current={view === item.id ? "page" : undefined}>
              <span className="nav-key">{item.key}</span>
              <span><strong>{item.label}</strong><small>{item.hint}</small></span>
            </button>
          ))}
        </nav>
        <div className="rail-foot"><span className="privacy-dot" /><span><strong>Private record</strong><small>Append-only by design</small></span></div>
      </aside>

      <main className={`workspace ${entryWorkflow && !advancedEntryVisible ? "manual-collapsed" : ""}`}>
        <header className="topbar">
          <div><span className="eyebrow">{formatBriefDate(assignmentDate, currentTimezone)}</span><h1>{view === "today" ? `Good morning, ${displayName}.` : navItems.find((item) => item.id === view)?.label}</h1></div>
          <button className="mode-chip" onClick={() => setView("plan")}><span>{activeMode}</span><strong>{modeDefinition.totalMinutes / 60}h</strong></button>
        </header>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}

        {entryWorkflow && <Suspense fallback={<div className="teacher-entry-strip"><span>Opening Teacher…</span></div>}><TeacherEntrySurface
          workflow={entryWorkflow}
          advancedVisible={advancedEntryVisible}
          onOpen={() => openTeacher(entryWorkflow)}
          onToggleAdvanced={() => setAdvancedEntryVisible((visible) => !visible)}
        /></Suspense>}

        {view === "today" && (
          <section className="view today-view">
            <Suspense fallback={<div className="teacher-launcher"><p>Opening Teacher…</p></div>}><TeacherLauncherSurface onOpen={openTeacher} /></Suspense>
            <div className="hero-grid">
              <DailyAssignmentView assignment={assignment} error={assignmentError} loading={assignmentLoading} variant="today" onOpenBrief={() => setView("brief")} onRetry={() => void refreshAssignment()} />
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
                ["01", "Daily Brief", assignment ? assignment.state.replaceAll("_", " ") : "Awaiting accepted outcome", assignment?.brief ? `${assignment.brief.totalMinutes} min` : "No stale fallback", "brief"],
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
              <div><strong>{progress.sourcingLeads}</strong><span>Sourcing leads</span></div>
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

        {view === "teacher" && (
          <section className="view teacher-view">
            <Suspense fallback={<div className="lab-loading" role="status">Opening Teacher…</div>}><ConversationTeacherSurface key={teacherWorkflow} initialWorkflow={teacherWorkflow} onCommitted={refresh} /></Suspense>
          </section>
        )}

        {view === "brief" && (
          <section className="view">
            <DailyAssignmentView assignment={assignment} error={assignmentError} loading={assignmentLoading} variant="brief" onRetry={() => void refreshAssignment()} onAppendEvent={appendAssignmentEvent} />
          </section>
        )}

        {view === "source" && (
          <SourcingView
            records={data.records}
            events={data.events}
            timezone={currentTimezone}
            busy={busy}
            post={post}
            announce={setNotice}
          />
        )}

        {view === "recruit" && (
          <RecruitingView
            records={data.records}
            timezone={currentTimezone}
            busy={busy}
            post={post}
            announce={setNotice}
          />
        )}

        {view === "diligence" && (
          <DiligenceView
            records={data.records}
            timezone={currentTimezone}
            busy={busy}
            post={post}
            announce={setNotice}
          />
        )}

        {view === "coach" && (
          <CoachView
            records={data.records}
            timezone={currentTimezone}
            busy={busy}
            post={post}
            announce={setNotice}
          />
        )}

        {view === "snapshot" && (
          <section className="view form-view">
            <div className="intro-row"><div><span className="eyebrow coral">Independent First Pass · 20-minute cap</span><h2>Commit before you know everything.</h2></div><p>A valid Snapshot makes the causal view, evidence, uncertainty, and confidence visible. It does not pretend to be complete.</p></div>
            <form className="judgment-form" onSubmit={commitSnapshot}>
              <fieldset><legend><span>01</span> Identify the opportunity</legend><label>Link a qualified Sourcing Lead <small>Optional for companies found outside the sourcing workbench. Only leads with preserved qualification evidence appear here.</small><select value={snapshot.sourcingLeadId} onChange={(e) => { const sourceLead = qualifiedSourcingLeads.find((record) => record.id === e.target.value); setSnapshot({ ...snapshot, sourcingLeadId: e.target.value, company: sourceLead ? textValue(sourceLead.payload, "company") : snapshot.company, stage: sourceLead ? textValue(sourceLead.payload, "companyStage") : snapshot.stage, sector: sourceLead ? textValue(sourceLead.payload, "sector") : snapshot.sector, discoverySource: sourceLead ? `${textValue(sourceLead.payload, "attributionClass")} · ${textValue(sourceLead.payload, "channel")}` : snapshot.discoverySource }); }}><option value="">No linked Sourcing Lead</option>{qualifiedSourcingLeads.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label><div className="field-grid three"><label>Company {snapshot.sourcingLeadId && <small>Locked to the selected lead.</small>}<input required readOnly={Boolean(snapshot.sourcingLeadId)} value={snapshot.company} onChange={(e) => setSnapshot({ ...snapshot, company: e.target.value })} placeholder="Company name" /></label><label>Stage<select value={snapshot.stage} onChange={(e) => setSnapshot({ ...snapshot, stage: e.target.value })}><option>Pre-seed</option><option>Seed</option><option>Series A</option><option>Unknown</option></select></label><label>Sector<input required value={snapshot.sector} onChange={(e) => setSnapshot({ ...snapshot, sector: e.target.value })} placeholder="Specific domain" /></label></div><label>How did you find it?<input required readOnly={Boolean(snapshot.sourcingLeadId)} value={snapshot.discoverySource} onChange={(e) => setSnapshot({ ...snapshot, discoverySource: e.target.value })} placeholder="Reading, founder, database, event, or independent search" /></label></fieldset>
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
                <div className="resolution-list">{openForecasts.map((record) => { const draft = resolutionDrafts[record.id] ?? emptyResolutionDraft(); const forecastTimezone = textValue(record.payload, "timezone") || currentTimezone; const canResolveNegative = dateInTimeZone(new Date(), forecastTimezone) > textValue(record.payload, "resolutionDate"); return <article className={draft.selected ? "resolution-row selected" : "resolution-row"} key={record.id}><label className="resolution-check"><input type="checkbox" checked={draft.selected} onChange={(e) => updateResolution(record.id, { selected: e.target.checked })} /><span><strong>{numberValue(record.payload, "probability")}%</strong>{textValue(record.payload, "claim")}</span></label>{draft.selected && <div className="resolution-fields"><label>Observed outcome<select value={draft.outcome} onChange={(e) => updateResolution(record.id, { outcome: Number(e.target.value) as ForecastOutcome })}><option value={1}>Occurred</option><option value={0} disabled={!canResolveNegative}>Did not occur</option></select>{!canResolveNegative && <small>A negative outcome can be resolved only after {textValue(record.payload, "resolutionDate")} has fully elapsed in {forecastTimezone}. An event that already occurred may be resolved early.</small>}</label><label>Resolution evidence<textarea required rows={2} value={draft.resolutionEvidence} onChange={(e) => updateResolution(record.id, { resolutionEvidence: e.target.value })} placeholder="What happened, stated without rewriting the original claim." /></label><label>Resolution source URL<input required type="url" value={draft.resolutionSource} onChange={(e) => updateResolution(record.id, { resolutionSource: e.target.value })} placeholder="https://" /></label></div>}</article>; })}</div>
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
              <fieldset><legend><span>01</span> Record this week’s operating mode</legend><div className="field-grid two"><label>Week of<input required type="date" value={plan.weekOf} onChange={(e) => setPlan({ ...plan, weekOf: e.target.value })} /></label><label>Selected mode<select value={plan.mode} onChange={(e) => setPlan({ ...plan, mode: e.target.value as PracticeMode })}>{Object.keys(practiceModes).map((mode) => <option key={mode}>{mode}</option>)}</select></label></div><label>Active Sourcing Experiment <small>Optional. Its discovery work uses the existing Daily Loop and recruiting allocations—never extra hours.</small><select value={plan.sourcingExperimentId} onChange={(e) => setPlan({ ...plan, sourcingExperimentId: e.target.value })}><option value="">No active experiment this week</option>{sourcingExperiments.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label><label>Why this mode applies<textarea required rows={3} value={plan.rationale} onChange={(e) => setPlan({ ...plan, rationale: e.target.value })} /></label><div className="field-grid two"><label>Dated recruiting opportunity <small>Required only for Recruiting Surge.</small><input value={plan.opportunity} onChange={(e) => setPlan({ ...plan, opportunity: e.target.value })} /></label><label>Deadline<input type="date" value={plan.deadline} onChange={(e) => setPlan({ ...plan, deadline: e.target.value })} /></label></div><label>Substitutions or deferred work<textarea required rows={3} value={plan.substitutions} onChange={(e) => setPlan({ ...plan, substitutions: e.target.value })} placeholder="Name what is displaced and why. Write None when nothing is displaced." /></label></fieldset>
              <div className="allocation-card"><div><span className="eyebrow">Verified arithmetic</span><h3>{practiceModes[plan.mode].totalMinutes / 60} hours · {practiceModes[plan.mode].dailyLoops} loops</h3></div><ul>{practiceModes[plan.mode].allocation.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <CommitBar busy={busy} label="Commit Weekly Mode" busyLabel="Preserving…" />
            </form>
          </section>
        )}

        {view === "history" && (
          <section className="view">
            <div className="intro-row"><div><span className="eyebrow coral">Private Learning Record</span><h2>Originals stay. Updates accumulate.</h2></div><p>Resolve Forecasts, record corrections, and add hindsight here. Nothing below edits the evidence you committed earlier.</p></div>
            <section className="delivery-ledger" aria-labelledby="daily-delivery-ledger-title">
              <div className="delivery-ledger-head"><div><span className="eyebrow">Daily delivery ledger</span><h3 id="daily-delivery-ledger-title">Assignment, operator, and archive evidence</h3></div><p>{assignmentHistory.length} preserved assignment outcome{assignmentHistory.length === 1 ? "" : "s"}</p></div>
              {assignmentHistoryError && <p className="delivery-ledger-error" role="alert">{assignmentHistoryError}</p>}
              {!assignmentHistoryError && assignmentHistory.length === 0 && <p className="delivery-ledger-empty">No Daily Assignment has been preserved yet.</p>}
              <div className="delivery-ledger-list">{assignmentHistory.map((item) => (
                <article className="delivery-ledger-row" key={item.id}>
                  <div><time>{formatBriefDate(item.learnerDate, item.profile.timezone)}</time><strong>{item.evidence.title}</strong><span>{item.state.replaceAll("_", " ")} · {item.profile.practiceMode} · profile {item.profile.version}</span></div>
                  <div><span>Operator slot {formatTime(item.run.scheduledFor)}</span><strong className={item.archive.status === "preserved" ? "archive-preserved" : "archive-pending"}>{item.archive.status === "preserved" ? "Archive preserved" : "Archive pending"}</strong>{item.archive.preservedAt && <time>Preserved {formatTime(item.archive.preservedAt)}</time>}</div>
                </article>
              ))}</div>
            </section>
            <HistoryView />
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
