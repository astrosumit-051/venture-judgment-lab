"use client";

import { FormEvent, useState } from "react";
import { AssignmentEventView } from "./AssignmentEventView";

export type AssignmentState =
  | "ready"
  | "brief_unavailable"
  | "intentionally_displaced"
  | "missed"
  | "completed";

export type AssignmentEvent = {
  id: string;
  recordId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  occurredAt: string;
};

export type AssignmentReading = {
  id?: string;
  recordId?: string;
  readingId?: string;
  lane: string;
  title: string;
  subtitle?: string;
  authorOrOrganization: string;
  publisher: string;
  sourceType: string;
  sourceRole: string;
  claimRole: string;
  issuerInterest: string;
  canonicalUrl: string;
  persistentIdentifier: string;
  publishedDate: string;
  sourceUpdatedDate: string;
  accessedAt: string;
  linkVerifiedAt?: string;
  estimatedMinutes: number;
  assignedSection: string;
  rightsOrLicense: string;
  accessMode: string;
  materialReviewed: string;
  archiveUrl: string;
  archivedAt?: string;
  sourceStatus: string;
  teachingPurpose: string;
  carryQuestion: string;
  downstreamTarget: string;
  selectionRationale: string;
  corroborationNotes: string;
  versionStatus: string;
  sectorContext?: string;
  viewpoint?: string;
  viewpointRole: string;
  underlyingEventOrClaimFingerprint: string;
  corroborationSourceRole: string;
  corroborationUrl: string;
  sourceReview?: string;
  contextReview?: string;
  claimReview?: string;
  evidenceReview?: string;
  corroborationReview?: string;
  deduplicationStatus?: string;
  relatedReadingId?: string;
  freshnessException?: string;
  labSummary: string;
};

export type TodayAssignment = {
  id: string;
  state: AssignmentState;
  learnerDate: string;
  timezone: string;
  profileVersion: string;
  practiceMode: string;
  committedAt?: string;
  reason?: string;
  nextAction?: string;
  brief?: {
    id: string;
    version?: string;
    totalMinutes: number;
    carryForward?: string;
    readings: AssignmentReading[];
  };
  events: AssignmentEvent[];
};

export type TodayAssignmentResponse = {
  learnerDate: string;
  timezone: string;
  profile?: { version: string; practiceMode: string };
  assignment: (Omit<TodayAssignment, "learnerDate" | "timezone" | "profileVersion" | "practiceMode"> & Partial<Pick<TodayAssignment, "learnerDate" | "timezone" | "profileVersion" | "practiceMode">>) | null;
};

type Props = {
  assignment: TodayAssignment | null;
  error: string;
  loading: boolean;
  variant: "today" | "brief";
  onOpenBrief?: () => void;
  onRetry?: () => void;
  onAppendEvent?: (recordId: string, eventType: string, eventData: Record<string, unknown>) => Promise<boolean>;
};

function formatDate(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function effectiveState(assignment: TodayAssignment): AssignmentState {
  if (assignment.state === "completed" || assignment.events.some((event) => (
    event.eventType === "completion" || event.eventType === "assignment_completed"
  ))) return "completed";
  if (assignment.state === "missed" || assignment.events.some((event) => event.eventType === "missed_practice")) return "missed";
  return assignment.state;
}

function AssignmentBoundary({ assignment, state }: { assignment: TodayAssignment; state: AssignmentState }) {
  const content = {
    brief_unavailable: {
      code: "UNAVAILABLE",
      title: "Today’s Brief is unavailable",
      copy: assignment.reason || "The operator could not preserve a complete four-lane Brief. No earlier Brief has been substituted.",
    },
    intentionally_displaced: {
      code: "DISPLACED",
      title: "Practice intentionally displaced",
      copy: assignment.reason || "Your active practice mode does not require a standalone Brief today. Nothing rolls forward as catch-up debt.",
    },
    missed: {
      code: "MISSED",
      title: "Today’s practice was missed",
      copy: assignment.reason || "The learner date ended without a completion event. The original assignment remains preserved and creates no catch-up debt.",
    },
    completed: {
      code: "COMPLETE",
      title: "Today’s Brief is complete",
      copy: "The original assignment and your dated responses remain in the Private Learning Record.",
    },
    ready: {
      code: "READY",
      title: "Today’s Brief is ready",
      copy: "Four sources passed the pre-publication gate and are preserved as today’s immutable assignment.",
    },
  }[state];

  return (
    <article className={`assignment-state assignment-state-${state}`} aria-live="polite">
      <span>{content.code}</span>
      <div>
        <p className="eyebrow">{formatDate(assignment.learnerDate, assignment.timezone)} · {assignment.practiceMode}</p>
        <h2>{content.title}</h2>
        <p>{content.copy}</p>
        {assignment.nextAction && <p className="assignment-next"><strong>Next action</strong>{assignment.nextAction}</p>}
      </div>
    </article>
  );
}

function ReadingCard({ reading, index, events, onAppendEvent }: {
  reading: AssignmentReading;
  index: number;
  events: AssignmentEvent[];
  onAppendEvent?: Props["onAppendEvent"];
}) {
  const identity = reading.recordId || reading.id || reading.readingId;
  const overlays = events.filter((event) => event.recordId === identity);
  const hasResponse = overlays.some((event) => event.eventType === "learner_response");
  const [response, setResponse] = useState({ independentFirstPass: "", takeaway: "", uncertainty: "" });
  const [saving, setSaving] = useState(false);

  async function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity || !onAppendEvent) return;
    setSaving(true);
    try {
      const saved = await onAppendEvent(identity, "learner_response", {
        ...response,
        originalPreserved: true,
        privateEvidenceConfirmed: true,
      });
      if (saved) setResponse({ independentFirstPass: "", takeaway: "", uncertainty: "" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="reading-card assignment-reading">
      <div className="reading-order">{String(index + 1).padStart(2, "0")}</div>
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
        <details className="assignment-metadata">
          <summary>Original assignment metadata</summary>
          <dl>
            <div><dt>Source type</dt><dd>{reading.sourceType}</dd></div>
            <div><dt>Claim role</dt><dd>{reading.claimRole}</dd></div>
            <div><dt>Issuer interest</dt><dd>{reading.issuerInterest}</dd></div>
            <div><dt>Persistent identifier</dt><dd>{reading.persistentIdentifier}</dd></div>
            <div><dt>Source updated</dt><dd>{reading.sourceUpdatedDate}</dd></div>
            <div><dt>Accessed</dt><dd>{reading.accessedAt}</dd></div>
            <div><dt>Link verified</dt><dd>{reading.linkVerifiedAt || "not stated"}</dd></div>
            <div><dt>Rights or license</dt><dd>{reading.rightsOrLicense}</dd></div>
            <div><dt>Archive</dt><dd>{reading.archiveUrl}</dd></div>
            <div><dt>Archived at</dt><dd>{reading.archivedAt || "not stated"}</dd></div>
            <div><dt>Original source status</dt><dd>{reading.sourceStatus}</dd></div>
            <div><dt>Version status</dt><dd>{reading.versionStatus}</dd></div>
            <div><dt>Downstream target</dt><dd>{reading.downstreamTarget}</dd></div>
            <div><dt>Selection rationale</dt><dd>{reading.selectionRationale}</dd></div>
            <div><dt>Corroboration</dt><dd>{reading.corroborationNotes}</dd></div>
            <div><dt>Sector context</dt><dd>{reading.sectorContext || "not stated"}</dd></div>
            <div><dt>Viewpoint</dt><dd>{reading.viewpoint || "not stated"}</dd></div>
            <div><dt>Viewpoint role</dt><dd>{reading.viewpointRole}</dd></div>
            <div><dt>Event or claim identity</dt><dd>{reading.underlyingEventOrClaimFingerprint}</dd></div>
            <div><dt>Corroboration source role</dt><dd>{reading.corroborationSourceRole}</dd></div>
            <div><dt>Evidence reviews</dt><dd>{[reading.sourceReview, reading.contextReview, reading.claimReview, reading.evidenceReview, reading.corroborationReview].filter(Boolean).join(" · ") || "not stated"}</dd></div>
            <div><dt>Prior-use status</dt><dd>{reading.deduplicationStatus || "not stated"}{reading.relatedReadingId ? ` · ${reading.relatedReadingId}` : ""}</dd></div>
            {reading.freshnessException && <div><dt>Freshness exception</dt><dd>{reading.freshnessException}</dd></div>}
          </dl>
        </details>
        {overlays.length > 0 && <div className="assignment-overlays" aria-label={`Dated updates for ${reading.title}`}>{overlays.map((event) => <AssignmentEventView event={event} formatTimestamp={formatTimestamp} key={event.id} />)}</div>}
        {!hasResponse && identity && onAppendEvent && (
          <form className="reading-response" onSubmit={submitResponse}>
            <strong>Commit your Independent First Pass</strong>
            <p>Answer before Coach interpretation. This appends beside the source and never changes its original assignment.</p>
            <label>What do you think?<textarea required rows={4} value={response.independentFirstPass} onChange={(event) => setResponse((current) => ({ ...current, independentFirstPass: event.target.value }))} /></label>
            <label>What is the decision-useful takeaway?<textarea required rows={2} value={response.takeaway} onChange={(event) => setResponse((current) => ({ ...current, takeaway: event.target.value }))} /></label>
            <label>What remains uncertain?<textarea required rows={2} value={response.uncertainty} onChange={(event) => setResponse((current) => ({ ...current, uncertainty: event.target.value }))} /></label>
            <button className="primary" disabled={saving}>{saving ? "Preserving…" : "Preserve first pass"}</button>
          </form>
        )}
      </div>
    </article>
  );
}

export function DailyAssignmentView({ assignment, error, loading, variant, onOpenBrief, onRetry, onAppendEvent }: Props) {
  if (loading) return <div className="assignment-loading" role="status"><span className="eyebrow">Private Learning Record</span><p>Opening today’s private assignment…</p></div>;
  if (error) return <div className="assignment-error" role="alert"><span className="eyebrow coral">Delivery boundary</span><h2>Today’s assignment could not be loaded</h2><p>{error}</p><p>Private operator registration is completed outside this browser.</p><div className="assignment-actions">{onRetry && <button className="primary" onClick={onRetry}>Try again</button>}</div></div>;
  if (!assignment) return <div className="assignment-error" role="status"><span className="eyebrow coral">No accepted outcome</span><h2>No assignment is preserved for today</h2><p>The Lab will not substitute a compile-time or earlier Brief. Private delivery is unregistered or has not yet preserved an outcome; registration is completed outside this browser.</p><div className="assignment-actions">{onRetry && <button className="primary" onClick={onRetry}>Check again</button>}</div></div>;

  const state = effectiveState(assignment);
  const readyWithBrief = Boolean(assignment.brief && (state === "ready" || state === "completed" || state === "missed"));

  if (variant === "today") return (
    <div className="today-assignment">
      <AssignmentBoundary assignment={assignment} state={state} />
      {readyWithBrief && onOpenBrief && <button className="primary assignment-open" onClick={onOpenBrief}>{state === "ready" ? "Begin with four readings" : "Review original assignment"} <span>→</span></button>}
    </div>
  );

  const readingRecordIds = new Set(assignment.brief?.readings.map((reading) => reading.recordId || reading.id || reading.readingId).filter(Boolean));
  const assignmentEvents = assignment.events.filter((event) => !readingRecordIds.has(event.recordId));
  const respondedReadingIds = new Set(assignment.events
    .filter((event) => event.eventType === "learner_response" && readingRecordIds.has(event.recordId))
    .map((event) => event.recordId));
  const responseCount = respondedReadingIds.size;
  const canComplete = readingRecordIds.size === 4 && responseCount === 4;

  return (
    <div className="brief-assignment">
      <AssignmentBoundary assignment={assignment} state={state} />
      {readyWithBrief && assignment.brief && <>
        <div className="intro-row assignment-intro"><div><span className="eyebrow coral">Daily Brief · {assignment.brief.totalMinutes} minutes</span><h2>Four sources. Four different jobs.</h2></div><p>The original evidence remains fixed. Dated responses, source changes, corrections, and replacements accumulate below it.</p></div>
        <div className="reading-list">{assignment.brief.readings.map((reading, index) => <ReadingCard reading={reading} index={index} events={assignment.events} onAppendEvent={onAppendEvent} key={reading.recordId || reading.id || reading.readingId || `${reading.lane}-${index}`} />)}</div>
        {assignmentEvents.length > 0 && <div className="assignment-overlays assignment-level-overlays">{assignmentEvents.map((event) => <AssignmentEventView event={event} formatTimestamp={formatTimestamp} key={event.id} />)}</div>}
        {state === "ready" && onAppendEvent && (
          <div className={canComplete ? "assignment-completion-gate ready" : "assignment-completion-gate"} role="status" aria-live="polite">
            <div>
              <strong>{responseCount} of 4 Independent First Passes preserved</strong>
              <p>{canComplete
                ? "All four reading responses are preserved. You can now complete today’s Brief."
                : "Respond to every current reading before completing today’s Brief. A response to one source cannot stand in for another."}</p>
            </div>
            <button className="primary assignment-complete" disabled={!canComplete} onClick={() => {
              if (!canComplete) return;
              void onAppendEvent(assignment.brief!.id, "completion", {
                completedLearnerDate: assignment.learnerDate,
                originalPreserved: true,
              });
            }}>Mark today’s Brief complete</button>
          </div>
        )}
      </>}
    </div>
  );
}
