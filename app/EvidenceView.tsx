"use client";

import { ArrowRight, Brain, ChartLineUp, Scales, TrendUp, UsersThree } from "@phosphor-icons/react";
import type { CourseRecord, CourseTodayState } from "./courseViewTypes";

function text(payload: Record<string, unknown>, key: string, fallback = "Not yet preserved") {
  return typeof payload[key] === "string" && String(payload[key]).trim() ? String(payload[key]) : fallback;
}

function recordById(records: CourseRecord[], id: unknown) {
  return typeof id === "string" ? records.find((record) => record.id === id) : undefined;
}

function EmptyEvidence({ children }: { children: string }) {
  return <p className="evidence-empty">{children}</p>;
}

export function EvidenceView({ records, recordsComplete, epoch, practiceDay, onOpenHistory }: CourseTodayState & { records: CourseRecord[]; recordsComplete: boolean; onOpenHistory: () => void }) {
  const snapshots = records.filter((record) => record.recordType === "snapshot_judgment");
  const underwrites = records.filter((record) => record.recordType === "weekly_underwrite");
  const calibrations = records.filter((record) => record.recordType === "calibration_review");
  const feedback = records.filter((record) => record.recordType === "coach_feedback");
  const revisions = records.filter((record) => record.recordType === "revision_attempt");
  const founderReviews = records.filter((record) => record.recordType === "founder_evidence_review");
  const recruiting = records.filter((record) => ["recruiting_opportunity", "opportunity_observation", "recruiting_interaction", "application_attempt", "interview_practice", "portfolio_candidate"].includes(record.recordType));
  const selection = records.find((record) => record.recordType === "confirmation_selection");
  const finalists = Array.isArray(selection?.payload.finalists) ? selection.payload.finalists as Array<Record<string, unknown>> : [];
  const sectorEvidence = finalists.find((item) => item.sector === practiceDay?.sector) ?? finalists[0];
  const decisionDeltas = underwrites.map((underwrite) => ({
    underwrite,
    snapshot: recordById(snapshots, underwrite.parentId ?? underwrite.payload.snapshotId),
  })).filter((item) => item.snapshot).slice(0, 3);

  return <section className="view course-secondary-view">
    <div className="intro-row"><div><span className="eyebrow coral">Private learning record</span><h2>Evidence of better judgment.</h2></div><p>Original thinking stays visible beside later outcomes and revisions. Activity volume never substitutes for decision quality.</p></div>
    <div className="evidence-lead"><div><span className="eyebrow">Current evidence window</span><h3>{epoch ? `Since Day 1 · ${epoch.startedLearnerDate}` : "Pre-curriculum record"}</h3><p>{practiceDay ? `${practiceDay.sector} · Day ${practiceDay.curriculumDay}` : "The course epoch has not started, so no new-cycle claim is made."}</p></div><button className="quiet-button" onClick={onOpenHistory}>Open immutable history <ArrowRight size={14} /></button></div>
    {!recordsComplete ? <div className="evidence-unavailable" role="status"><strong>The complete evidence window is unavailable.</strong><p>Current-day records are not being presented as your full history. Retry this destination or open immutable history.</p></div> : <>
      <div className="evidence-development-grid">
        <section><header><Scales /><div><span className="eyebrow">Decision Delta</span><h3>Original judgment versus later evidence</h3></div></header>{decisionDeltas.length ? decisionDeltas.map(({ underwrite, snapshot }) => <article key={underwrite.id}><strong>{snapshot?.title}</strong><dl><div><dt>Original</dt><dd>{text(snapshot!.payload, "thesis")}</dd></div><div><dt>Later Decision Delta</dt><dd>{text(underwrite.payload, "decisionDelta")}</dd></div></dl><small>{text(underwrite.payload, "disposition", "Disposition not preserved")} · {new Date(underwrite.committedAt).toLocaleDateString()}</small></article>) : <EmptyEvidence>No linked Underwrite has produced a Decision Delta yet. The original Snapshot will remain visible when one does.</EmptyEvidence>}</section>
        <section><header><TrendUp /><div><span className="eyebrow">Forecast calibration</span><h3>Probability before outcome</h3></div></header>{calibrations.length ? calibrations.slice(0, 3).map((review) => <article key={review.id}><strong>{review.title}</strong><p><b>Brier result</b> {typeof review.payload.brierScore === "number" ? Number(review.payload.brierScore).toFixed(4) : "No resolved forecasts"}</p><p><b>Decision rule</b> {text(review.payload, "updatedDecisionRule")}</p><small>{Array.isArray(review.payload.resolvedForecasts) ? review.payload.resolvedForecasts.length : 0} forecasts resolved · original odds preserved</small></article>) : <EmptyEvidence>No Forecast has been resolved in a Calibration Review yet. Brier results will appear only after dated resolution evidence.</EmptyEvidence>}</section>
        <section><header><Brain /><div><span className="eyebrow">Reasoning revisions</span><h3>Recurring errors and changed rules</h3></div></header>{feedback.length || revisions.length ? <>{feedback.slice(0, 2).map((item) => <article key={item.id}><strong>{text(item.payload, "recurringErrorKind", "Bounded reasoning error").replaceAll("_", " ")}</strong><p>{text(item.payload, "recurringError")}</p><small>Observed {String(item.payload.recurringErrorCount ?? "once")} · diagnosis preserved</small></article>)}{revisions.slice(0, 2).map((item) => <article key={item.id}><strong>{item.title}</strong><p>{text(item.payload, "revisedReasoning", text(item.payload, "decisionDelta"))}</p><small>Revision preserved beside the original</small></article>)}</> : <EmptyEvidence>No diagnostic feedback or genuine Revision Attempt is preserved yet. Errors will be grouped only when the same bounded pattern recurs.</EmptyEvidence>}</section>
        <section><header><UsersThree /><div><span className="eyebrow">Founder evidence quality</span><h3>Observation before inference</h3></div></header>{founderReviews.length ? founderReviews.slice(0, 3).map((review) => <article key={review.id}><strong>{review.title}</strong><p><b>Source limits</b> {text(review.payload, "sourceLimitations")}</p><p><b>Counterevidence</b> {text(review.payload, "counterEvidence")}</p><small>{text(review.payload, "provisionalJudgment", "Provisional judgment not preserved")}</small></article>) : <EmptyEvidence>No Founder Evidence Review is preserved yet. Quality will be shown through source limits, observations, inference gaps, and counterevidence—not a founder score.</EmptyEvidence>}</section>
      </div>
      <section className="sector-advantage"><header><div><span className="eyebrow">Sector advantage</span><h3>Where do you have a right to a non-obvious view?</h3></div><ChartLineUp size={27} /></header><div>{[
        ["Curiosity", "curiosityEvidence"], ["Access", "accessEvidence"], ["Analytical advantage", "analyticalAdvantageEvidence"], ["Original insight", "originalInsightEvidence"], ["Independent deal flow", "independentDealFlowEvidence"],
      ].map(([dimension, key]) => <article key={dimension}><strong>{dimension}</strong><span>{sectorEvidence ? text(sectorEvidence, key) : "No evidence-qualified finalist selected yet"}</span></article>)}</div><p>{sectorEvidence ? `Evidence shown for ${text(sectorEvidence, "sector")}.` : "These dimensions remain honest empty states until breadth evidence qualifies two finalists."} No weighted startup scores are used.</p></section>
      <aside className="recruiting-evidence"><span className="eyebrow coral">Secondary linked track</span><h3>Recruiting evidence</h3>{recruiting.length ? recruiting.slice(0, 3).map((item) => <p key={item.id}><strong>{item.title}</strong> · {item.recordType.replaceAll("_", " ")} · {new Date(item.committedAt).toLocaleDateString()}</p>) : <p>No linked recruiting evidence is preserved in this window yet.</p>}</aside>
    </>}
  </section>;
}
