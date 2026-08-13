"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AssignmentEventView } from "./AssignmentEventView";

type RecordModel = {
  id: string;
  recordType: string;
  parentId: string | null;
  title: string;
  payload: Record<string, unknown>;
  committedAt: string;
  createdAt: string;
};

type EventModel = {
  id: string;
  recordId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  occurredAt: string;
};

type HistoryRecord = RecordModel & { childRecords: RecordModel[]; events: EventModel[] };

const filters = [
  ["all", "All records"], ["daily_brief", "Daily Briefs"], ["sourcing_experiment", "Sourcing Experiments"],
  ["sourcing_lead", "Sourcing Leads"], ["recruiting_opportunity", "Recruiting Opportunities"],
  ["opportunity_observation", "Opportunity Observations"], ["opportunity_monitor_run", "Opportunity Monitor Runs"],
  ["recruiting_interaction", "Recruiting Interactions"], ["application_attempt", "Application Attempts"],
  ["interview_practice", "Interview Practice"], ["portfolio_candidate", "Portfolio Candidates"],
  ["snapshot_judgment", "Snapshots"], ["forecast", "Forecasts"], ["second_order_map", "Second-Order Maps"],
  ["founder_evidence_review", "Founder Evidence Reviews"], ["weekly_underwrite", "Underwrites"],
  ["diligence_case", "Diligence Cases"], ["diligence_stage", "Diligence Stages"],
  ["coach_request", "Coach Requests"], ["coach_feedback", "Coach Feedback"],
  ["revision_attempt", "Revision Attempts"], ["mastery_evidence", "Mastery Evidence"],
  ["calibration_review", "Calibration Reviews"], ["weekly_plan", "Practice plans"],
] as const;

const protectedUpdateTypes = new Set(["founder_evidence_review", "diligence_case", "diligence_stage", "coach_request", "coach_feedback", "revision_attempt", "mastery_evidence"]);
const typedOnlyTypes = new Set(["sourcing_lead", "recruiting_opportunity", "opportunity_observation", "recruiting_interaction", "application_attempt", "interview_practice", "portfolio_candidate"]);

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function recordLabel(value: string): string {
  return value.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function visibleEvidence(payload: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(payload).flatMap(([key, value]) => {
    if (value === null || value === undefined || value === "") return [];
    const rendered = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    return [[recordLabel(key), rendered.length > 2_000 ? `${rendered.slice(0, 2_000)}…` : rendered] as [string, string]];
  }).slice(0, 8);
}

export function HistoryView() {
  const [filter, setFilter] = useState("all");
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [eventType, setEventType] = useState("reflection");
  const [text, setText] = useState("");
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => records.find((record) => record.id === selectedId), [records, selectedId]);

  async function loadPage(cursor: string | null, append: boolean) {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "25" });
      if (filter !== "all") params.set("type", filter);
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/lab/history?${params}`, { cache: "no-store" });
      const result = await response.json() as { records?: HistoryRecord[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Your private history could not be loaded.");
      setRecords((current) => append ? [...current, ...(result.records ?? [])] : result.records ?? []);
      setNextCursor(result.nextCursor ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your private history could not be loaded.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { void loadPage(null, false); }, [filter]);

  async function appendUpdate(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "append_event",
          recordId: selected.id,
          eventType,
          eventData: {
            text,
            ...(protectedUpdateTypes.has(selected.recordType) ? { originalPreserved: true, privateEvidenceConfirmed: privacyConfirmed } : {}),
          },
        }),
      });
      const result = await response.json() as { event?: EventModel; error?: string };
      if (!response.ok || !result.event) throw new Error(result.error || "The later evidence could not be preserved.");
      setRecords((current) => current.map((record) => record.id === selected.id
        ? { ...record, events: [...record.events, result.event!] }
        : record));
      setText("");
      setPrivacyConfirmed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The later evidence could not be preserved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="history-tools"><label>Show<select value={filter} onChange={(event) => { setFilter(event.target.value); setSelectedId(""); }}>{filters.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><span>{records.length}{nextCursor ? "+" : ""} immutable submission{records.length === 1 && !nextCursor ? "" : "s"}</span></div>
      {error && <div className="notice" role="alert">{error}</div>}
      <div className="history-layout">
        <div className="timeline">
          {loading && <div className="empty-history"><p>Opening your private record…</p></div>}
          {!loading && records.length === 0 && <div className="empty-history"><p>No committed work yet.</p><span>Your first submission will appear here with its original timestamp.</span></div>}
          {records.map((record) => (
            <article className="timeline-record" key={record.id}>
              <span className="timeline-dot" />
              <div className="record-head"><span>{recordLabel(record.recordType)}</span><time>{formatTime(record.committedAt)}</time></div>
              <h3>{record.title}</h3>
              {visibleEvidence(record.payload).length > 0 && <details className="evidence-details"><summary>Inspect committed evidence</summary>{visibleEvidence(record.payload).map(([label, value]) => <div key={label}><strong>{label}</strong><p>{value}</p></div>)}</details>}
              {record.childRecords.length > 0 && <div className="reading-archive">{record.childRecords.map((child) => {
                const url = typeof child.payload.canonicalUrl === "string" ? child.payload.canonicalUrl : "";
                const lane = typeof child.payload.lane === "string" ? child.payload.lane : recordLabel(child.recordType);
                return <a key={child.id} href={url || undefined} target={url ? "_blank" : undefined} rel={url ? "noreferrer" : undefined}><span>{lane}</span><strong>{child.title}</strong><small>{record.events.some((item) => item.recordId === child.id && item.eventType === "learner_response") ? "Independent First Pass preserved" : "Awaiting Independent First Pass"}</small></a>;
              })}</div>}
              {record.events.map((item) => <AssignmentEventView event={item} formatTimestamp={formatTime} key={item.id} />)}
            </article>
          ))}
          {nextCursor && <button className="secondary" disabled={loadingMore} onClick={() => void loadPage(nextCursor, true)}>{loadingMore ? "Loading…" : "Load 25 older records"}</button>}
        </div>
        <aside className="append-card"><span className="eyebrow coral">Append, never overwrite</span><h3>Add later evidence</h3><p>Load older pages when the original record is not yet listed. Typed Sourcing and Recruiting changes remain in their dedicated workspaces.</p><form onSubmit={appendUpdate}><label>Original record<select required value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setPrivacyConfirmed(false); }}><option value="">Choose a loaded record…</option>{records.filter((record) => !typedOnlyTypes.has(record.recordType)).map((record) => <option key={record.id} value={record.id}>{recordLabel(record.recordType)} · {record.title}</option>)}</select></label><label>Update type<select value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="reflection">Reflection</option><option value="later_usefulness">Later usefulness</option><option value="source_status">Source status</option><option value="metadata_correction">Metadata correction</option></select></label><label>Dated update<textarea required rows={5} value={text} onChange={(event) => setText(event.target.value)} placeholder="State the new evidence, source, outcome, or correction. Do not restate history as if you knew it earlier." /></label>{selected && protectedUpdateTypes.has(selected.recordType) && <label className="privacy-confirmation"><input required type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} />I confirm this update preserves the original and contains only bounded, approved evidence.</label>}<button className="primary" disabled={saving}>{saving ? "Appending…" : "Append update"}</button></form></aside>
      </div>
    </>
  );
}
