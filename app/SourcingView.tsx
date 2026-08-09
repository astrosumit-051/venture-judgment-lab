"use client";

import { FormEvent, useMemo, useState } from "react";
import { dateInTimeZone } from "./calibration";
import {
  applySourcingCorrections,
  computeSourcingMetrics,
  currentSourcingStage,
  OUTREACH_CHANNELS,
  RELATIONSHIP_QUALITY_STATES,
  SOURCING_ATTRIBUTION_CLASSES,
  SOURCING_CHANNELS,
  SOURCING_CORRECTION_FIELDS,
  SOURCING_DISPOSITIONS,
  SOURCING_OUTCOMES,
  SOURCING_STAGES,
  SOURCING_UPDATE_KINDS,
  SOURCING_VISIBILITIES,
  sourcingStageIndex,
  type SourcingAttributionClass,
  type SourcingChannel,
  type SourcingCorrectionField,
  type SourcingEventLike,
  type SourcingOutcome,
  type OutreachChannel,
  type SourcingRecordLike,
  type RelationshipQualityState,
  type SourcingStage,
  type SourcingUpdateKind,
  type SourcingVisibility,
} from "./sourcing";

type SourcingViewProps = {
  records: SourcingRecordLike[];
  events: SourcingEventLike[];
  timezone: string;
  busy: boolean;
  post: (body: Record<string, unknown>) => Promise<boolean>;
  announce: (message: string) => void;
};

function text(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === "string" ? payload[key] : "";
}

function percent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function emptyExperiment(timezone: string) {
  const today = dateInTimeZone(new Date(), timezone);
  return {
    name: "",
    channel: SOURCING_CHANNELS[0] as SourcingChannel,
    targetSegment: "",
    searchSurface: "",
    hypothesis: "",
    leadingSignal: "",
    nonConsensusRationale: "",
    startDate: today,
    endDate: today,
    plannedLeads: 10,
    successCondition: "",
    stopRule: "",
  };
}

function emptyLead(timezone: string) {
  const today = dateInTimeZone(new Date(), timezone);
  return {
    experimentId: "",
    company: "",
    companyUrl: "",
    attributionClass: "" as SourcingAttributionClass | "",
    channel: "" as SourcingChannel | "",
    sourceVisibility: "Public source" as SourcingVisibility,
    sourceReference: "",
    discoveredOn: today,
    sector: "",
    companyStage: "Unknown",
    observedSignal: "",
    nonConsensusReason: "",
    qualificationThesis: "",
    ventureMechanism: "",
    disqualifier: "",
    initialDisposition: "Advance to Snapshot",
    outreachAngle: "",
    nextAction: "",
    dueDate: today,
    privateEvidenceConfirmed: false,
  };
}

function emptyProgress(timezone: string) {
  const today = dateInTimeZone(new Date(), timezone);
  return {
    leadId: "",
    updateKind: "Sourcing Progress" as SourcingUpdateKind,
    occurredOn: today,
    nextStage: "discovered" as SourcingStage,
    outreachChannel: OUTREACH_CHANNELS[0] as OutreachChannel,
    observedEvidence: "",
    relationshipQuality: RELATIONSHIP_QUALITY_STATES[0] as RelationshipQualityState,
    outcome: "Active" as SourcingOutcome,
    nextAction: "",
    dueDate: today,
    privateEvidenceConfirmed: false,
    alternateDiscoveryChannel: "" as SourcingChannel | "",
    correctionField: "" as SourcingCorrectionField | "",
    correctionReason: "",
    correctedValue: "",
    correctedAttributionClass: "" as SourcingAttributionClass | "",
    correctedChannel: "" as SourcingChannel | "",
    correctedSourceVisibility: "Public source" as SourcingVisibility,
    correctedSourceReference: "",
  };
}

export function SourcingView({ records, events, timezone, busy, post, announce }: SourcingViewProps) {
  const [experiment, setExperiment] = useState(() => emptyExperiment(timezone));
  const [lead, setLead] = useState(() => emptyLead(timezone));
  const [progress, setProgress] = useState(() => emptyProgress(timezone));
  const experiments = useMemo(
    () => records.filter((record) => record.recordType === "sourcing_experiment"),
    [records],
  );
  const leads = useMemo(
    () => records.filter((record) => record.recordType === "sourcing_lead"),
    [records],
  );
  const metrics = useMemo(() => computeSourcingMetrics(records, events), [records, events]);
  const selectedLead = leads.find((record) => record.id === progress.leadId);
  const selectedLeadPayload = selectedLead
    ? applySourcingCorrections(selectedLead.payload, events.filter((event) => event.recordId === selectedLead.id))
    : {};
  const selectedStage = selectedLead ? currentSourcingStage(selectedLead, events) : "discovered";
  const stageOptions = SOURCING_STAGES.filter((stage) => {
    const distance = sourcingStageIndex(stage.key) - sourcingStageIndex(selectedStage);
    return distance === 0 || distance === 1;
  });

  async function commitExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await post({
      operation: "commit_record",
      recordType: "sourcing_experiment",
      title: `Sourcing Experiment — ${experiment.name}`,
      payload: { ...experiment, timezone },
    });
    if (saved) {
      setExperiment(emptyExperiment(timezone));
      announce("Sourcing Experiment locked. Attach each discovered company so the hypothesis can be judged by its funnel, not its story.");
    }
  }

  async function commitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parent = experiments.find((record) => record.id === lead.experimentId);
    const saved = await post({
      operation: "commit_record",
      recordType: "sourcing_lead",
      parentId: parent?.id ?? null,
      title: `${lead.company} — Sourcing Lead`,
      payload: { ...lead, initialStage: "discovered", timezone },
    });
    if (saved) {
      setLead(emptyLead(timezone));
      announce("Sourcing Lead preserved with its original signal and attribution. Qualify it through evidence or link it into a Snapshot.");
    }
  }

  async function appendProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const {
      correctedAttributionClass,
      correctedChannel,
      correctedSourceVisibility,
      correctedSourceReference,
      ...submittedProgress
    } = progress;
    const correctedValue = progress.correctionField === "Discovery provenance" ? {
      attributionClass: correctedAttributionClass,
      channel: correctedChannel,
      sourceVisibility: correctedSourceVisibility,
      sourceReference: correctedSourceReference,
    } : progress.correctedValue;
    const saved = await post({
      operation: "advance_sourcing_lead",
      leadId: progress.leadId,
      progress: { ...submittedProgress, correctedValue, timezone },
    });
    if (saved) {
      setProgress(emptyProgress(timezone));
      announce("Sourcing evidence appended. The original discovery, attribution, and earlier relationship evidence remain unchanged.");
    }
  }

  return (
    <section className="view sourcing-view">
      <div className="intro-row">
        <div><span className="eyebrow coral">Sourcing mastery</span><h2>Find before consensus. Attribute without inflation.</h2></div>
        <p>Set the experiment during weekly planning, use its strongest leads in existing Daily Loops, and use the current recruiting allocation for outreach—no extra hours or hidden backlog.</p>
      </div>

      <div className="sourcing-metrics" aria-label="Sourcing funnel metrics">
        <article><span>Leads</span><strong>{metrics.leads}</strong><small>{metrics.independent} independently discovered</small></article>
        <article><span>Qualified</span><strong>{metrics.qualified}</strong><small>{percent(metrics.qualificationRate)} of leads</small></article>
        <article><span>Replies</span><strong>{metrics.responses}</strong><small>{percent(metrics.replyRate)} of outreach</small></article>
        <article><span>Meetings</span><strong>{metrics.meetings}</strong><small>{percent(metrics.meetingRate)} of outreach</small></article>
        <article><span>Snapshots</span><strong>{metrics.snapshots}</strong><small>{percent(metrics.snapshotRate)} of leads</small></article>
        <article><span>Underwrites</span><strong>{metrics.underwrites}</strong><small>{percent(metrics.underwriteRate)} of leads</small></article>
      </div>

      <div className="experiment-results">
        <div className="section-heading"><div><span className="eyebrow">Experiment evidence</span><h3>Judge the hypothesis by its own funnel.</h3></div><span className="quiet">Committed success and stop rules stay visible beside results.</span></div>
        {!metrics.experimentRows.length ? <p className="empty-copy">Commit the first Sourcing Experiment to begin cohort comparison.</p> : metrics.experimentRows.map((row) => <article key={row.id}><div><span className="eyebrow coral">{row.label}</span><p><strong>Success:</strong> {row.successCondition}</p><p><strong>Stop or change:</strong> {row.stopRule}</p></div><div className="experiment-numbers"><span><strong>{row.leads}</strong>Leads</span><span><strong>{row.qualified}</strong>Qualified</span><span><strong>{row.responses}</strong>Replies</span><span><strong>{row.meetings}</strong>Meetings</span><span><strong>{row.snapshots}</strong>Snapshots</span><span><strong>{row.underwrites}</strong>Underwrites</span></div></article>)}
      </div>

      <div className="sourcing-cohorts">
        <article>
          <div className="cohort-head"><div><span className="eyebrow">Attribution truth</span><h3>Who actually found the company?</h3></div><p>Database screening and assigned work remain valuable, but never count as independent discovery.</p></div>
          {!metrics.attributionRows.length ? <p className="empty-copy">No leads preserved yet.</p> : metrics.attributionRows.map((row) => <div className="cohort-row" key={row.label}><strong>{row.label}</strong><span>{row.leads} leads</span><span>{row.qualified} qualified</span><span>{row.replies} replies</span><span>{row.meetings} meetings</span><span>{row.snapshots} Snapshots</span><span>{row.underwrites} Underwrites</span></div>)}
        </article>
        <article>
          <div className="cohort-head"><div><span className="eyebrow">Channel evidence</span><h3>Where does quality compound?</h3></div><p>Volume is not quality. Compare channels by downstream judgment work and relationship evidence.</p></div>
          {!metrics.channelRows.length ? <p className="empty-copy">No channel evidence yet.</p> : metrics.channelRows.map((row) => <div className="cohort-row" key={row.label}><strong>{row.label}</strong><span>{row.leads} leads</span><span>{row.qualified} qualified</span><span>{row.replies} replies</span><span>{row.meetings} meetings</span><span>{row.snapshots} Snapshots</span><span>{row.underwrites} Underwrites</span></div>)}
        </article>
      </div>

      <div className="sourcing-workbench">
        <form className="sourcing-card" onSubmit={commitExperiment}>
          <div className="sourcing-card-head"><span>01</span><div><small>Weekly hypothesis</small><h3>Sourcing Experiment</h3></div></div>
          <label>Experiment name<input required value={experiment.name} onChange={(event) => setExperiment({ ...experiment, name: event.target.value })} placeholder="Industrial pilot signals" /></label>
          <div className="field-grid two"><label>Discovery channel<select value={experiment.channel} onChange={(event) => setExperiment({ ...experiment, channel: event.target.value as SourcingChannel })}>{SOURCING_CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}</select></label><label>Planned leads<input required type="number" min="1" max="100" value={experiment.plannedLeads} onChange={(event) => setExperiment({ ...experiment, plannedLeads: Number(event.target.value) })} /></label></div>
          <label>Target segment<textarea required rows={2} value={experiment.targetSegment} onChange={(event) => setExperiment({ ...experiment, targetSegment: event.target.value })} placeholder="A narrow founder, customer, stage, and geography pattern." /></label>
          <label>Search surface<textarea required rows={2} value={experiment.searchSurface} onChange={(event) => setExperiment({ ...experiment, searchSurface: event.target.value })} placeholder="Where and how you will look—not a generic sector name." /></label>
          <label>Discovery hypothesis<textarea required rows={3} value={experiment.hypothesis} onChange={(event) => setExperiment({ ...experiment, hypothesis: event.target.value })} placeholder="If I search here for this signal, I expect to find… because…" /></label>
          <label>Leading signal<textarea required rows={2} value={experiment.leadingSignal} onChange={(event) => setExperiment({ ...experiment, leadingSignal: event.target.value })} /></label>
          <label>Why it may be non-consensus<textarea required rows={2} value={experiment.nonConsensusRationale} onChange={(event) => setExperiment({ ...experiment, nonConsensusRationale: event.target.value })} /></label>
          <div className="field-grid two"><label>Start<input required type="date" value={experiment.startDate} onChange={(event) => setExperiment({ ...experiment, startDate: event.target.value })} /></label><label>End<input required type="date" value={experiment.endDate} onChange={(event) => setExperiment({ ...experiment, endDate: event.target.value })} /></label></div>
          <label>Success condition<textarea required rows={2} value={experiment.successCondition} onChange={(event) => setExperiment({ ...experiment, successCondition: event.target.value })} placeholder="Observable funnel evidence—not number of tabs opened." /></label>
          <label>Stop or change rule<textarea required rows={2} value={experiment.stopRule} onChange={(event) => setExperiment({ ...experiment, stopRule: event.target.value })} /></label>
          <button className="primary" disabled={busy}>{busy ? "Preserving…" : "Commit experiment"}</button>
        </form>

        <form className="sourcing-card" onSubmit={commitLead}>
          <div className="sourcing-card-head"><span>02</span><div><small>Immutable provenance</small><h3>Sourcing Lead</h3></div></div>
          <label>Linked experiment<select value={lead.experimentId} onChange={(event) => { const parent = experiments.find((record) => record.id === event.target.value); setLead({ ...lead, experimentId: event.target.value, channel: parent ? text(parent.payload, "channel") as SourcingChannel : lead.channel }); }}><option value="">Standalone discovery</option>{experiments.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
          <div className="field-grid two"><label>Company<input required value={lead.company} onChange={(event) => setLead({ ...lead, company: event.target.value })} /></label><label>Company website<input required type="url" value={lead.companyUrl} onChange={(event) => setLead({ ...lead, companyUrl: event.target.value })} placeholder="https://" /></label></div>
          <div className="field-grid two"><label>Attribution class<select required value={lead.attributionClass} onChange={(event) => { const attributionClass = event.target.value as SourcingAttributionClass; setLead({ ...lead, attributionClass, channel: attributionClass === "Database screening" ? "Institutional database" : attributionClass === "Independent discovery" && lead.channel === "Institutional database" ? "" : lead.channel, sourceVisibility: attributionClass === "Database screening" ? "Licensed database" : attributionClass === "Assigned search" ? "Internal assignment" : attributionClass === "Independent discovery" && new Set(["Licensed database", "Internal assignment"]).has(lead.sourceVisibility) ? "Public source" : lead.sourceVisibility, privateEvidenceConfirmed: false }); }}><option value="">Choose exact origin…</option>{SOURCING_ATTRIBUTION_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Discovery channel<select required value={lead.channel} onChange={(event) => setLead({ ...lead, channel: event.target.value as SourcingChannel })}><option value="">Choose discovery channel…</option>{SOURCING_CHANNELS.map((item) => <option key={item}>{item}</option>)}</select></label></div>
          <div className="field-grid three"><label>Discovered on<input required type="date" value={lead.discoveredOn} onChange={(event) => setLead({ ...lead, discoveredOn: event.target.value })} /></label><label>Sector<input required value={lead.sector} onChange={(event) => setLead({ ...lead, sector: event.target.value })} /></label><label>Company stage<select value={lead.companyStage} onChange={(event) => setLead({ ...lead, companyStage: event.target.value })}><option>Pre-seed</option><option>Seed</option><option>Series A</option><option>Unknown</option></select></label></div>
          <label>Source visibility<select value={lead.sourceVisibility} onChange={(event) => setLead({ ...lead, sourceVisibility: event.target.value as SourcingVisibility, privateEvidenceConfirmed: false })}>{SOURCING_VISIBILITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>{lead.sourceVisibility === "Public source" ? "Original source URL" : "Concise source context"}<input required type={lead.sourceVisibility === "Public source" ? "url" : "text"} value={lead.sourceReference} onChange={(event) => setLead({ ...lead, sourceReference: event.target.value })} placeholder={lead.sourceVisibility === "Public source" ? "https://" : "Relationship or assignment context—no private messages"} /></label>
          {lead.sourceVisibility !== "Public source" && <label className="privacy-confirmation"><input required type="checkbox" checked={lead.privateEvidenceConfirmed} onChange={(event) => setLead({ ...lead, privateEvidenceConfirmed: event.target.checked })} />I confirm this record contains only consented sourcing context and omits raw messages, contact details, and confidential information.</label>}
          <label>Observed signal<textarea required rows={2} value={lead.observedSignal} onChange={(event) => setLead({ ...lead, observedSignal: event.target.value })} /></label>
          <label>Why this may be early or overlooked<textarea required rows={2} value={lead.nonConsensusReason} onChange={(event) => setLead({ ...lead, nonConsensusReason: event.target.value })} /></label>
          <label>Fast qualification thesis<textarea required rows={3} value={lead.qualificationThesis} onChange={(event) => setLead({ ...lead, qualificationThesis: event.target.value })} /></label>
          <label>Venture-scale mechanism<textarea required rows={2} value={lead.ventureMechanism} onChange={(event) => setLead({ ...lead, ventureMechanism: event.target.value })} /></label>
          <label>Fast disqualifier or exact gap<textarea required rows={2} value={lead.disqualifier} onChange={(event) => setLead({ ...lead, disqualifier: event.target.value })} /></label>
          <label>Initial sourcing disposition<select value={lead.initialDisposition} onChange={(event) => setLead({ ...lead, initialDisposition: event.target.value })}>{SOURCING_DISPOSITIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Founder outreach angle<textarea required rows={2} value={lead.outreachAngle} onChange={(event) => setLead({ ...lead, outreachAngle: event.target.value })} placeholder="The specific earned observation and respectful ask—never a mass-message script." /></label>
          <div className="field-grid two"><label>Next action<input required value={lead.nextAction} onChange={(event) => setLead({ ...lead, nextAction: event.target.value })} /></label><label>Due date<input required type="date" value={lead.dueDate} onChange={(event) => setLead({ ...lead, dueDate: event.target.value })} /></label></div>
          <button className="primary" disabled={busy}>{busy ? "Preserving…" : "Commit sourcing lead"}</button>
        </form>

        <form className="sourcing-card" onSubmit={appendProgress}>
          <div className="sourcing-card-head"><span>03</span><div><small>Append-only evidence</small><h3>Sourcing Progress</h3></div></div>
          <label>Sourcing Lead<select required value={progress.leadId} onChange={(event) => { const chosen = leads.find((record) => record.id === event.target.value); const stage = chosen ? currentSourcingStage(chosen, events) : "discovered"; setProgress({ ...emptyProgress(timezone), leadId: event.target.value, nextStage: stage }); }}><option value="">Choose a lead…</option>{leads.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
          {selectedLead && <div className="locked-view"><span>Current preserved stage</span><p>{SOURCING_STAGES.find((stage) => stage.key === selectedStage)?.label}</p><small>{text(selectedLeadPayload, "attributionClass")} · {text(selectedLeadPayload, "channel")}</small></div>}
          <label>Update kind<select value={progress.updateKind} onChange={(event) => setProgress({ ...progress, updateKind: event.target.value as SourcingUpdateKind, nextStage: selectedStage, alternateDiscoveryChannel: "", correctionField: "", correctionReason: "", correctedValue: "", correctedAttributionClass: "", correctedChannel: "", correctedSourceVisibility: "Public source", correctedSourceReference: "" })}>{SOURCING_UPDATE_KINDS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="field-grid two"><label>Reached stage<select disabled={progress.updateKind !== "Sourcing Progress"} value={progress.nextStage} onChange={(event) => setProgress({ ...progress, nextStage: event.target.value as SourcingStage })}>{stageOptions.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}</select></label><label>Occurred on<input required type="date" value={progress.occurredOn} onChange={(event) => setProgress({ ...progress, occurredOn: event.target.value })} /></label></div>
          {progress.updateKind === "Rediscovery or channel evidence" && <label>Additional discovery channel<select required value={progress.alternateDiscoveryChannel} onChange={(event) => setProgress({ ...progress, alternateDiscoveryChannel: event.target.value as SourcingChannel })}><option value="">Choose the later channel…</option>{SOURCING_CHANNELS.map((item) => <option key={item}>{item}</option>)}</select></label>}
          {progress.updateKind === "Metadata correction" && <><label>Corrected metadata field<select required value={progress.correctionField} onChange={(event) => setProgress({ ...progress, correctionField: event.target.value as SourcingCorrectionField, correctedValue: "", correctedAttributionClass: "", correctedChannel: "", correctedSourceVisibility: "Public source", correctedSourceReference: "" })}><option value="">Choose the field…</option>{SOURCING_CORRECTION_FIELDS.map((item) => <option key={item}>{item}</option>)}</select></label>{progress.correctionField === "Company name" && <label>Correct company name<input required value={progress.correctedValue} onChange={(event) => setProgress({ ...progress, correctedValue: event.target.value })} /></label>}{progress.correctionField === "Discovery date" && <label>Correct discovery date<input required type="date" value={progress.correctedValue} onChange={(event) => setProgress({ ...progress, correctedValue: event.target.value })} /></label>}{progress.correctionField === "Sector" && <label>Correct sector<input required value={progress.correctedValue} onChange={(event) => setProgress({ ...progress, correctedValue: event.target.value })} /></label>}{progress.correctionField === "Company stage" && <label>Correct company stage<select required value={progress.correctedValue} onChange={(event) => setProgress({ ...progress, correctedValue: event.target.value })}><option value="">Choose the corrected stage…</option><option>Pre-seed</option><option>Seed</option><option>Series A</option><option>Unknown</option></select></label>}{progress.correctionField === "Discovery provenance" && <div className="correction-provenance"><div className="field-grid two"><label>Correct attribution class<select required value={progress.correctedAttributionClass} onChange={(event) => { const attributionClass = event.target.value as SourcingAttributionClass; setProgress({ ...progress, correctedAttributionClass: attributionClass, correctedChannel: attributionClass === "Database screening" ? "Institutional database" : progress.correctedChannel, correctedSourceVisibility: attributionClass === "Database screening" ? "Licensed database" : attributionClass === "Assigned search" ? "Internal assignment" : progress.correctedSourceVisibility }); }}><option value="">Choose exact origin…</option>{SOURCING_ATTRIBUTION_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Correct discovery channel<select required value={progress.correctedChannel} onChange={(event) => setProgress({ ...progress, correctedChannel: event.target.value as SourcingChannel })}><option value="">Choose discovery channel…</option>{SOURCING_CHANNELS.map((item) => <option key={item}>{item}</option>)}</select></label></div><label>Correct source visibility<select value={progress.correctedSourceVisibility} onChange={(event) => setProgress({ ...progress, correctedSourceVisibility: event.target.value as SourcingVisibility })}>{SOURCING_VISIBILITIES.map((item) => <option key={item}>{item}</option>)}</select></label><label>{progress.correctedSourceVisibility === "Public source" ? "Correct original source URL" : "Correct concise source context"}<input required type={progress.correctedSourceVisibility === "Public source" ? "url" : "text"} value={progress.correctedSourceReference} onChange={(event) => setProgress({ ...progress, correctedSourceReference: event.target.value })} /></label></div>}<label>Why the original metadata was wrong<textarea required rows={2} value={progress.correctionReason} onChange={(event) => setProgress({ ...progress, correctionReason: event.target.value })} /></label></>}
          {progress.updateKind === "Sourcing Progress" && <><div className="field-grid two"><label>Outreach channel<select value={progress.outreachChannel} onChange={(event) => setProgress({ ...progress, outreachChannel: event.target.value as OutreachChannel })}>{OUTREACH_CHANNELS.map((item) => <option key={item}>{item}</option>)}</select></label><label>Outcome<select value={progress.outcome} onChange={(event) => setProgress({ ...progress, outcome: event.target.value as SourcingOutcome })}>{SOURCING_OUTCOMES.map((item) => <option key={item}>{item}</option>)}</select></label></div><label>Relationship quality<select value={progress.relationshipQuality} onChange={(event) => setProgress({ ...progress, relationshipQuality: event.target.value as RelationshipQualityState })}>{RELATIONSHIP_QUALITY_STATES.map((item) => <option key={item}>{item}</option>)}</select></label></>}
          <label>{progress.updateKind === "Metadata correction" ? "Corrected value and evidence" : progress.updateKind === "Rediscovery or channel evidence" ? "Later channel evidence" : "Observed interaction evidence"}<textarea required rows={3} value={progress.observedEvidence} onChange={(event) => setProgress({ ...progress, observedEvidence: event.target.value })} placeholder="Summarize the evidence. Do not paste raw messages or private call notes." /></label>
          <label className="privacy-confirmation"><input required type="checkbox" checked={progress.privateEvidenceConfirmed} onChange={(event) => setProgress({ ...progress, privateEvidenceConfirmed: event.target.checked })} />I confirm this update preserves only consented behavioral evidence and omits raw messages, contact details, ratings, and confidential information.</label>
          <div className="field-grid two"><label>Next action<input required value={progress.nextAction} onChange={(event) => setProgress({ ...progress, nextAction: event.target.value })} /></label><label>Due date<input required type="date" value={progress.dueDate} onChange={(event) => setProgress({ ...progress, dueDate: event.target.value })} /></label></div>
          <button className="primary" disabled={busy || !selectedLead}>{busy ? "Appending…" : `Append ${progress.updateKind.toLowerCase()}`}</button>
        </form>
      </div>

      <div className="sourcing-leads">
        <div className="section-heading"><div><span className="eyebrow">Current company record</span><h3>Every lead keeps its first signal.</h3></div><span className="quiet">Link a qualified lead in Snapshot to measure downstream quality.</span></div>
        {!leads.length ? <p className="empty-copy">The first Sourcing Lead will appear here.</p> : leads.map((record) => {
          const stage = currentSourcingStage(record, events);
          const sourcingEvents = events.filter((event) => event.recordId === record.id && event.eventType.startsWith("sourcing_"));
          const effectivePayload = applySourcingCorrections(record.payload, sourcingEvents);
          return <article className="sourcing-lead-row" key={record.id}><div><span>{text(effectivePayload, "attributionClass")}</span><h3>{text(effectivePayload, "company")}</h3><p>{text(effectivePayload, "observedSignal")}</p></div><div><strong>{SOURCING_STAGES.find((item) => item.key === stage)?.label}</strong><small>{text(effectivePayload, "channel")}</small><small>{sourcingEvents.length} appended update{sourcingEvents.length === 1 ? "" : "s"}</small></div></article>;
        })}
      </div>
    </section>
  );
}
