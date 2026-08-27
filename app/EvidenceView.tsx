"use client";

import { ArrowRight, Brain, ChartLineUp, CheckCircle, Scales, TrendUp, UsersThree } from "@phosphor-icons/react";
import type { CourseRecord, CourseTodayState } from "./courseViewTypes";

function count(records: CourseRecord[], type: string) { return records.filter((record) => record.recordType === type).length; }

export function EvidenceView({ records, epoch, practiceDay, onOpenHistory }: CourseTodayState & { records: CourseRecord[]; onOpenHistory: () => void }) {
  const snapshots = count(records, "snapshot_judgment");
  const forecasts = count(records, "forecast");
  const revisions = count(records, "revision_attempt") + count(records, "calibration_review");
  const founderReviews = count(records, "founder_evidence_review");
  return <section className="view course-secondary-view">
    <div className="intro-row"><div><span className="eyebrow coral">Private learning record</span><h2>Evidence of better judgment.</h2></div><p>Original thinking stays visible beside later outcomes and revisions. Activity volume never substitutes for decision quality.</p></div>
    <div className="evidence-lead"><div><span className="eyebrow">Current evidence window</span><h3>{epoch ? `Since Day 1 · ${epoch.startedLearnerDate}` : "Pre-curriculum record"}</h3><p>{practiceDay ? `${practiceDay.sector} · Day ${practiceDay.curriculumDay}` : "The course epoch has not started, so no new-cycle claim is made."}</p></div><button className="quiet-button" onClick={onOpenHistory}>Open immutable history <ArrowRight size={14} /></button></div>
    <div className="evidence-grid">
      <article><Scales /><span className="eyebrow">Decision Delta</span><h3>Original versus later</h3><strong>{snapshots}</strong><p>locked judgments available for later comparison</p><small>No hindsight rewrite</small></article>
      <article><TrendUp /><span className="eyebrow">Forecast calibration</span><h3>Probability before outcome</h3><strong>{forecasts}</strong><p>forecasts awaiting or carrying resolution evidence</p><small>Brier results appear only after resolution</small></article>
      <article><Brain /><span className="eyebrow">Reasoning revisions</span><h3>Errors that change the rule</h3><strong>{revisions}</strong><p>preserved revisions and calibration reviews</p><small>Recurring errors, not streaks</small></article>
      <article><UsersThree /><span className="eyebrow">Founder evidence</span><h3>Observation before inference</h3><strong>{founderReviews}</strong><p>structured founder-evidence reviews</p><small>Gaps and counterevidence stay visible</small></article>
    </div>
    <section className="sector-advantage"><header><div><span className="eyebrow">Sector advantage</span><h3>Where do you have a right to a non-obvious view?</h3></div><ChartLineUp size={27} /></header><div>{["Curiosity", "Access", "Analytical advantage", "Original insight", "Independent deal flow"].map((dimension) => <article key={dimension}><CheckCircle size={17} /><strong>{dimension}</strong><span>{epoch ? "Collecting evidence" : "Not yet assessed"}</span></article>)}</div><p>These are evidence dimensions, not weighted startup scores. The provisional focus stays revisable and must survive disconfirmation.</p></section>
    <aside className="recruiting-evidence"><span className="eyebrow coral">Secondary linked track</span><h3>Recruiting evidence</h3><p>Opportunities, conversations, applications, and interview practice remain linked to the investing work without becoming prestige points.</p></aside>
  </section>;
}
