"use client";

import { FormEvent, useMemo, useState } from "react";
import { dateInTimeZone } from "./calibration";
import {
  APPLICATION_ATTEMPT_STATES,
  computeRecruitingMetrics,
  IMMIGRATION_EVIDENCE_STATES,
  INTERACTION_DIRECTIONS,
  INTERACTION_KINDS,
  INTERACTION_STATES,
  INTERVIEW_PRACTICE_TYPES,
  OPPORTUNITY_CLASSES,
  OPPORTUNITY_SOURCE_TYPES,
  OPPORTUNITY_STATUSES,
  expectedRecruitingFunnelClass,
  portfolioArtifactTypeForRecord,
  PORTFOLIO_ARTIFACT_TYPES,
  PORTFOLIO_PUBLICATION_STATES,
  PORTFOLIO_SOURCE_RECORD_TYPES,
  RECRUITING_TARGET_SEEDS,
  type RecruitingRecordLike,
} from "./recruiting";

type RecruitingViewProps = {
  records: RecruitingRecordLike[];
  timezone: string;
  busy: boolean;
  post: (body: Record<string, unknown>) => Promise<boolean>;
  announce: (message: string) => void;
};

const artifactRecordTypes = new Set(PORTFOLIO_SOURCE_RECORD_TYPES as readonly string[]);

function text(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === "string" ? payload[key] : "";
}

function manualOpportunity(timezone: string) {
  const today = dateInTimeZone(new Date(), timezone);
  return {
    firm: "", roleTitle: "", opportunityClass: "Qualifying Internship", funnelClass: "Qualified role",
    officialUrl: "", location: "", workMode: "", discoveredOn: today, verifiedOn: today,
    initialStatus: "Open", publishedDeadline: "", deadlineTimezone: "Not stated",
    compensationEvidence: "", roleScope: "", qualificationReason: "", immigrationState: "Unknown",
    immigrationEvidence: "No role-specific evidence preserved yet.", authorizationClaim: false,
    nextAction: "", dueDate: today,
  };
}

function emptyEvidence(timezone: string) {
  const today = dateInTimeZone(new Date(), timezone);
  return {
    recordType: "opportunity_observation", opportunityId: "", date: today, dueDate: today,
    status: "Open", sourceType: "First-party page", sourceReference: "", materialChange: "",
    opportunityClass: "Qualifying Internship", funnelClass: "Qualified role", immigrationState: "Unknown", immigrationEvidence: "",
    authorizationClaim: false, nextAction: "", privateEvidenceConfirmed: false,
    interactionKind: "Relationship development", direction: "Inbound", interactionState: "Received",
    counterpartyRole: "", evidenceSummary: "", outcome: "", approvalConfirmed: false,
    attemptState: "Draft", artifactChecklist: "", claimLedger: "", authorizationStatement: "",
    confirmationReference: "", practiceType: "Fit", prompt: "",
    independentAnswerSummary: "", evidenceUsed: "", unsupportedClaim: "", durationMinutes: 30,
    nextRevision: "", sourceRecordId: "", artifactType: "Snapshot", title: "",
    evidenceOfOwnership: "", confidentialityReview: "Not cleared", redactionsNeeded: "",
    publicationState: "Private candidate",
  };
}

const evidenceLabels: Record<string, string> = {
  opportunity_observation: "Opportunity Observation",
  recruiting_interaction: "Recruiting Interaction",
  application_attempt: "Application Attempt",
  interview_practice: "Interview Practice",
  portfolio_candidate: "Portfolio Candidate",
};

export function RecruitingView({ records, timezone, busy, post, announce }: RecruitingViewProps) {
  const [opportunity, setOpportunity] = useState(() => manualOpportunity(timezone));
  const [evidence, setEvidence] = useState(() => emptyEvidence(timezone));
  const opportunities = useMemo(
    () => records.filter((record) => record.recordType === "recruiting_opportunity"),
    [records],
  );
  const artifacts = useMemo(
    () => records.filter((record) => artifactRecordTypes.has(record.recordType)),
    [records],
  );
  const metrics = useMemo(() => computeRecruitingMetrics(records), [records]);

  async function commitOpportunity(payload: Record<string, unknown>, title: string) {
    const saved = await post({ operation: "commit_record", recordType: "recruiting_opportunity", title, payload: { ...payload, timezone } });
    if (saved) announce("Recruiting Opportunity locked. Preserve later changes as dated Opportunity Observations.");
    return saved;
  }

  async function submitOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await commitOpportunity(opportunity, `${opportunity.firm} — ${opportunity.roleTitle}`);
    if (saved) setOpportunity(manualOpportunity(timezone));
  }

  async function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parent = opportunities.find((record) => record.id === evidence.opportunityId);
    if (!parent) return;
    let payload: Record<string, unknown>;
    if (evidence.recordType === "opportunity_observation") payload = {
      opportunityId: evidence.opportunityId, observedOn: evidence.date, timezone, status: evidence.status,
      sourceType: evidence.sourceType, sourceReference: evidence.sourceReference, materialChange: evidence.materialChange,
      opportunityClass: evidence.opportunityClass, funnelClass: evidence.funnelClass, immigrationState: evidence.immigrationState,
      immigrationEvidence: evidence.immigrationEvidence, authorizationClaim: evidence.authorizationClaim,
      nextAction: evidence.nextAction, dueDate: evidence.dueDate, privateEvidenceConfirmed: evidence.privateEvidenceConfirmed,
    };
    else if (evidence.recordType === "recruiting_interaction") payload = {
      opportunityId: evidence.opportunityId, interactionKind: evidence.interactionKind, direction: evidence.direction,
      interactionState: evidence.interactionState, occurredOn: evidence.date, timezone,
      counterpartyRole: evidence.counterpartyRole, evidenceSummary: evidence.evidenceSummary, outcome: evidence.outcome,
      nextAction: evidence.nextAction, dueDate: evidence.dueDate, approvalConfirmed: evidence.approvalConfirmed,
      privateEvidenceConfirmed: evidence.privateEvidenceConfirmed,
    };
    else if (evidence.recordType === "application_attempt") payload = {
      opportunityId: evidence.opportunityId, attemptedOn: evidence.date, timezone, attemptState: evidence.attemptState,
      artifactChecklist: evidence.artifactChecklist, claimLedger: evidence.claimLedger,
      authorizationStatement: evidence.authorizationStatement, confirmationReference: evidence.confirmationReference,
      immigrationState: evidence.immigrationState, authorizationClaim: evidence.authorizationClaim,
      approvalConfirmed: evidence.approvalConfirmed, nextAction: evidence.nextAction, dueDate: evidence.dueDate,
    };
    else if (evidence.recordType === "interview_practice") payload = {
      opportunityId: evidence.opportunityId, practicedOn: evidence.date, timezone, practiceType: evidence.practiceType,
      prompt: evidence.prompt, independentAnswerSummary: evidence.independentAnswerSummary,
      evidenceUsed: evidence.evidenceUsed, unsupportedClaim: evidence.unsupportedClaim,
      durationMinutes: evidence.durationMinutes, nextRevision: evidence.nextRevision,
    };
    else payload = {
      opportunityId: evidence.opportunityId, sourceRecordId: evidence.sourceRecordId, capturedOn: evidence.date,
      timezone, artifactType: evidence.artifactType, title: evidence.title,
      evidenceOfOwnership: evidence.evidenceOfOwnership, confidentialityReview: evidence.confidentialityReview,
      redactionsNeeded: evidence.redactionsNeeded, publicationState: evidence.publicationState,
      approvalConfirmed: evidence.approvalConfirmed, nextAction: evidence.nextAction,
    };
    const saved = await post({
      operation: "commit_record", recordType: evidence.recordType, parentId: parent.id,
      title: `${text(parent.payload, "firm")} — ${evidenceLabels[evidence.recordType]}`, payload,
    });
    if (saved) {
      setEvidence(emptyEvidence(timezone));
      announce(`${evidenceLabels[evidence.recordType]} locked without rewriting the opportunity or taking an external action.`);
    }
  }

  return (
    <section className="view recruiting-view">
      <div className="intro-row">
        <div><span className="eyebrow coral">Seven-month sprint</span><h2>Recruit concurrently. Count only real outcomes.</h2></div>
        <p>This private workspace preserves roles, observations, interactions, attempts, practice, and portfolio candidates. It never sends outreach, submits applications, or publishes artifacts.</p>
      </div>

      <div className="recruiting-metrics" aria-label="Qualifying internship funnel">
        <article><span>Qualified roles</span><strong>{metrics.qualifiedRoles}</strong><small>the funnel denominator</small></article>
        <article><span>Referrals</span><strong>{metrics.referrals}</strong><small>qualified roles with evidence</small></article>
        <article><span>Applications</span><strong>{metrics.applications}</strong><small>confirmed submissions only</small></article>
        <article><span>Interviews</span><strong>{metrics.interviews}</strong><small>completed interviews only</small></article>
        <article><span>Offers</span><strong>{metrics.offers}</strong><small>observed offers only</small></article>
        <article><span>Milestones</span><strong>{metrics.milestones}</strong><small>visible, outside denominator</small></article>
      </div>

      <div className="recruiting-ledger">
        <div className="section-heading"><div><span className="eyebrow">Current evidence</span><h3>One row per opportunity, latest observation effective.</h3></div><span className="quiet">No prestige score. No activity points.</span></div>
        {!metrics.rows.length ? <p className="empty-copy">Commit a verified target or a manually researched opportunity to begin.</p> : metrics.rows.map((row) => <article key={row.id}>
          <div><span className="eyebrow coral">{row.opportunityClass}</span><h4>{row.firm} · {row.roleTitle}</h4><p>{row.currentStatus} · {row.funnelClass}</p></div>
          <div><strong>{row.immigrationState}</strong><p>{row.nextAction}</p><small>Due {row.dueDate}</small></div>
        </article>)}
      </div>

      <div className="verified-targets">
        <div className="section-heading"><div><span className="eyebrow">Verified 8 Aug 2026</span><h3>Seed the sprint from first-party evidence.</h3></div><span className="quiet">A seed commits a private record; it does not apply.</span></div>
        <div className="target-grid">{RECRUITING_TARGET_SEEDS.map((target) => <article key={target.normalizedOfficialUrl}>
          <span className="eyebrow coral">{target.opportunityClass}</span><h4>{target.firm}</h4><p>{target.roleTitle}</p><small>{target.initialStatus} · {target.location}</small>
          <a href={target.officialUrl} target="_blank" rel="noreferrer">Inspect first-party source ↗</a>
          <button disabled={busy || opportunities.some((record) => text(record.payload, "normalizedOfficialUrl") === target.normalizedOfficialUrl)} onClick={() => void commitOpportunity(target, `${target.firm} — ${target.roleTitle}`)}>
            {opportunities.some((record) => text(record.payload, "normalizedOfficialUrl") === target.normalizedOfficialUrl) ? "Already preserved" : "Commit opportunity"}
          </button>
        </article>)}</div>
      </div>

      <div className="recruiting-workbench">
        <form className="recruiting-card" onSubmit={submitOpportunity}>
          <div className="sourcing-card-head"><span>01</span><div><small>Research intake</small><h3>Recruiting Opportunity</h3></div></div>
          <div className="field-grid two"><label>Firm<input required value={opportunity.firm} onChange={(event) => setOpportunity({ ...opportunity, firm: event.target.value })} /></label><label>Role or program<input required value={opportunity.roleTitle} onChange={(event) => setOpportunity({ ...opportunity, roleTitle: event.target.value })} /></label></div>
          <div className="field-grid two"><label>Class<select value={opportunity.opportunityClass} onChange={(event) => setOpportunity({ ...opportunity, opportunityClass: event.target.value, funnelClass: expectedRecruitingFunnelClass(event.target.value) })}>{OPPORTUNITY_CLASSES.map((value) => <option key={value}>{value}</option>)}</select></label><label>Funnel class<input readOnly value={opportunity.funnelClass} /></label></div>
          <label>First-party URL<input required type="url" value={opportunity.officialUrl} onChange={(event) => setOpportunity({ ...opportunity, officialUrl: event.target.value })} /></label>
          <div className="field-grid two"><label>Location<input required value={opportunity.location} onChange={(event) => setOpportunity({ ...opportunity, location: event.target.value })} /></label><label>Work mode<input required value={opportunity.workMode} onChange={(event) => setOpportunity({ ...opportunity, workMode: event.target.value })} /></label></div>
          <div className="field-grid two"><label>Observed status<select value={opportunity.initialStatus} onChange={(event) => setOpportunity({ ...opportunity, initialStatus: event.target.value })}>{OPPORTUNITY_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label><label>Published deadline<input type="date" value={opportunity.publishedDeadline} onChange={(event) => setOpportunity({ ...opportunity, publishedDeadline: event.target.value })} /></label></div>
          <label>Compensation evidence<textarea required rows={2} value={opportunity.compensationEvidence} onChange={(event) => setOpportunity({ ...opportunity, compensationEvidence: event.target.value })} /></label>
          <label>Role scope<textarea required rows={2} value={opportunity.roleScope} onChange={(event) => setOpportunity({ ...opportunity, roleScope: event.target.value })} /></label>
          <label>Qualification reason<textarea required rows={2} value={opportunity.qualificationReason} onChange={(event) => setOpportunity({ ...opportunity, qualificationReason: event.target.value })} /></label>
          <label>Immigration evidence state<select value={opportunity.immigrationState} onChange={(event) => setOpportunity({ ...opportunity, immigrationState: event.target.value, authorizationClaim: event.target.value === "Authorized" })}>{IMMIGRATION_EVIDENCE_STATES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Immigration evidence<textarea required rows={2} value={opportunity.immigrationEvidence} onChange={(event) => setOpportunity({ ...opportunity, immigrationEvidence: event.target.value })} /></label>
          <label>Next action<textarea required rows={2} value={opportunity.nextAction} onChange={(event) => setOpportunity({ ...opportunity, nextAction: event.target.value })} /></label>
          <label>Due date<input required type="date" value={opportunity.dueDate} onChange={(event) => setOpportunity({ ...opportunity, dueDate: event.target.value })} /></label>
          <p className="boundary-note">Only the exact <strong>Authorized</strong> evidence state can support an authorization claim. {opportunity.authorizationClaim ? "This intake preserves that structured claim with its evidence." : "This intake deliberately makes no such claim."}</p>
          <button className="primary" disabled={busy}>{busy ? "Preserving…" : "Commit opportunity"}</button>
        </form>

        <form className="recruiting-card" onSubmit={submitEvidence}>
          <div className="sourcing-card-head"><span>02</span><div><small>Append-only child record</small><h3>Dated recruiting evidence</h3></div></div>
          <label>Evidence type<select value={evidence.recordType} onChange={(event) => setEvidence({ ...emptyEvidence(timezone), recordType: event.target.value })}>{Object.entries(evidenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Opportunity<select required value={evidence.opportunityId} onChange={(event) => { const row = metrics.rows.find((item) => item.id === event.target.value); setEvidence({ ...evidence, opportunityId: event.target.value, opportunityClass: row?.opportunityClass ?? evidence.opportunityClass, funnelClass: row?.funnelClass ?? evidence.funnelClass, immigrationState: row?.immigrationState ?? evidence.immigrationState, authorizationClaim: row?.immigrationState === "Authorized" }); }}><option value="">Choose an opportunity…</option>{opportunities.map((record) => <option key={record.id} value={record.id}>{text(record.payload, "firm")} · {text(record.payload, "roleTitle")}</option>)}</select></label>
          <label>Evidence date<input required type="date" value={evidence.date} onChange={(event) => setEvidence({ ...evidence, date: event.target.value })} /></label>

          {evidence.recordType === "opportunity_observation" && <>
            <div className="field-grid two"><label>Status<select value={evidence.status} onChange={(event) => setEvidence({ ...evidence, status: event.target.value })}>{OPPORTUNITY_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label><label>Current class<select value={evidence.opportunityClass} onChange={(event) => setEvidence({ ...evidence, opportunityClass: event.target.value, funnelClass: expectedRecruitingFunnelClass(event.target.value) })}>{OPPORTUNITY_CLASSES.map((value) => <option key={value}>{value}</option>)}</select></label></div>
            <label>Funnel class<select value={evidence.funnelClass} onChange={(event) => setEvidence({ ...evidence, funnelClass: event.target.value })}><option>{expectedRecruitingFunnelClass(evidence.opportunityClass)}</option><option>Archived</option></select></label>
            <label>Source type<select value={evidence.sourceType} onChange={(event) => setEvidence({ ...evidence, sourceType: event.target.value })}>{OPPORTUNITY_SOURCE_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Source reference<input required value={evidence.sourceReference} onChange={(event) => setEvidence({ ...evidence, sourceReference: event.target.value })} placeholder="First-party URL or concise private evidence reference" /></label>
            <label>Material change<textarea required rows={2} value={evidence.materialChange} onChange={(event) => setEvidence({ ...evidence, materialChange: event.target.value })} /></label>
            <label>Immigration evidence state<select value={evidence.immigrationState} onChange={(event) => setEvidence({ ...evidence, immigrationState: event.target.value, authorizationClaim: event.target.value === "Authorized" })}>{IMMIGRATION_EVIDENCE_STATES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Immigration evidence<textarea required rows={2} value={evidence.immigrationEvidence} onChange={(event) => setEvidence({ ...evidence, immigrationEvidence: event.target.value })} /></label>
          </>}

          {evidence.recordType === "recruiting_interaction" && <>
            <div className="field-grid two"><label>Kind<select value={evidence.interactionKind} onChange={(event) => setEvidence({ ...evidence, interactionKind: event.target.value })}>{INTERACTION_KINDS.map((value) => <option key={value}>{value}</option>)}</select></label><label>Direction<select value={evidence.direction} onChange={(event) => setEvidence({ ...evidence, direction: event.target.value })}>{INTERACTION_DIRECTIONS.map((value) => <option key={value}>{value}</option>)}</select></label></div>
            <label>State<select value={evidence.interactionState} onChange={(event) => setEvidence({ ...evidence, interactionState: event.target.value })}>{INTERACTION_STATES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Counterparty role<input required value={evidence.counterpartyRole} onChange={(event) => setEvidence({ ...evidence, counterpartyRole: event.target.value })} placeholder="Partner, recruiter, alumnus—not a contact detail" /></label>
            <label>Behavioral evidence summary<textarea required rows={2} value={evidence.evidenceSummary} onChange={(event) => setEvidence({ ...evidence, evidenceSummary: event.target.value })} /></label>
            <label>Outcome<textarea required rows={2} value={evidence.outcome} onChange={(event) => setEvidence({ ...evidence, outcome: event.target.value })} /></label>
          </>}

          {evidence.recordType === "application_attempt" && <>
            <label>Attempt state<select value={evidence.attemptState} onChange={(event) => setEvidence({ ...evidence, attemptState: event.target.value })}>{APPLICATION_ATTEMPT_STATES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Artifact checklist<textarea required rows={2} value={evidence.artifactChecklist} onChange={(event) => setEvidence({ ...evidence, artifactChecklist: event.target.value })} /></label>
            <label>Claim ledger<textarea required rows={2} value={evidence.claimLedger} onChange={(event) => setEvidence({ ...evidence, claimLedger: event.target.value })} /></label>
            <label>Authorization statement<textarea required rows={2} value={evidence.authorizationStatement} onChange={(event) => setEvidence({ ...evidence, authorizationStatement: event.target.value })} /></label>
            <label>Immigration evidence state<select value={evidence.immigrationState} onChange={(event) => setEvidence({ ...evidence, immigrationState: event.target.value, authorizationClaim: event.target.value === "Authorized" })}>{IMMIGRATION_EVIDENCE_STATES.map((value) => <option key={value}>{value}</option>)}</select><small>Use “No role authorization claimed.” unless the effective state is Authorized; Authorized uses “Role authorization documented.”</small></label>
            <label>Confirmation reference<input required value={evidence.confirmationReference} onChange={(event) => setEvidence({ ...evidence, confirmationReference: event.target.value })} /></label>
          </>}

          {evidence.recordType === "interview_practice" && <>
            <label>Practice type<select value={evidence.practiceType} onChange={(event) => setEvidence({ ...evidence, practiceType: event.target.value })}>{INTERVIEW_PRACTICE_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Prompt<textarea required rows={2} value={evidence.prompt} onChange={(event) => setEvidence({ ...evidence, prompt: event.target.value })} /></label>
            <label>Independent answer summary<textarea required rows={3} value={evidence.independentAnswerSummary} onChange={(event) => setEvidence({ ...evidence, independentAnswerSummary: event.target.value })} /></label>
            <label>Evidence used<textarea required rows={2} value={evidence.evidenceUsed} onChange={(event) => setEvidence({ ...evidence, evidenceUsed: event.target.value })} /></label>
            <label>Unsupported claim or gap<textarea required rows={2} value={evidence.unsupportedClaim} onChange={(event) => setEvidence({ ...evidence, unsupportedClaim: event.target.value })} /></label>
            <div className="field-grid two"><label>Minutes<input required type="number" min="1" max="120" value={evidence.durationMinutes} onChange={(event) => setEvidence({ ...evidence, durationMinutes: Number(event.target.value) })} /></label><label>Next revision<input required value={evidence.nextRevision} onChange={(event) => setEvidence({ ...evidence, nextRevision: event.target.value })} /></label></div>
          </>}

          {evidence.recordType === "portfolio_candidate" && <>
            <label>Private source artifact<select required value={evidence.sourceRecordId} onChange={(event) => { const artifact = artifacts.find((record) => record.id === event.target.value); setEvidence({ ...evidence, sourceRecordId: event.target.value, artifactType: artifact ? portfolioArtifactTypeForRecord(artifact.recordType) : evidence.artifactType }); }}><option value="">Choose a preserved artifact…</option>{artifacts.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
            <div className="field-grid two"><label>Artifact type<select value={evidence.artifactType} onChange={(event) => setEvidence({ ...evidence, artifactType: event.target.value })}>{PORTFOLIO_ARTIFACT_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label><label>Candidate state<select value={evidence.publicationState} onChange={(event) => setEvidence({ ...evidence, publicationState: event.target.value })}>{PORTFOLIO_PUBLICATION_STATES.map((value) => <option key={value}>{value}</option>)}</select></label></div>
            <label>Candidate title<input required value={evidence.title} onChange={(event) => setEvidence({ ...evidence, title: event.target.value })} /></label>
            <label>Evidence of learner ownership<textarea required rows={2} value={evidence.evidenceOfOwnership} onChange={(event) => setEvidence({ ...evidence, evidenceOfOwnership: event.target.value })} /></label>
            <label>Confidentiality review<input required value={evidence.confidentialityReview} onChange={(event) => setEvidence({ ...evidence, confidentialityReview: event.target.value })} placeholder="Use Cleared only after actual review" /></label>
            <label>Redactions needed<textarea required rows={2} value={evidence.redactionsNeeded} onChange={(event) => setEvidence({ ...evidence, redactionsNeeded: event.target.value })} /></label>
          </>}

          {evidence.recordType !== "interview_practice" && evidence.recordType !== "portfolio_candidate" && <>
            <label>Next action<textarea required rows={2} value={evidence.nextAction} onChange={(event) => setEvidence({ ...evidence, nextAction: event.target.value })} /></label>
            <label>Due date<input required type="date" value={evidence.dueDate} onChange={(event) => setEvidence({ ...evidence, dueDate: event.target.value })} /></label>
          </>}
          {evidence.recordType === "portfolio_candidate" && <label>Next action<textarea required rows={2} value={evidence.nextAction} onChange={(event) => setEvidence({ ...evidence, nextAction: event.target.value })} /></label>}

          {(evidence.recordType === "recruiting_interaction" || (evidence.recordType === "opportunity_observation" && evidence.sourceType === "Private recruiting evidence")) && <label className="privacy-confirmation"><input required type="checkbox" checked={evidence.privateEvidenceConfirmed} onChange={(event) => setEvidence({ ...evidence, privateEvidenceConfirmed: event.target.checked })} />I omitted raw messages, contact details, and confidential material.</label>}
          {(evidence.recordType === "recruiting_interaction" || evidence.recordType === "application_attempt" || evidence.recordType === "portfolio_candidate") && <label className="privacy-confirmation"><input type="checkbox" checked={evidence.approvalConfirmed} onChange={(event) => setEvidence({ ...evidence, approvalConfirmed: event.target.checked })} />Explicit learner approval is preserved for any claimed outbound, submission, or recruiting-use action.</label>}
          <p className="boundary-note">This button records evidence only. It cannot contact a firm, submit an application, or publish an artifact.</p>
          <button className="primary" disabled={busy || !opportunities.length}>{busy ? "Preserving…" : `Commit ${evidenceLabels[evidence.recordType]}`}</button>
        </form>
      </div>
    </section>
  );
}
