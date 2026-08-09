"use client";

import { FormEvent, useMemo, useState } from "react";
import { dateInTimeZone } from "./calibration";
import {
  COACH_DIMENSIONS,
  eligibleCoachDimensions,
  type CoachDimension,
  type CoachRecordLike,
} from "./coach";

type CoachViewProps = {
  records: CoachRecordLike[];
  timezone: string;
  busy: boolean;
  post: (body: Record<string, unknown>) => Promise<boolean>;
  announce: (message: string) => void;
};

const dimensionLabels: Record<CoachDimension, string> = {
  sourcing: "Sourcing",
  diligence: "Diligence",
  forecasting: "Forecasting",
  founder_judgment: "Founder judgment",
  communication: "Communication",
};

const difficultyLabels: Record<string, string> = {
  repeat_same_scope: "Repeat at the same scope",
  narrow_to_foundation: "Narrow to the foundational claim",
  require_disconfirming_evidence: "Require disconfirming evidence",
  transfer_across_company: "Transfer across a different company",
  increase_ambiguity: "Increase ambiguity",
  timed_defense: "Defend under time pressure",
  advance_independently: "Advance independently",
};

function text(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === "string" ? payload[key] : "";
}

function emptyRevision() {
  return {
    revisedJudgment: "",
    evidenceAdded: "",
    responseToUnsupportedInference: "",
    disconfirmingCase: "",
    decisionDelta: "",
    genuineRevisionConfirmed: false,
    privacyConfirmed: false,
  };
}

export function CoachView({ records, timezone, busy, post, announce }: CoachViewProps) {
  const [sourceId, setSourceId] = useState("");
  const [dimension, setDimension] = useState<CoachDimension | "">("");
  const [focusQuestion, setFocusQuestion] = useState("");
  const [learnerSelfDiagnosis, setLearnerSelfDiagnosis] = useState("");
  const [requestPrivacyConfirmed, setRequestPrivacyConfirmed] = useState(false);
  const [revisionFeedbackId, setRevisionFeedbackId] = useState("");
  const [revision, setRevision] = useState(emptyRevision);

  const requests = useMemo(() => records.filter((record) => record.recordType === "coach_request"), [records]);
  const feedback = useMemo(() => records.filter((record) => record.recordType === "coach_feedback"), [records]);
  const revisions = useMemo(() => records.filter((record) => record.recordType === "revision_attempt"), [records]);
  const mastery = useMemo(() => records.filter((record) => record.recordType === "mastery_evidence"), [records]);
  const sources = useMemo(() => records.filter((record) => (
    eligibleCoachDimensions(record.recordType).length > 0
    && eligibleCoachDimensions(record.recordType).some((candidate) => !requests.some((request) => (
      request.parentId === record.id && text(request.payload, "dimension") === candidate
    )))
  )), [records, requests]);
  const selectedSource = sources.find((record) => record.id === sourceId);
  const availableDimensions = selectedSource ? eligibleCoachDimensions(selectedSource.recordType).filter((candidate) => (
    !requests.some((request) => request.parentId === selectedSource.id && text(request.payload, "dimension") === candidate)
  )) : [];
  const feedbackAwaitingRevision = feedback.filter((item) => !revisions.some((attempt) => attempt.parentId === item.id));
  const selectedFeedback = feedbackAwaitingRevision.find((item) => item.id === revisionFeedbackId);

  async function commitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSource || !dimension) {
      announce("Choose committed original work and one eligible coaching dimension.");
      return;
    }
    const saved = await post({
      operation: "commit_record",
      recordType: "coach_request",
      parentId: selectedSource.id,
      title: `${selectedSource.title} — Coach Request`,
      payload: {
        dimension,
        requestedOn: dateInTimeZone(new Date(), timezone),
        timezone,
        focusQuestion,
        learnerSelfDiagnosis,
        independentFirstPassConfirmed: true,
        privacyConfirmed: requestPrivacyConfirmed,
      },
    });
    if (saved) {
      setSourceId("");
      setDimension("");
      setFocusQuestion("");
      setLearnerSelfDiagnosis("");
      setRequestPrivacyConfirmed(false);
      announce("Coach Request queued. Competing interpretations and benchmarks remain hidden until the operator appends feedback.");
    }
  }

  async function commitRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFeedback) {
      announce("Choose immutable Coach Feedback that still requires a Revision Attempt.");
      return;
    }
    const saved = await post({
      operation: "commit_record",
      recordType: "revision_attempt",
      parentId: selectedFeedback.id,
      title: `${text(selectedFeedback.payload, "companyIdentity")} — Revision Attempt`,
      payload: {
        attemptedOn: dateInTimeZone(new Date(), timezone),
        timezone,
        revisedJudgment: revision.revisedJudgment,
        evidenceAdded: revision.evidenceAdded,
        responseToUnsupportedInference: revision.responseToUnsupportedInference,
        disconfirmingCase: revision.disconfirmingCase,
        decisionDelta: revision.decisionDelta,
        genuineRevisionConfirmed: revision.genuineRevisionConfirmed,
        privacyConfirmed: revision.privacyConfirmed,
      },
    });
    if (saved) {
      setRevisionFeedbackId("");
      setRevision(emptyRevision());
      announce("Revision Attempt preserved beside the original work and Coach Feedback. Nothing earlier was rewritten.");
    }
  }

  return (
    <section className="view coach-view">
      <div className="intro-row">
        <div><span className="eyebrow coral">Judgment Coach · diagnosis after commitment</span><h2>Reveal the gap, not a grade or answer.</h2></div>
        <p>The Independent First Pass stays locked. Feedback identifies one unsupported inference, evidence gap, recurring error, required revision, and next difficulty adjustment.</p>
      </div>

      <div className="coach-mastery-grid" aria-label="Mastery Evidence by judgment dimension">
        {COACH_DIMENSIONS.map((coachDimension) => {
          const latest = mastery
            .filter((record) => text(record.payload, "dimension") === coachDimension)
            .sort((left, right) => right.committedAt.localeCompare(left.committedAt))[0];
          const state = latest ? text(latest.payload, "evidenceState") : "not_observed";
          const gaps = latest && Array.isArray(latest.payload.remainingGaps) ? latest.payload.remainingGaps.filter((gap): gap is string => typeof gap === "string") : [];
          return <article key={coachDimension} className={state === "repeated_or_corroborated" ? "corroborated" : ""}>
            <small>{dimensionLabels[coachDimension]}</small><strong>{state.replaceAll("_", " ")}</strong>
            <p>{latest ? text(latest.payload, "basis") : "No independently coached attempt is preserved yet."}</p>
            {gaps.length > 0 && <ul>{gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>}
          </article>;
        })}
      </div>

      <div className="coach-workbench">
        <form className="coach-card" onSubmit={commitRequest}>
          <div className="sourcing-card-head"><span>01</span><div><small>Independent First Pass first</small><h3>Queue one diagnosis</h3></div></div>
          <label>Committed original work<select required value={sourceId} onChange={(event) => { setSourceId(event.target.value); setDimension(""); }}><option value="">Choose immutable work…</option>{sources.map((record) => <option key={record.id} value={record.id}>{record.title} · {record.recordType.replaceAll("_", " ")}</option>)}</select></label>
          <label>Judgment dimension<select required value={dimension} onChange={(event) => setDimension(event.target.value as CoachDimension)}><option value="">Choose one dimension…</option>{availableDimensions.map((candidate) => <option key={candidate} value={candidate}>{dimensionLabels[candidate]}</option>)}</select></label>
          <label>What exact question should the coach diagnose?<textarea required rows={3} value={focusQuestion} onChange={(event) => setFocusQuestion(event.target.value)} /></label>
          <label>Your self-diagnosis before feedback<textarea required rows={3} value={learnerSelfDiagnosis} onChange={(event) => setLearnerSelfDiagnosis(event.target.value)} placeholder="Name the inference or evidence gap you suspect. Do not ask for a model answer." /></label>
          <label className="privacy-confirmation"><input required type="checkbox" checked={requestPrivacyConfirmed} onChange={(event) => setRequestPrivacyConfirmed(event.target.checked)} />I confirm the source is my committed Independent First Pass and contains only bounded, approved private evidence.</label>
          <p className="boundary-note">The queue exposes only this request and an explicit bounded projection of its source. Other private records remain hidden.</p>
          <button className="primary" disabled={busy || !sources.length}>{busy ? "Queuing…" : "Commit Coach Request"}</button>
        </form>

        <form className="coach-card" onSubmit={commitRevision}>
          <div className="sourcing-card-head"><span>02</span><div><small>Original remains immutable</small><h3>Answer required feedback</h3></div></div>
          <label>Coach Feedback<select value={revisionFeedbackId} onChange={(event) => { setRevisionFeedbackId(event.target.value); setRevision(emptyRevision()); }}><option value="">Choose feedback awaiting revision…</option>{feedbackAwaitingRevision.map((record) => <option key={record.id} value={record.id}>{text(record.payload, "companyIdentity")} · {dimensionLabels[text(record.payload, "dimension") as CoachDimension]}</option>)}</select></label>
          {!feedback.length && <p className="empty-copy">No feedback has returned from the secure operator yet.</p>}
          {selectedFeedback && <div className="coach-diagnosis">
            <span>Unsupported inference</span><p>{text(selectedFeedback.payload, "unsupportedInference")}</p>
            <span>Evidence gap</span><p>{text(selectedFeedback.payload, "evidenceGap")}</p>
            <span>Recurring error · {text(selectedFeedback.payload, "recurringErrorKind").replaceAll("_", " ")} · observed {String(selectedFeedback.payload.recurringErrorCount)}×</span><p>{text(selectedFeedback.payload, "recurringError")}</p>
            <span>Required revision</span><p>{text(selectedFeedback.payload, "requiredRevision")}</p>
            <span>Competing interpretation</span><p>{text(selectedFeedback.payload, "competingInterpretation")}</p>
            <span>Benchmark</span><p>{text(selectedFeedback.payload, "benchmark")}</p>
            <span>Next difficulty</span><p>{difficultyLabels[text(selectedFeedback.payload, "nextDifficultyAdjustment")] ?? text(selectedFeedback.payload, "nextDifficultyAdjustment")}</p>
          </div>}
          <label>Revised judgment<textarea required rows={3} value={revision.revisedJudgment} onChange={(event) => setRevision({ ...revision, revisedJudgment: event.target.value })} /></label>
          <label>Evidence added or reinterpreted<textarea required rows={3} value={revision.evidenceAdded} onChange={(event) => setRevision({ ...revision, evidenceAdded: event.target.value })} /></label>
          <label>Response to the unsupported inference<textarea required rows={3} value={revision.responseToUnsupportedInference} onChange={(event) => setRevision({ ...revision, responseToUnsupportedInference: event.target.value })} /></label>
          <label>Strongest disconfirming case<textarea required rows={3} value={revision.disconfirmingCase} onChange={(event) => setRevision({ ...revision, disconfirmingCase: event.target.value })} /></label>
          <label>Decision Delta<textarea required rows={3} value={revision.decisionDelta} onChange={(event) => setRevision({ ...revision, decisionDelta: event.target.value })} /></label>
          <label className="privacy-confirmation"><input required type="checkbox" checked={revision.genuineRevisionConfirmed} onChange={(event) => setRevision({ ...revision, genuineRevisionConfirmed: event.target.checked })} />This is a genuine evidence-based revision, not a restatement of the original.</label>
          <label className="privacy-confirmation"><input required type="checkbox" checked={revision.privacyConfirmed} onChange={(event) => setRevision({ ...revision, privacyConfirmed: event.target.checked })} />This revision contains only bounded, approved private evidence.</label>
          <button className="primary" disabled={busy || !selectedFeedback}>{busy ? "Preserving…" : "Commit Revision Attempt"}</button>
        </form>
      </div>

      <div className="coach-history">
        <div className="sourcing-card-head"><span>03</span><div><small>Feedback appears only after commitment</small><h3>Append-only coaching trail</h3></div></div>
        {!requests.length ? <p className="empty-copy">No Coach Request is preserved yet.</p> : requests.map((request) => {
          const response = feedback.find((item) => item.parentId === request.id);
          const attempt = response ? revisions.find((item) => item.parentId === response.id) : undefined;
          return <article key={request.id}>
            <div><small>{dimensionLabels[text(request.payload, "dimension") as CoachDimension]} · {text(request.payload, "companyIdentity")}</small><strong>{request.title}</strong></div>
            <span className={response ? "returned" : "queued"}>{response ? "Feedback returned" : "Queued — interpretations withheld"}</span>
            <p>{text(request.payload, "focusQuestion")}</p>
            {response && <p><strong>Diagnosis:</strong> {text(response.payload, "unsupportedInference")}</p>}
            {attempt && <p><strong>Revision preserved:</strong> {text(attempt.payload, "decisionDelta")}</p>}
          </article>;
        })}
      </div>
    </section>
  );
}
