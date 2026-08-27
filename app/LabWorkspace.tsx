"use client";

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Archive, CalendarCheck, Compass, HouseLine } from "@phosphor-icons/react";
import { dateInTimeZone } from "./calibration";
import { CONVERSATION_WORKFLOWS, WORKFLOW_CONTRACTS, type ConversationWorkflow, type LearningConversation } from "./conversation";
import type { TodayAssignment, TodayAssignmentResponse } from "./DailyAssignmentView";
import { CourseTodayView } from "./CourseTodayView";
import { EvidenceView } from "./EvidenceView";
import { PracticeView } from "./PracticeView";
import type { CourseRecord, CurriculumEpoch, PracticeDay, PracticeProgress } from "./courseViewTypes";

const AdvancedFormsView = lazy(() => import("./AdvancedFormsView").then((module) => ({ default: module.AdvancedFormsView })));
const ConversationTeacher = lazy(() => import("./ConversationTeacher").then((module) => ({ default: module.ConversationTeacher })));

export type PrimaryDestination = "today" | "practice" | "evidence" | "more";
export type LegacyView = "brief" | "source" | "recruit" | "snapshot" | "forecast" | "map" | "founder" | "underwrite" | "diligence" | "coach" | "calibrate" | "plan" | "history";
export type View = PrimaryDestination | LegacyView;

type Bootstrap = { counts: { records: number; events: number; conversations: number }; profile: { practiceMode: string } | null };
type AssignmentHistoryItem = { id: string; learnerDate: string; state: string; evidence: { title: string }; archive: { status: "preserved" | "pending" } };
type CourseTodayResponse = TodayAssignmentResponse & { epoch?: CurriculumEpoch | null; practiceDay?: PracticeDay | null; progress?: PracticeProgress | null; error?: string };

const DEFAULT_TIMEZONE = "America/Chicago";
const PRIMARY_NAV = [
  { id: "today", icon: HouseLine, label: "Today", hint: "Your daily route" },
  { id: "practice", icon: Compass, label: "Practice", hint: "Decision drills" },
  { id: "evidence", icon: CalendarCheck, label: "Evidence", hint: "Your record" },
  { id: "more", icon: Archive, label: "More", hint: "Tools and research" },
] as const;

const WORK_RECORD_TYPES = ["daily_brief", "reading_record", "sourcing_experiment", "sourcing_lead", "recruiting_opportunity", "application_attempt", "interview_practice", "snapshot_judgment", "forecast", "second_order_map", "founder_evidence_review", "weekly_underwrite", "diligence_case", "diligence_stage", "coach_request", "coach_feedback", "revision_attempt", "calibration_review", "weekly_plan"];
const CAPABILITY_GROUPS: Array<{ label: string; workflows: ConversationWorkflow[] }> = [
  { label: "Today and reflection", workflows: ["reading_response", "history_update", "weekly_plan"] },
  { label: "Company judgment", workflows: ["snapshot_judgment", "forecast", "second_order_map", "founder_evidence_review", "weekly_underwrite", "diligence_case", "diligence_stage"] },
  { label: "Sourcing and recruiting", workflows: ["sourcing_experiment", "sourcing_lead", "sourcing_progress", "recruiting_opportunity", "recruiting_evidence"] },
  { label: "Improve judgment", workflows: ["coach_request", "revision_attempt", "calibration_review"] },
];
const STRUCTURED_VIEW: Record<ConversationWorkflow, LegacyView> = {
  reading_response: "brief", history_update: "history", sourcing_experiment: "source", sourcing_lead: "source", sourcing_progress: "source", recruiting_opportunity: "recruit", recruiting_evidence: "recruit", snapshot_judgment: "snapshot", forecast: "forecast", second_order_map: "map", founder_evidence_review: "founder", weekly_underwrite: "underwrite", diligence_case: "diligence", diligence_stage: "diligence", coach_request: "coach", revision_attempt: "coach", calibration_review: "calibrate", weekly_plan: "plan",
};

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: timezone }).format(new Date(`${value}T12:00:00-05:00`));
}

export function LabWorkspace({ displayName, initialView = "today" }: { displayName: string; initialView?: View }) {
  const primary = ["today", "practice", "evidence", "more"];
  const [view, setView] = useState<PrimaryDestination>(primary.includes(initialView) ? initialView as PrimaryDestination : "today");
  const [legacyView, setLegacyView] = useState<LegacyView | null>(primary.includes(initialView) ? null : initialView as LegacyView);
  const [directWorkflow, setDirectWorkflow] = useState<ConversationWorkflow | null>(null);
  const [directOpeningMessage, setDirectOpeningMessage] = useState("");
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<TodayAssignment | null>(null);
  const [epoch, setEpoch] = useState<CurriculumEpoch | null>(null);
  const [practiceDay, setPracticeDay] = useState<PracticeDay | null>(null);
  const [progress, setProgress] = useState<PracticeProgress | null>(null);
  const [learnerDate, setLearnerDate] = useState(dateInTimeZone(new Date(), DEFAULT_TIMEZONE));
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [records, setRecords] = useState<CourseRecord[]>([]);
  const [workConversations, setWorkConversations] = useState<LearningConversation[]>([]);
  const [workError, setWorkError] = useState("");
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [visualPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("coursePreview") === "1");

  async function loadRecords(practiceDayId?: string) {
    const params = new URLSearchParams({ types: WORK_RECORD_TYPES.join(","), limit: "100" });
    const response = await fetch(`/api/lab/records?${params}`, { cache: "no-store" });
    const result = await response.json() as { records?: CourseRecord[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Your evidence could not be loaded.");
    const next = result.records ?? [];
    setRecords(practiceDayId ? next.filter((record) => record.payload.practiceDayId === practiceDayId) : next);
  }

  async function loadToday() {
    setAssignmentLoading(true); setAssignmentError("");
    try {
      const [assignmentResponse, bootstrapResponse] = await Promise.all([fetch("/api/lab/assignment/today", { cache: "no-store" }), fetch("/api/lab/bootstrap", { cache: "no-store" })]);
      const assignmentResult = await assignmentResponse.json() as CourseTodayResponse;
      const bootstrapResult = await bootstrapResponse.json() as Bootstrap & { error?: string };
      if (!bootstrapResponse.ok) throw new Error(bootstrapResult.error || "The private Lab could not start.");
      setBootstrap(bootstrapResult);
      if (!assignmentResponse.ok) throw new Error(assignmentResult.error || "Today’s assignment is not available yet.");
      setLearnerDate(assignmentResult.learnerDate); setTimezone(assignmentResult.timezone);
      setEpoch(assignmentResult.epoch ?? null); setPracticeDay(assignmentResult.practiceDay ?? null); setProgress(assignmentResult.progress ?? null);
      setAssignment(assignmentResult.assignment ? { ...assignmentResult.assignment, learnerDate: assignmentResult.learnerDate, timezone: assignmentResult.timezone, profileVersion: assignmentResult.profile?.version ?? assignmentResult.assignment.profileVersion ?? "unknown", practiceMode: assignmentResult.profile?.practiceMode ?? assignmentResult.assignment.practiceMode ?? "Normal Week", events: assignmentResult.assignment.events ?? [] } : null);
      if (assignmentResult.practiceDay?.id) await loadRecords(assignmentResult.practiceDay.id);
    } catch (caught) {
      setAssignment(null); setEpoch(null); setPracticeDay(null); setProgress(null);
      setAssignmentError(caught instanceof Error && caught.message.includes("No active Lab Profile") ? "Your course schedule has not been activated on this Mac. The foundation is ready, but Day 1 remains intentionally unstarted." : caught instanceof Error ? caught.message : "Today’s assignment is not available yet.");
    } finally { setAssignmentLoading(false); }
  }

  async function loadWork() {
    setWorkError("");
    try {
      const response = await fetch("/api/lab/conversations", { cache: "no-store" });
      const result = await response.json() as { conversations?: LearningConversation[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your conversation drafts could not be loaded.");
      setWorkConversations((result.conversations ?? []).filter((item) => item.phase === "collecting" || item.phase === "review_ready"));
      await loadRecords();
    } catch (caught) { setWorkConversations([]); setWorkError(caught instanceof Error ? caught.message : "Your current work could not be loaded."); }
  }

  async function loadAssignmentHistory() {
    const response = await fetch("/api/lab/assignments/history", { cache: "no-store" });
    const result = await response.json() as { assignments?: AssignmentHistoryItem[] };
    if (response.ok) setAssignmentHistory(result.assignments ?? []);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when the local shell opens.
  useEffect(() => { const timer = window.setTimeout(() => void loadToday(), 0); return () => window.clearTimeout(timer); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh only when the learner changes destinations.
  useEffect(() => { const timer = window.setTimeout(() => { if (view === "practice" || view === "evidence") void loadWork(); if (view === "evidence") void loadAssignmentHistory(); }, 0); return () => window.clearTimeout(timer); }, [view]);

  const filteredGroups = useMemo(() => CAPABILITY_GROUPS.map((group) => ({ ...group, workflows: group.workflows.filter((workflow) => { const contract = WORKFLOW_CONTRACTS[workflow]; return `${contract.label} ${contract.description}`.toLowerCase().includes(search.trim().toLowerCase()); }) })).filter((group) => group.workflows.length), [search]);
  function navigate(destination: PrimaryDestination) { setLegacyView(null); setDirectWorkflow(null); setDirectOpeningMessage(""); setResumeConversationId(null); setView(destination); }
  function talkThrough(workflow: ConversationWorkflow, openingMessage = "") { setDirectWorkflow(workflow); setDirectOpeningMessage(openingMessage); setLegacyView(null); setView("today"); }
  function resumeConversation(id: string) { setResumeConversationId(id); setDirectWorkflow(null); setLegacyView(null); setView("today"); }

  if (legacyView) return <Suspense fallback={<div className="lab-loading" role="status">Opening advanced entry…</div>}><AdvancedFormsView displayName={displayName} initialView={legacyView} onExit={navigate} /></Suspense>;

  return <div className="lab-shell">
    <aside className="rail"><button className="brand" onClick={() => navigate("today")} aria-label="Venture Judgment Lab home"><span className="brand-mark">VJ</span><span><strong>Venture</strong><em>Judgment Lab</em></span></button><nav aria-label="Lab destinations">{PRIMARY_NAV.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => navigate(item.id)} aria-current={view === item.id ? "page" : undefined}><span className="nav-key"><Icon size={20} /></span><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>; })}</nav><div className="rail-foot"><span className="privacy-dot" /><span><strong>Private local record</strong><small>All data stays on this Mac</small></span></div></aside>
    <main className="workspace">
      <header className="topbar"><div><span className="eyebrow">{formatDate(learnerDate, timezone)}</span><h1>{view === "today" ? `Good morning, ${displayName}.` : PRIMARY_NAV.find((item) => item.id === view)?.label}</h1></div><button className="mode-chip" onClick={() => navigate("more")}><span className="mode-dot" /><span>{bootstrap?.profile?.practiceMode ?? "Local Lab"}</span><strong>{bootstrap?.counts.records ?? 0}</strong></button></header>
      {view === "today" && (directWorkflow || resumeConversationId ? <section className="view course-conversation"><button className="quiet-button back-to-route" onClick={() => { setDirectWorkflow(null); setDirectOpeningMessage(""); setResumeConversationId(null); }}>← Back to today’s route</button><Suspense fallback={<div className="lab-loading" role="status">Opening Luna…</div>}><ConversationTeacher key={resumeConversationId ?? directWorkflow ?? "luna-home"} initialWorkflow={directWorkflow ?? "snapshot_judgment"} initialConversationId={resumeConversationId} initialOpeningMessage={directOpeningMessage} directStart={Boolean(directWorkflow)} onCommitted={() => { void loadWork(); void loadToday(); }} /></Suspense></section> : <section className="view course-today"><CourseTodayView key={visualPreview ? "visual-preview" : practiceDay?.id ?? "pre-epoch"} epoch={epoch} practiceDay={practiceDay} assignment={assignment} progress={progress} records={records} loading={assignmentLoading} error={assignmentError} visualPreview={visualPreview} onRetry={loadToday} onOpenBrief={() => setLegacyView("brief")} onWorkflow={talkThrough} /></section>)}
      {view === "practice" && <><PracticeView epoch={epoch} practiceDay={practiceDay} assignment={assignment} progress={progress} />{workError && <div className="view conversation-error" role="alert"><span>{workError}</span><button onClick={() => void loadWork()}>Try again</button></div>}{workConversations.length > 0 && <section className="view compact-drafts"><span className="eyebrow">Unfinished conversations</span>{workConversations.map((item) => <button key={item.id} onClick={() => resumeConversation(item.id)}><strong>{item.title}</strong><small>{item.phase.replaceAll("_", " ")}</small></button>)}</section>}</>}
      {view === "evidence" && <><EvidenceView epoch={epoch} practiceDay={practiceDay} assignment={assignment} progress={progress} records={records} onOpenHistory={() => setLegacyView("history")} />{assignmentHistory.length > 0 && <section className="view record-delivery"><span className="eyebrow">Recent route outcomes</span>{assignmentHistory.slice(0, 4).map((item) => <article key={item.id}><time>{item.learnerDate}</time><strong>{item.evidence.title}</strong><span>{item.state.replaceAll("_", " ")} · {item.archive.status}</span></article>)}</section>}</>}
      {view === "more" && <section className="view"><div className="intro-row"><div><span className="eyebrow coral">Capabilities and escape hatches</span><h2>Everything is still here—when you need it.</h2></div><p>Talk through a capability with Luna or open its structured editor directly.</p></div><label className="capability-search">Find a capability<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Snapshot, recruiting, calibration…" /></label><div className="capability-groups">{filteredGroups.map((group) => <section key={group.label}><h3>{group.label}</h3><div>{group.workflows.map((workflow) => { const contract = WORKFLOW_CONTRACTS[workflow]; return <article key={workflow}><span className="eyebrow">{contract.operation.replaceAll("_", " ")}</span><strong>{contract.label}</strong><p>{contract.description}</p><div><button className="primary" onClick={() => talkThrough(workflow)}>Talk it through</button><button className="text-button" onClick={() => setLegacyView(STRUCTURED_VIEW[workflow])}>Open structured editor</button></div></article>; })}</div></section>)}</div><aside className="privacy-card"><strong>Private and evidence-first</strong><p>Conversation cannot bypass typed validators, publish anything, contact firms, or commit without your explicit confirmation.</p><small>{CONVERSATION_WORKFLOWS.length} approved conversational capabilities · advanced entry remains available</small></aside></section>}
    </main>
  </div>;
}
