"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { dateInTimeZone } from "./calibration";
import {
  DailyAssignmentView,
  type TodayAssignment,
  type TodayAssignmentResponse,
} from "./DailyAssignmentView";
import type { View } from "./LabWorkspace";

const LabWorkspace = lazy(() => import("./LabWorkspace").then((module) => ({ default: module.LabWorkspace })));
const DEFAULT_TIMEZONE = "America/Chicago";

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

type Bootstrap = {
  counts: { records: number; events: number; conversations: number };
  profile: { practiceMode: string } | null;
};

function formattedDate(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(`${value}T12:00:00-05:00`));
}

export function LabApp({ displayName }: { displayName: string }) {
  const [advancedView, setAdvancedView] = useState<View | null>(null);
  const [assignment, setAssignment] = useState<TodayAssignment | null>(null);
  const [learnerDate, setLearnerDate] = useState(dateInTimeZone(new Date(), DEFAULT_TIMEZONE));
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [assignmentError, setAssignmentError] = useState("");
  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);

  async function loadToday() {
    setLoading(true);
    setAssignmentError("");
    try {
      const [assignmentResponse, bootstrapResponse] = await Promise.all([
        fetch("/api/lab/assignment/today", { cache: "no-store" }),
        fetch("/api/lab/bootstrap", { cache: "no-store" }),
      ]);
      const assignmentResult = await assignmentResponse.json() as TodayAssignmentResponse & { error?: string };
      const bootstrapResult = await bootstrapResponse.json() as Bootstrap & { error?: string };
      if (!bootstrapResponse.ok) throw new Error(bootstrapResult.error || "The local Lab could not start.");
      setBootstrap(bootstrapResult);
      if (!assignmentResponse.ok) throw new Error(assignmentResult.error || "Your private assignment could not be loaded.");
      setLearnerDate(assignmentResult.learnerDate);
      setTimezone(assignmentResult.timezone);
      setAssignment(assignmentResult.assignment ? {
        ...assignmentResult.assignment,
        learnerDate: assignmentResult.learnerDate,
        timezone: assignmentResult.timezone,
        profileVersion: assignmentResult.profile?.version ?? assignmentResult.assignment.profileVersion ?? "unknown",
        practiceMode: assignmentResult.profile?.practiceMode ?? assignmentResult.assignment.practiceMode ?? "Normal Week",
        events: assignmentResult.assignment.events ?? [],
      } : null);
    } catch (error) {
      setAssignment(null);
      setAssignmentError(error instanceof Error ? error.message : "The local Lab could not start.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadToday(); }, []);

  if (advancedView) {
    return (
      <Suspense fallback={<div className="lab-loading" role="status">Opening your private workspace…</div>}>
        <LabWorkspace displayName={displayName} initialView={advancedView} />
      </Suspense>
    );
  }

  return (
    <div className="lab-shell">
      <aside className="rail">
        <div className="brand-mark"><span>VJ</span><div><strong>Venture<br />Judgment Lab</strong><small>Local private record</small></div></div>
        <nav aria-label="Lab workspaces">
          {navItems.map((item) => (
            <button className={item.id === "today" ? "active" : ""} key={item.id} onClick={() => item.id !== "today" && setAdvancedView(item.id)}>
              <span className="nav-key">{item.key}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span>
            </button>
          ))}
        </nav>
        <div className="rail-foot"><span className="privacy-dot" /><span><strong>Private local record</strong><small>Bound to this Mac</small></span></div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">{formattedDate(learnerDate, timezone)}</span><h1>Good morning, {displayName}.</h1></div>
          <button className="mode-chip" onClick={() => setAdvancedView("plan")}><span>{bootstrap?.profile?.practiceMode ?? "Local Lab"}</span><strong>{bootstrap?.counts.records ?? 0}</strong></button>
        </header>
        <section className="view today-view">
          <div className="teacher-launcher">
            <div><span className="eyebrow coral">Conversational Teacher</span><h2>Talk through today’s judgment.</h2><p>Luna asks one neutral question at a time. Nothing becomes permanent until you review and confirm it.</p></div>
            <button className="primary" onClick={() => setAdvancedView("teacher")}>Start with Luna</button>
          </div>
          <div className="hero-grid">
            <DailyAssignmentView assignment={assignment} error={assignmentError} loading={loading} variant="today" onOpenBrief={() => setAdvancedView("brief")} onRetry={() => void loadToday()} />
            <aside className="standard-card">
              <span className="eyebrow">Local record</span>
              <h3>{bootstrap?.counts.records ?? 0} immutable submissions</h3>
              <p>{bootstrap?.counts.events ?? 0} later updates and {bootstrap?.counts.conversations ?? 0} learning conversations are preserved on this Mac.</p>
              <button className="text-button" onClick={() => setAdvancedView("history")}>Open history →</button>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
