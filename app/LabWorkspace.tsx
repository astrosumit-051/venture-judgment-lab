"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { dateInTimeZone } from "./calibration";
import { DailyAssignmentView, type TodayAssignment, type TodayAssignmentResponse } from "./DailyAssignmentView";
import type { ConversationWorkflow } from "./conversation";

const AdvancedFormsView = lazy(() => import("./AdvancedFormsView").then((module) => ({ default: module.AdvancedFormsView })));
const TeacherSurface = lazy(() => import("./TeacherSurface").then((module) => ({ default: module.ConversationTeacherSurface })));
const TeacherEntrySurface = lazy(() => import("./TeacherEntrySurface").then((module) => ({ default: module.TeacherEntrySurface })));
const TeacherLauncherSurface = lazy(() => import("./TeacherEntrySurface").then((module) => ({ default: module.TeacherLauncherSurface })));
const SourcingView = lazy(() => import("./SourcingView").then((module) => ({ default: module.SourcingView })));
const RecruitingView = lazy(() => import("./RecruitingView").then((module) => ({ default: module.RecruitingView })));
const DiligenceView = lazy(() => import("./DiligenceView").then((module) => ({ default: module.DiligenceView })));
const CoachView = lazy(() => import("./CoachView").then((module) => ({ default: module.CoachView })));
const HistoryView = lazy(() => import("./HistoryView").then((module) => ({ default: module.HistoryView })));

export type View = "today" | "teacher" | "brief" | "source" | "recruit" | "snapshot" | "forecast" | "map" | "founder" | "underwrite" | "diligence" | "coach" | "calibrate" | "plan" | "history";

type LabRecord = { id: string; recordType: string; parentId: string | null; title: string; payload: Record<string, unknown>; committedAt: string; createdAt: string };
type LabEvent = { id: string; recordId: string; eventType: string; eventData: Record<string, unknown>; occurredAt: string; createdAt: string };
type LabData = { records: LabRecord[]; events: LabEvent[]; nextCursor?: string | null };
type AssignmentHistoryItem = {
  id: string; learnerDate: string; state: string; createdAt: string;
  evidence: { id: string; title: string };
  profile: { version: string; timezone: string; practiceMode: string };
  run: { id: string; scheduledFor: string; notificationIntent: string; evidenceRecordId: string };
  archive: { status: "preserved" | "pending"; preservedAt: string | null };
};

const DEFAULT_TIMEZONE = "America/Chicago";
const advancedFormViews = new Set<View>(["snapshot", "forecast", "map", "founder", "underwrite", "calibrate", "plan"]);
const navItems: Array<{ id: View; key: string; label: string; hint: string }> = [
  { id: "today", key: "T", label: "Today", hint: "The next judgment" }, { id: "teacher", key: "AI", label: "Teacher", hint: "Talk, then preserve" },
  { id: "brief", key: "B", label: "Brief", hint: "Four real readings" }, { id: "source", key: "D", label: "Sourcing", hint: "Discover companies early" },
  { id: "recruit", key: "R", label: "Recruit", hint: "Count real outcomes" }, { id: "snapshot", key: "S", label: "Snapshot", hint: "Lock the first pass" },
  { id: "forecast", key: "F", label: "Forecast", hint: "Put odds on it" }, { id: "map", key: "M", label: "2nd Order", hint: "Trace consequences" },
  { id: "founder", key: "E", label: "Founder", hint: "Observe behavior" }, { id: "underwrite", key: "U", label: "Underwrite", hint: "Test the crux" },
  { id: "diligence", key: "L", label: "Diligence", hint: "Earn and defend the memo" }, { id: "coach", key: "J", label: "Coach", hint: "Diagnose after commitment" },
  { id: "calibrate", key: "C", label: "Calibrate", hint: "Score prior judgment" }, { id: "plan", key: "P", label: "Practice", hint: "Choose the week mode" },
  { id: "history", key: "H", label: "History", hint: "Nothing rewritten" },
];
const viewWorkflows: Partial<Record<View, ConversationWorkflow>> = { source: "sourcing_lead", recruit: "recruiting_opportunity", diligence: "diligence_stage", coach: "coach_request" };
const viewRecordTypes: Partial<Record<View, string[]>> = {
  source: ["sourcing_experiment", "sourcing_lead", "snapshot_judgment", "weekly_underwrite"],
  recruit: ["recruiting_opportunity", "opportunity_observation", "opportunity_monitor_run", "opportunity_monitor_registration", "recruiting_interaction", "application_attempt", "interview_practice", "portfolio_candidate", "snapshot_judgment", "weekly_underwrite", "forecast", "second_order_map", "founder_evidence_review", "diligence_stage"],
  diligence: ["snapshot_judgment", "weekly_underwrite", "diligence_case", "diligence_stage"],
  coach: ["snapshot_judgment", "weekly_underwrite", "forecast", "second_order_map", "founder_evidence_review", "diligence_stage", "coach_request", "coach_feedback", "revision_attempt", "mastery_evidence"],
};

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: timezone }).format(new Date(`${value}T12:00:00-05:00`));
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function LabWorkspace({ displayName, initialView = "today" }: { displayName: string; initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [teacherWorkflow, setTeacherWorkflow] = useState<ConversationWorkflow>("snapshot_judgment");
  const [advancedEntryVisible, setAdvancedEntryVisible] = useState(false);
  const [data, setData] = useState<LabData>({ records: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [assignment, setAssignment] = useState<TodayAssignment | null>(null);
  const [learnerDate, setLearnerDate] = useState(dateInTimeZone(new Date(), DEFAULT_TIMEZONE));
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryItem[]>([]);
  const [assignmentHistoryError, setAssignmentHistoryError] = useState("");
  const viewCache = useRef(new Map<string, LabData>());

  async function loadRecords(targetView: View) {
    const types = viewRecordTypes[targetView] ?? [];
    if (!types.length) { setData({ records: [], events: [] }); setLoading(false); return; }
    const key = types.join(",");
    const cached = viewCache.current.get(key);
    if (cached) { setData(cached); setLoading(false); return; }
    setLoading(true);
    try {
      const loaded: LabData = { records: [], events: [] };
      let cursor: string | null = null;
      do {
        const params = new URLSearchParams({ types: key, limit: "200", includeEvents: "1" });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/lab/records?${params}`, { cache: "no-store" });
        const result = await response.json() as LabData & { error?: string };
        if (!response.ok) throw new Error(result.error || "Your private record could not be loaded.");
        loaded.records.push(...(result.records ?? [])); loaded.events.push(...(result.events ?? [])); cursor = result.nextCursor ?? null;
      } while (cursor);
      viewCache.current.set(key, loaded); setData(loaded);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Your private record could not be loaded."); }
    finally { setLoading(false); }
  }

  async function loadAssignment() {
    setAssignmentError("");
    try {
      const response = await fetch("/api/lab/assignment/today", { cache: "no-store" });
      const result = await response.json() as TodayAssignmentResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Your private assignment could not be loaded.");
      setLearnerDate(result.learnerDate); setTimezone(result.timezone);
      setAssignment(result.assignment ? { ...result.assignment, learnerDate: result.learnerDate, timezone: result.timezone, profileVersion: result.profile?.version ?? result.assignment.profileVersion ?? "unknown", practiceMode: result.profile?.practiceMode ?? result.assignment.practiceMode ?? "Normal Week", events: result.assignment.events ?? [] } : null);
    } catch (error) { setAssignment(null); setAssignmentError(error instanceof Error ? error.message : "Your private assignment could not be loaded."); }
  }

  async function loadAssignmentHistory() {
    try {
      const response = await fetch("/api/lab/assignments/history", { cache: "no-store" });
      const result = await response.json() as { assignments?: AssignmentHistoryItem[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Assignment history could not be loaded.");
      setAssignmentHistory(result.assignments ?? []); setAssignmentHistoryError("");
    } catch (error) { setAssignmentHistory([]); setAssignmentHistoryError(error instanceof Error ? error.message : "Assignment history could not be loaded."); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRecords(view); if (view === "today" || view === "brief") void loadAssignment(); if (view === "history") void loadAssignmentHistory(); }, 0);
    return () => window.clearTimeout(timer);
  }, [view]);

  async function post(body: Record<string, unknown>) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; record?: LabRecord; event?: LabEvent };
      if (!response.ok) throw new Error(result.error || "The record could not be preserved.");
      viewCache.current.clear();
      if (result.record) setData((current) => ({ ...current, records: [result.record!, ...current.records.filter((record) => record.id !== result.record!.id)] }));
      if (result.event) setData((current) => ({ ...current, events: [...current.events.filter((event) => event.id !== result.event!.id), result.event!] }));
      setNotice("Preserved in your private, append-only record."); return true;
    } catch (error) { setNotice(error instanceof Error ? error.message : "The record could not be preserved."); return false; }
    finally { setBusy(false); }
  }

  async function appendAssignmentEvent(recordId: string, eventType: string, eventData: Record<string, unknown>) {
    const saved = await post({ operation: "append_event", recordId, eventType, eventData });
    if (saved) {
      await loadAssignment();
      setNotice(eventType === "completion"
        ? "Today’s Brief is complete. The original assignment and every response remain preserved."
        : "Independent First Pass preserved beside the original reading.");
    }
    return saved;
  }

  function navigate(nextView: View) { setAdvancedEntryVisible(false); setView(nextView); }
  function openTeacher(workflow?: ConversationWorkflow) { if (workflow) setTeacherWorkflow(workflow); setView("teacher"); }
  if (advancedFormViews.has(view)) return <Suspense fallback={<div className="lab-loading" role="status">Opening advanced judgment workspace…</div>}><AdvancedFormsView displayName={displayName} initialView={view} /></Suspense>;
  const entryWorkflow = viewWorkflows[view];

  return <div className="lab-shell">
    <aside className="rail"><button className="brand" onClick={() => navigate("today")} aria-label="Venture Judgment Lab home"><span className="brand-mark">VJ</span><span><strong>Venture</strong><em>Judgment Lab</em></span></button><nav aria-label="Lab workspaces">{navItems.map((item) => <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => navigate(item.id)}><span className="nav-key">{item.key}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>)}</nav><div className="rail-foot"><span className="privacy-dot" /><span><strong>Private local record</strong><small>Bound to this Mac</small></span></div></aside>
    <main className="workspace"><header className="topbar"><div><span className="eyebrow">{formatDate(learnerDate, timezone)}</span><h1>{view === "today" ? `Good morning, ${displayName}.` : navItems.find((item) => item.id === view)?.label}</h1></div><span className="mode-chip">Local Lab</span></header>
      {notice ? <div className="notice" role="status">{notice}</div> : null}
      {entryWorkflow ? <Suspense fallback={null}><TeacherEntrySurface workflow={entryWorkflow} advancedVisible={advancedEntryVisible} onOpen={() => openTeacher(entryWorkflow)} onToggleAdvanced={() => setAdvancedEntryVisible((current) => !current)} /></Suspense> : null}
      {view === "today" ? <section className="view today-view"><Suspense fallback={<div className="teacher-launcher"><p>Opening Teacher…</p></div>}><TeacherLauncherSurface onOpen={openTeacher} /></Suspense><DailyAssignmentView assignment={assignment} error={assignmentError} loading={loading} variant="today" onOpenBrief={() => navigate("brief")} onRetry={() => void loadAssignment()} /></section> : null}
      {view === "teacher" ? <section className="view"><Suspense fallback={<div className="lab-loading" role="status">Opening Teacher…</div>}><TeacherSurface key={teacherWorkflow} initialWorkflow={teacherWorkflow} onCommitted={() => loadRecords(view)} /></Suspense></section> : null}
      {view === "brief" ? <section className="view"><DailyAssignmentView assignment={assignment} error={assignmentError} loading={loading} variant="brief" onOpenBrief={() => undefined} onRetry={() => void loadAssignment()} onAppendEvent={appendAssignmentEvent} /></section> : null}
      {view === "source" && advancedEntryVisible ? <Suspense fallback={<div className="lab-loading">Opening Sourcing…</div>}><SourcingView records={data.records} events={data.events} timezone={timezone} busy={busy} post={post} announce={setNotice} /></Suspense> : null}
      {view === "recruit" && advancedEntryVisible ? <Suspense fallback={<div className="lab-loading">Opening Recruiting…</div>}><RecruitingView records={data.records} timezone={timezone} busy={busy} post={post} announce={setNotice} /></Suspense> : null}
      {view === "diligence" && advancedEntryVisible ? <Suspense fallback={<div className="lab-loading">Opening Diligence…</div>}><DiligenceView records={data.records} timezone={timezone} busy={busy} post={post} announce={setNotice} /></Suspense> : null}
      {view === "coach" && advancedEntryVisible ? <Suspense fallback={<div className="lab-loading">Opening Coach…</div>}><CoachView records={data.records} timezone={timezone} busy={busy} post={post} announce={setNotice} /></Suspense> : null}
      {entryWorkflow && !advancedEntryVisible ? <section className="view"><div className="empty-state"><span>AI</span><h3>Start with your own reasoning.</h3><p>The advanced structured form stays unloaded until you choose it.</p><button className="primary" onClick={() => openTeacher(entryWorkflow)}>Talk to Teacher</button></div></section> : null}
      {view === "history" ? <section className="view"><div className="intro-row"><div><span className="eyebrow coral">Private Learning Record</span><h2>Originals stay. Updates accumulate.</h2></div><p>Later evidence appends; nothing rewrites the original.</p></div><section className="delivery-ledger" aria-labelledby="daily-delivery-ledger-title"><div className="delivery-ledger-head"><div><span className="eyebrow">Daily delivery ledger</span><h3 id="daily-delivery-ledger-title">Assignment, operator, and archive evidence</h3></div><p>{assignmentHistory.length} preserved outcomes</p></div>{assignmentHistoryError ? <p role="alert">{assignmentHistoryError}</p> : null}<div className="delivery-ledger-list">{assignmentHistory.map((item) => <article className="delivery-ledger-row" key={item.id}><div><time>{item.learnerDate}</time><strong>{item.evidence.title}</strong><span>{item.state.replaceAll("_", " ")} · {item.profile.practiceMode}</span></div><div><span>Operator slot {formatTime(item.run.scheduledFor)}</span><strong>{item.archive.status === "preserved" ? "Archive preserved" : "Archive pending"}</strong></div></article>)}</div></section><Suspense fallback={<div className="lab-loading">Opening History…</div>}><HistoryView /></Suspense></section> : null}
    </main>
  </div>;
}
