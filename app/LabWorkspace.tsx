"use client";

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { dateInTimeZone } from "./calibration";
import {
  CONVERSATION_WORKFLOWS,
  WORKFLOW_CONTRACTS,
  type ConversationWorkflow,
  type LearningConversation,
} from "./conversation";
import type { TodayAssignment, TodayAssignmentResponse } from "./DailyAssignmentView";

const AdvancedFormsView = lazy(() => import("./AdvancedFormsView").then((module) => ({ default: module.AdvancedFormsView })));
const ConversationTeacher = lazy(() => import("./ConversationTeacher").then((module) => ({ default: module.ConversationTeacher })));
const DailyAssignmentView = lazy(() => import("./DailyAssignmentView").then((module) => ({ default: module.DailyAssignmentView })));
const HistoryView = lazy(() => import("./HistoryView").then((module) => ({ default: module.HistoryView })));

export type PrimaryDestination = "today" | "work" | "record" | "more";
export type LegacyView = "brief" | "source" | "recruit" | "snapshot" | "forecast" | "map" | "founder" | "underwrite" | "diligence" | "coach" | "calibrate" | "plan" | "history";
export type View = PrimaryDestination | LegacyView;

type LabRecord = { id: string; recordType: string; title: string; payload: Record<string, unknown>; committedAt: string };
type Bootstrap = { counts: { records: number; events: number; conversations: number }; profile: { practiceMode: string } | null };
type AssignmentHistoryItem = { id: string; learnerDate: string; state: string; evidence: { title: string }; profile: { practiceMode: string }; archive: { status: "preserved" | "pending" } };

const DEFAULT_TIMEZONE = "America/Chicago";
const PRIMARY_NAV: Array<{ id: PrimaryDestination; key: string; label: string; hint: string }> = [
  { id: "today", key: "T", label: "Today", hint: "Talk through the next step" },
  { id: "work", key: "W", label: "Work", hint: "Active practice and drafts" },
  { id: "record", key: "R", label: "Record", hint: "Search what is preserved" },
  { id: "more", key: "M", label: "More", hint: "Tools and advanced entry" },
];

const WORK_RECORD_TYPES = [
  "daily_brief", "reading_record", "sourcing_experiment", "sourcing_lead", "recruiting_opportunity",
  "application_attempt", "interview_practice", "snapshot_judgment", "forecast", "second_order_map",
  "founder_evidence_review", "weekly_underwrite", "diligence_case", "diligence_stage", "coach_request",
  "coach_feedback", "revision_attempt", "calibration_review", "weekly_plan",
];

const CAPABILITY_GROUPS: Array<{ label: string; workflows: ConversationWorkflow[] }> = [
  { label: "Today and reflection", workflows: ["reading_response", "history_update", "weekly_plan"] },
  { label: "Company judgment", workflows: ["snapshot_judgment", "forecast", "second_order_map", "founder_evidence_review", "weekly_underwrite", "diligence_case", "diligence_stage"] },
  { label: "Sourcing and recruiting", workflows: ["sourcing_experiment", "sourcing_lead", "sourcing_progress", "recruiting_opportunity", "recruiting_evidence"] },
  { label: "Improve judgment", workflows: ["coach_request", "revision_attempt", "calibration_review"] },
];

const STRUCTURED_VIEW: Record<ConversationWorkflow, LegacyView> = {
  reading_response: "brief", history_update: "history", sourcing_experiment: "source", sourcing_lead: "source",
  sourcing_progress: "source", recruiting_opportunity: "recruit", recruiting_evidence: "recruit",
  snapshot_judgment: "snapshot", forecast: "forecast", second_order_map: "map", founder_evidence_review: "founder",
  weekly_underwrite: "underwrite", diligence_case: "diligence", diligence_stage: "diligence", coach_request: "coach",
  revision_attempt: "coach", calibration_review: "calibrate", weekly_plan: "plan",
};

function formatDate(value: string, timezone: string, withTime = false) {
  return new Intl.DateTimeFormat("en-US", withTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: timezone }
    : { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: timezone }).format(new Date(withTime ? value : `${value}T12:00:00-05:00`));
}

function recordLabel(value: string) {
  return value.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function LabWorkspace({ displayName, initialView = "today" }: { displayName: string; initialView?: View }) {
  const [view, setView] = useState<PrimaryDestination>(["today", "work", "record", "more"].includes(initialView) ? initialView as PrimaryDestination : "today");
  const [legacyView, setLegacyView] = useState<LegacyView | null>(["today", "work", "record", "more"].includes(initialView) ? null : initialView as LegacyView);
  const [directWorkflow, setDirectWorkflow] = useState<ConversationWorkflow | null>(null);
  const [assignment, setAssignment] = useState<TodayAssignment | null>(null);
  const [learnerDate, setLearnerDate] = useState(dateInTimeZone(new Date(), DEFAULT_TIMEZONE));
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [records, setRecords] = useState<LabRecord[]>([]);
  const [workConversations, setWorkConversations] = useState<LearningConversation[]>([]);
  const [workLoading, setWorkLoading] = useState(false);
  const [workError, setWorkError] = useState("");
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryItem[]>([]);
  const [search, setSearch] = useState("");

  async function loadToday() {
    setAssignmentLoading(true); setAssignmentError("");
    try {
      const [assignmentResponse, bootstrapResponse] = await Promise.all([
        fetch("/api/lab/assignment/today", { cache: "no-store" }),
        fetch("/api/lab/bootstrap", { cache: "no-store" }),
      ]);
      const assignmentResult = await assignmentResponse.json() as TodayAssignmentResponse & { error?: string };
      const bootstrapResult = await bootstrapResponse.json() as Bootstrap & { error?: string };
      if (!bootstrapResponse.ok) throw new Error(bootstrapResult.error || "The private Lab could not start.");
      setBootstrap(bootstrapResult);
      if (!assignmentResponse.ok) throw new Error(assignmentResult.error || "Today’s assignment is not available yet.");
      setLearnerDate(assignmentResult.learnerDate); setTimezone(assignmentResult.timezone);
      setAssignment(assignmentResult.assignment ? {
        ...assignmentResult.assignment,
        learnerDate: assignmentResult.learnerDate,
        timezone: assignmentResult.timezone,
        profileVersion: assignmentResult.profile?.version ?? assignmentResult.assignment.profileVersion ?? "unknown",
        practiceMode: assignmentResult.profile?.practiceMode ?? assignmentResult.assignment.practiceMode ?? "Normal Week",
        events: assignmentResult.assignment.events ?? [],
      } : null);
    } catch (caught) {
      setAssignment(null);
      setAssignmentError(caught instanceof Error && caught.message.includes("No active Lab Profile")
        ? "Your daily schedule has not been connected on this Mac yet. You can still talk to Luna or open More to choose a practice mode."
        : caught instanceof Error ? caught.message : "Today’s assignment is not available yet.");
    } finally { setAssignmentLoading(false); }
  }

  async function loadWork() {
    setWorkLoading(true); setWorkError("");
    try {
      const params = new URLSearchParams({ types: WORK_RECORD_TYPES.join(","), limit: "60" });
      const [recordsResponse, conversationsResponse] = await Promise.all([
        fetch(`/api/lab/records?${params}`, { cache: "no-store" }),
        fetch("/api/lab/conversations", { cache: "no-store" }),
      ]);
      const recordsResult = await recordsResponse.json() as { records?: LabRecord[]; error?: string };
      const conversationsResult = await conversationsResponse.json() as { conversations?: LearningConversation[]; error?: string };
      if (!recordsResponse.ok) throw new Error(recordsResult.error ?? "Your current work could not be loaded.");
      if (!conversationsResponse.ok) throw new Error(conversationsResult.error ?? "Your conversation drafts could not be loaded.");
      setRecords(recordsResult.records ?? []);
      setWorkConversations((conversationsResult.conversations ?? []).filter((item) => item.phase === "collecting" || item.phase === "review_ready"));
    } catch (caught) {
      setRecords([]); setWorkConversations([]);
      setWorkError(caught instanceof Error ? caught.message : "Your current work could not be loaded.");
    } finally { setWorkLoading(false); }
  }

  async function loadAssignmentHistory() {
    const response = await fetch("/api/lab/assignments/history", { cache: "no-store" });
    const result = await response.json() as { assignments?: AssignmentHistoryItem[] };
    if (response.ok) setAssignmentHistory(result.assignments ?? []);
  }

  useEffect(() => { const timer = window.setTimeout(() => void loadToday(), 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (view === "work") void loadWork();
      if (view === "record") void loadAssignmentHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [view]);

  const filteredGroups = useMemo(() => CAPABILITY_GROUPS.map((group) => ({
    ...group,
    workflows: group.workflows.filter((workflow) => {
      const contract = WORKFLOW_CONTRACTS[workflow];
      return `${contract.label} ${contract.description}`.toLowerCase().includes(search.trim().toLowerCase());
    }),
  })).filter((group) => group.workflows.length), [search]);
  const upcomingRecords = useMemo(() => records.filter((record) => {
    const date = ["nextActionDue", "dueDate", "resolutionDate", "endDate"].map((key) => record.payload[key]).find((value) => typeof value === "string");
    return typeof date === "string" && date >= learnerDate;
  }).slice(0, 8), [learnerDate, records]);

  function navigate(destination: PrimaryDestination) {
    setLegacyView(null); setDirectWorkflow(null); setResumeConversationId(null); setView(destination);
  }

  function talkThrough(workflow: ConversationWorkflow) {
    setDirectWorkflow(workflow); setLegacyView(null); setView("today");
  }

  function resumeConversation(id: string) {
    setResumeConversationId(id); setDirectWorkflow(null); setLegacyView(null); setView("today");
  }

  if (legacyView) return <Suspense fallback={<div className="lab-loading" role="status">Opening advanced entry…</div>}>
    <AdvancedFormsView displayName={displayName} initialView={legacyView} onExit={navigate} />
  </Suspense>;

  return <div className="lab-shell">
    <aside className="rail">
      <button className="brand" onClick={() => navigate("today")} aria-label="Venture Judgment Lab home"><span className="brand-mark">VJ</span><span><strong>Venture</strong><em>Judgment Lab</em></span></button>
      <nav aria-label="Lab destinations">{PRIMARY_NAV.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => navigate(item.id)} aria-current={view === item.id ? "page" : undefined}><span className="nav-key">{item.key}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>)}</nav>
      <div className="rail-foot"><span className="privacy-dot" /><span><strong>Private local record</strong><small>Review before preserve</small></span></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div><span className="eyebrow">{formatDate(learnerDate, timezone)}</span><h1>{view === "today" ? `Good morning, ${displayName}.` : PRIMARY_NAV.find((item) => item.id === view)?.label}</h1></div><button className="mode-chip" onClick={() => navigate("more")}><span>{bootstrap?.profile?.practiceMode ?? "Local Lab"}</span><strong>{bootstrap?.counts.records ?? 0}</strong></button></header>

      {view === "today" && <section className="view chat-first-view">
        <Suspense fallback={<div className="lab-loading" role="status">Opening Luna…</div>}><ConversationTeacher key={resumeConversationId ?? directWorkflow ?? "luna-home"} initialWorkflow={directWorkflow ?? "snapshot_judgment"} initialConversationId={resumeConversationId} directStart={Boolean(directWorkflow)} onCommitted={loadWork} /></Suspense>
        <aside className="today-context"><span className="eyebrow">Today’s context</span>{assignmentLoading ? <p>Checking today’s work…</p> : assignmentError ? <><strong>No daily assignment yet</strong><p>{assignmentError}</p><button className="text-button" onClick={() => navigate("more")}>Open setup and advanced tools →</button></> : assignment ? <><strong>{assignment.state === "ready" ? "Daily Brief ready" : assignment.state.replaceAll("_", " ")}</strong><p>{assignment.brief ? `${assignment.brief.readings.length} readings · ${assignment.brief.totalMinutes} minutes` : assignment.nextAction}</p><button className="text-button" onClick={() => { setLegacyView("brief"); }}>Open the Brief →</button></> : <><strong>No scheduled work</strong><p>Ask Luna what to do next or choose a practice mode in More.</p></>}</aside>
      </section>}

      {view === "work" && <section className="view"><div className="intro-row"><div><span className="eyebrow coral">Work in motion</span><h2>Continue by status, not by feature.</h2></div><p>Your assignment and recently preserved work are gathered here. Luna remains the default entry.</p></div>
        {workError && <div className="conversation-error" role="alert"><span>{workError}</span><button onClick={() => void loadWork()}>Try again</button></div>}
        <div className="work-grid"><article className="work-primary"><span className="eyebrow">Daily practice</span>{assignmentError ? <><h3>Schedule not connected</h3><p>{assignmentError}</p><button className="primary" onClick={() => navigate("today")}>Ask Luna what to do</button></> : <Suspense fallback={<p>Opening today’s assignment…</p>}><DailyAssignmentView assignment={assignment} loading={assignmentLoading} error="" variant="today" onOpenBrief={() => setLegacyView("brief")} onRetry={loadToday} /></Suspense>}</article><article className="work-summary"><span className="eyebrow">Continue</span><h3>{workLoading ? "Opening…" : `${workConversations.length} active drafts`}</h3><p>Resume a private conversation exactly where you left it.</p>{workConversations[0] ? <button className="text-button" onClick={() => resumeConversation(workConversations[0].id)}>Resume latest draft →</button> : <button className="text-button" onClick={() => navigate("today")}>Start with Luna →</button>}</article></div>
        {workConversations.length > 0 && <section className="work-status"><span className="eyebrow">Continue</span><div className="work-list">{workConversations.map((item) => <article key={item.id}><span>{item.phase.replaceAll("_", " ")}</span><strong>{item.title}</strong><button className="text-button" onClick={() => resumeConversation(item.id)}>Resume →</button></article>)}</div></section>}
        {upcomingRecords.length > 0 && <section className="work-status"><span className="eyebrow">Upcoming</span><div className="work-list">{upcomingRecords.map((record) => <article key={record.id}><span>{recordLabel(record.recordType)}</span><strong>{record.title}</strong><time>{String(record.payload.nextActionDue ?? record.payload.dueDate ?? record.payload.resolutionDate ?? record.payload.endDate)}</time></article>)}</div></section>}
        <section className="work-status"><span className="eyebrow">Recent preserved reference</span><div className="work-list">{records.slice(0, 12).map((record) => <article key={record.id}><span>{recordLabel(record.recordType)}</span><strong>{record.title}</strong><time>{formatDate(record.committedAt, timezone, true)}</time></article>)}</div></section>
      </section>}

      {view === "record" && <section className="view"><div className="intro-row"><div><span className="eyebrow coral">Private Learning Record</span><h2>Originals stay. Updates accumulate.</h2></div><p>Search committed evidence, transcripts, and assignment outcomes without rewriting history.</p></div>{assignmentHistory.length > 0 && <section className="record-delivery"><span className="eyebrow">Recent assignment outcomes</span>{assignmentHistory.slice(0, 4).map((item) => <article key={item.id}><time>{item.learnerDate}</time><strong>{item.evidence.title}</strong><span>{item.state.replaceAll("_", " ")} · {item.archive.status}</span></article>)}</section>}<Suspense fallback={<div className="lab-loading">Opening your record…</div>}><HistoryView /></Suspense></section>}

      {view === "more" && <section className="view"><div className="intro-row"><div><span className="eyebrow coral">Capabilities and escape hatches</span><h2>Everything is still here—when you need it.</h2></div><p>Talk through a capability with Luna or open its structured editor directly.</p></div><label className="capability-search">Find a capability<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Snapshot, recruiting, calibration…" /></label><div className="capability-groups">{filteredGroups.map((group) => <section key={group.label}><h3>{group.label}</h3><div>{group.workflows.map((workflow) => { const contract = WORKFLOW_CONTRACTS[workflow]; return <article key={workflow}><span className="eyebrow">{contract.operation.replaceAll("_", " ")}</span><strong>{contract.label}</strong><p>{contract.description}</p><div><button className="primary" onClick={() => talkThrough(workflow)}>Talk it through</button><button className="text-button" onClick={() => setLegacyView(STRUCTURED_VIEW[workflow])}>Open structured editor</button></div></article>; })}</div></section>)}</div><aside className="privacy-card"><strong>Private and evidence-first</strong><p>Conversation cannot bypass typed validators, publish anything, contact firms, or commit without your explicit confirmation.</p><small>{CONVERSATION_WORKFLOWS.length} approved conversational capabilities · advanced entry remains available</small></aside></section>}
    </main>
  </div>;
}
