"use client";

import { FormEvent, useMemo, useState } from "react";
import { dateInTimeZone } from "./calibration";
import {
  DILIGENCE_RECOMMENDATIONS,
  DILIGENCE_SOURCE_TYPES,
  DILIGENCE_STAGE_DEFINITIONS,
  diligenceSequenceStatus,
  type DiligenceRecordLike,
} from "./diligence";

type DiligenceViewProps = {
  records: DiligenceRecordLike[];
  timezone: string;
  busy: boolean;
  post: (body: Record<string, unknown>) => Promise<boolean>;
  announce: (message: string) => void;
};

type SourceDraft = {
  sourceType: typeof DILIGENCE_SOURCE_TYPES[number];
  sourceReference: string;
  observation: string;
  reliabilityLimits: string;
};

type TimedQuestionDraft = {
  question: string;
  secondsAllowed: number;
  answerSummary: string;
  concession: string;
};

function text(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === "string" ? payload[key] : "";
}

function emptySource(): SourceDraft {
  return { sourceType: "Public source", sourceReference: "", observation: "", reliabilityLimits: "" };
}

function emptyQuestion(): TimedQuestionDraft {
  return { question: "", secondsAllowed: 90, answerSummary: "", concession: "" };
}

function emptyStageDraft() {
  return {
    limitations: "",
    disconfirmingEvidence: "",
    inference: "",
    nextEvidence: "",
    decisionDelta: "",
    privacyConfirmed: false,
    foundationSummary: "",
    snapshotCrux: "",
    underwriteDecision: "",
    customerEvidence: "",
    marketEvidence: "",
    customerUnknowns: "",
    productAssessment: "",
    technicalAssessment: "",
    defensibility: "",
    businessModel: "",
    economicAnalysis: "",
    scalingConstraint: "",
    nonInvestmentCase: "",
    failureMechanism: "",
    leadingFailureIndicators: "",
    reversalEvidence: "",
    recommendation: "Watch",
    investmentMemo: "",
    remainingDissent: "",
    changedJudgment: "",
    unresolvedIssues: "",
    simulatedIcDecision: "",
  };
}

export function DiligenceView({ records, timezone, busy, post, announce }: DiligenceViewProps) {
  const [caseUnderwriteId, setCaseUnderwriteId] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [stageDraft, setStageDraft] = useState(emptyStageDraft);
  const [sources, setSources] = useState<SourceDraft[]>([emptySource()]);
  const [timedQuestions, setTimedQuestions] = useState<TimedQuestionDraft[]>([emptyQuestion(), emptyQuestion(), emptyQuestion()]);

  const snapshots = useMemo(() => records.filter((record) => record.recordType === "snapshot_judgment"), [records]);
  const underwrites = useMemo(() => records.filter((record) => record.recordType === "weekly_underwrite"), [records]);
  const cases = useMemo(() => records.filter((record) => record.recordType === "diligence_case"), [records]);
  const selectedCase = cases.find((record) => record.id === selectedCaseId);
  const selectedSequence = selectedCase ? diligenceSequenceStatus(records, selectedCase.id) : null;
  const nextStage = selectedSequence?.nextStage ?? null;
  const availableUnderwrites = underwrites.filter((underwrite) => !cases.some((item) => text(item.payload, "underwriteId") === underwrite.id));
  const selectedUnderwrite = underwrites.find((record) => record.id === caseUnderwriteId);
  const selectedSnapshot = selectedUnderwrite ? snapshots.find((record) => record.id === selectedUnderwrite.parentId) : undefined;
  const activeUnderwrite = selectedCase ? underwrites.find((record) => record.id === text(selectedCase.payload, "underwriteId")) : undefined;
  const activeSnapshot = selectedCase ? snapshots.find((record) => record.id === text(selectedCase.payload, "snapshotId")) : undefined;

  function resetStageEntry() {
    setStageDraft(emptyStageDraft());
    setSources([emptySource()]);
    setTimedQuestions([emptyQuestion(), emptyQuestion(), emptyQuestion()]);
  }

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUnderwrite || !selectedSnapshot) {
      announce("Choose a Weekly Underwrite that is linked to a locked Snapshot.");
      return;
    }
    const saved = await post({
      operation: "commit_record",
      recordType: "diligence_case",
      parentId: selectedUnderwrite.id,
      title: `${text(selectedSnapshot.payload, "company")} — Diligence Case`,
      payload: {
        snapshotId: selectedSnapshot.id,
        underwriteId: selectedUnderwrite.id,
        company: text(selectedSnapshot.payload, "company"),
        openedOn: dateInTimeZone(new Date(), timezone),
        timezone,
      },
    });
    if (saved) {
      setCaseUnderwriteId("");
      announce("Diligence Case opened from the locked Snapshot and Underwrite. Select it and commit the foundation stage before deeper work.");
    }
  }

  function updateSource(index: number, patch: Partial<SourceDraft>) {
    setSources((current) => current.map((source, sourceIndex) => sourceIndex === index ? { ...source, ...patch } : source));
  }

  function updateQuestion(index: number, patch: Partial<TimedQuestionDraft>) {
    setTimedQuestions((current) => current.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question));
  }

  async function commitStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCase || !nextStage) {
      announce("Choose an incomplete Diligence Case with one legal next stage.");
      return;
    }
    const specificPayload: Record<string, unknown> = nextStage.key === "foundation" ? {
      foundationSummary: stageDraft.foundationSummary,
      snapshotCrux: stageDraft.snapshotCrux,
      underwriteDecision: stageDraft.underwriteDecision,
    } : nextStage.key === "customer_market" ? {
      customerEvidence: stageDraft.customerEvidence,
      marketEvidence: stageDraft.marketEvidence,
      customerUnknowns: stageDraft.customerUnknowns,
    } : nextStage.key === "technical_product" ? {
      productAssessment: stageDraft.productAssessment,
      technicalAssessment: stageDraft.technicalAssessment,
      defensibility: stageDraft.defensibility,
    } : nextStage.key === "business_economics" ? {
      businessModel: stageDraft.businessModel,
      economicAnalysis: stageDraft.economicAnalysis,
      scalingConstraint: stageDraft.scalingConstraint,
    } : nextStage.key === "anti_memo" ? {
      nonInvestmentCase: stageDraft.nonInvestmentCase,
      failureMechanism: stageDraft.failureMechanism,
      leadingFailureIndicators: stageDraft.leadingFailureIndicators,
      reversalEvidence: stageDraft.reversalEvidence,
    } : nextStage.key === "full_memo" ? {
      recommendation: stageDraft.recommendation,
      investmentMemo: stageDraft.investmentMemo,
      remainingDissent: stageDraft.remainingDissent,
    } : {
      timedQuestions,
      changedJudgment: stageDraft.changedJudgment,
      unresolvedIssues: stageDraft.unresolvedIssues,
      simulatedIcDecision: stageDraft.simulatedIcDecision,
    };
    const saved = await post({
      operation: "commit_record",
      recordType: "diligence_stage",
      parentId: selectedCase.id,
      title: `${text(selectedCase.payload, "company")} — ${nextStage.label}`,
      payload: {
        caseId: selectedCase.id,
        stageKey: nextStage.key,
        committedOn: dateInTimeZone(new Date(), timezone),
        timezone,
        sources,
        limitations: stageDraft.limitations,
        disconfirmingEvidence: stageDraft.disconfirmingEvidence,
        inference: stageDraft.inference,
        nextEvidence: stageDraft.nextEvidence,
        decisionDelta: stageDraft.decisionDelta,
        privacyConfirmed: stageDraft.privacyConfirmed,
        ...specificPayload,
      },
    });
    if (saved) {
      resetStageEntry();
      announce(nextStage.key === "oral_defense"
        ? "Diligence Case completed. The timed answers, concessions, changed judgment, and unresolved issues are preserved without a score."
        : `${nextStage.label} locked. The original remains unchanged and only the next stage is now available.`);
    }
  }

  return (
    <section className="view diligence-view">
      <div className="intro-row">
        <div><span className="eyebrow coral">Diligence Case · seven immutable stages</span><h2>Earn the memo. Defend the causal judgment.</h2></div>
        <p>Every stage preserves sources, limitations, disconfirmation, inference, next evidence, and a Decision Delta. No stage can skip, overwrite, or collapse into a score.</p>
      </div>

      <div className="diligence-ladder" aria-label="Diligence Case stage order">
        {DILIGENCE_STAGE_DEFINITIONS.map((stage, index) => {
          const committed = Boolean(selectedSequence?.committedKeys.includes(stage.key));
          const active = nextStage?.key === stage.key;
          return <article className={committed ? "complete" : active ? "active" : "locked"} key={stage.key}>
            <span>{String(index + 1).padStart(2, "0")}</span><h3>{stage.label}</h3><p>{stage.purpose}</p><small>{committed ? "Immutable" : active ? "Next legal stage" : "Locked by sequence"}</small>
          </article>;
        })}
      </div>

      <div className="diligence-workbench">
        <form className="diligence-card" onSubmit={createCase}>
          <div className="sourcing-card-head"><span>01</span><div><small>Locked foundation links</small><h3>Open a Diligence Case</h3></div></div>
          {!underwrites.length ? <p className="empty-copy">Commit a Weekly Underwrite before opening a Diligence Case.</p> : <>
            <label>Weekly Underwrite<select required value={caseUnderwriteId} onChange={(event) => setCaseUnderwriteId(event.target.value)}><option value="">Choose an unused Underwrite…</option>{availableUnderwrites.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
            {selectedSnapshot && <div className="locked-view"><span>Linked Snapshot</span><p>{selectedSnapshot.title}</p><small>Crux: {text(selectedSnapshot.payload, "crux")}</small></div>}
            <p className="boundary-note">One case can use each Underwrite. Opening the case does not create new evidence or alter the Snapshot.</p>
            <button className="primary" disabled={busy || !availableUnderwrites.length}>{busy ? "Preserving…" : "Open Diligence Case"}</button>
          </>}
        </form>

        <div className="diligence-card">
          <div className="sourcing-card-head"><span>02</span><div><small>Append-only sequence</small><h3>Choose the active case</h3></div></div>
          <label>Diligence Case<select value={selectedCaseId} onChange={(event) => { setSelectedCaseId(event.target.value); resetStageEntry(); }}><option value="">Choose a case…</option>{cases.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
          {!cases.length && <p className="empty-copy">No Diligence Case exists yet.</p>}
          {selectedCase && selectedSequence && <div className="case-state">
            <strong>{text(selectedCase.payload, "company")}</strong>
            <span>{selectedSequence.stages.length} / {DILIGENCE_STAGE_DEFINITIONS.length} stages immutable</span>
            <p>{selectedSequence.complete ? "Case complete. No additional ladder stage is legal." : `Next: ${nextStage?.label}`}</p>
            {!selectedSequence.validPrefix && <small>Sequence integrity failed. Preserve the records and repair the contract before continuing.</small>}
          </div>}
        </div>
      </div>

      {selectedCase && nextStage && (
        <form className="judgment-form diligence-stage-form" onSubmit={commitStage}>
          <fieldset><legend><span>{String(DILIGENCE_STAGE_DEFINITIONS.indexOf(nextStage) + 1).padStart(2, "0")}</span>{nextStage.label}</legend>
            <p className="field-intro">{nextStage.purpose}</p>
            {nextStage.key === "foundation" && <>
              <div className="field-grid two"><div className="locked-view"><span>Snapshot</span><p>{activeSnapshot?.title}</p><small>{text(activeSnapshot?.payload ?? {}, "thesis")}</small></div><div className="locked-view"><span>Weekly Underwrite</span><p>{activeUnderwrite?.title}</p><small>{text(activeUnderwrite?.payload ?? {}, "decisionDelta")}</small></div></div>
              <StageField label="Foundation summary" field="foundationSummary" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Snapshot crux carried forward" field="snapshotCrux" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Underwrite decision carried forward" field="underwriteDecision" draft={stageDraft} setDraft={setStageDraft} />
            </>}
            {nextStage.key === "customer_market" && <>
              <StageField label="Customer evidence" field="customerEvidence" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Market evidence and mechanism" field="marketEvidence" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Customer and market unknowns" field="customerUnknowns" draft={stageDraft} setDraft={setStageDraft} />
            </>}
            {nextStage.key === "technical_product" && <>
              <StageField label="Demonstrated product assessment" field="productAssessment" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Technical assessment and constraints" field="technicalAssessment" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Defensibility evidence—not feature adjectives" field="defensibility" draft={stageDraft} setDraft={setStageDraft} />
            </>}
            {nextStage.key === "business_economics" && <>
              <StageField label="Business model" field="businessModel" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Economic analysis" field="economicAnalysis" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Load-bearing scaling constraint" field="scalingConstraint" draft={stageDraft} setDraft={setStageDraft} />
            </>}
            {nextStage.key === "anti_memo" && <>
              <StageField label="Strongest causal non-investment case" field="nonInvestmentCase" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Failure mechanism" field="failureMechanism" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Leading failure indicators" field="leadingFailureIndicators" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Evidence that would reverse the Anti-Memo" field="reversalEvidence" draft={stageDraft} setDraft={setStageDraft} />
            </>}
            {nextStage.key === "full_memo" && <>
              <label>Recommendation<select value={stageDraft.recommendation} onChange={(event) => setStageDraft({ ...stageDraft, recommendation: event.target.value })}>{DILIGENCE_RECOMMENDATIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <StageField label="Full investment memo" field="investmentMemo" draft={stageDraft} setDraft={setStageDraft} rows={12} />
              <StageField label="Remaining dissent and unresolved evidence" field="remainingDissent" draft={stageDraft} setDraft={setStageDraft} />
            </>}
            {nextStage.key === "oral_defense" && <>
              <div className="timed-questions">{timedQuestions.map((question, index) => <article key={index}><div className="field-grid two"><label>Question {index + 1}<input required value={question.question} onChange={(event) => updateQuestion(index, { question: event.target.value })} /></label><label>Time limit in seconds<input required type="number" min="30" max="300" value={question.secondsAllowed} onChange={(event) => updateQuestion(index, { secondsAllowed: Number(event.target.value) })} /></label></div><label>Answer summary<textarea required rows={3} value={question.answerSummary} onChange={(event) => updateQuestion(index, { answerSummary: event.target.value })} /></label><label>Concession—or explicit none<textarea required rows={2} value={question.concession} onChange={(event) => updateQuestion(index, { concession: event.target.value })} /></label>{timedQuestions.length > 3 && <button type="button" onClick={() => setTimedQuestions((current) => current.filter((_, questionIndex) => questionIndex !== index))}>Remove question</button>}</article>)}</div>
              <button type="button" disabled={timedQuestions.length >= 12} onClick={() => setTimedQuestions((current) => [...current, emptyQuestion()])}>Add timed question</button>
              <StageField label="What changed in the judgment during defense?" field="changedJudgment" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Unresolved issues after defense" field="unresolvedIssues" draft={stageDraft} setDraft={setStageDraft} />
              <StageField label="Simulated IC decision and rationale" field="simulatedIcDecision" draft={stageDraft} setDraft={setStageDraft} />
            </>}
          </fieldset>

          <fieldset><legend><span>E</span>Evidence discipline for this stage</legend>
            <div className="diligence-sources">{sources.map((source, index) => <article key={index}><div className="field-grid two"><label>Source type<select value={source.sourceType} onChange={(event) => updateSource(index, { sourceType: event.target.value as SourceDraft["sourceType"], sourceReference: "" })}>{DILIGENCE_SOURCE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label><label>{source.sourceType === "Public source" ? "Original source URL" : "Concise private source context"}<input required type={source.sourceType === "Public source" ? "url" : "text"} value={source.sourceReference} onChange={(event) => updateSource(index, { sourceReference: event.target.value })} placeholder={source.sourceType === "Public source" ? "https://" : "No raw messages, names, or transcripts"} /></label></div><label>Observed evidence<textarea required rows={3} value={source.observation} onChange={(event) => updateSource(index, { observation: event.target.value })} /></label><label>Reliability limits<textarea required rows={2} value={source.reliabilityLimits} onChange={(event) => updateSource(index, { reliabilityLimits: event.target.value })} /></label>{sources.length > 1 && <button type="button" onClick={() => setSources((current) => current.filter((_, sourceIndex) => sourceIndex !== index))}>Remove source</button>}</article>)}</div>
            <button type="button" disabled={sources.length >= 12} onClick={() => setSources((current) => [...current, emptySource()])}>Add source</button>
            <StageField label="Known limitations" field="limitations" draft={stageDraft} setDraft={setStageDraft} />
            <StageField label="Strongest disconfirming evidence" field="disconfirmingEvidence" draft={stageDraft} setDraft={setStageDraft} />
            <StageField label="Bounded inference from the evidence" field="inference" draft={stageDraft} setDraft={setStageDraft} />
            <StageField label="Next evidence required" field="nextEvidence" draft={stageDraft} setDraft={setStageDraft} />
            <StageField label="Decision Delta" field="decisionDelta" draft={stageDraft} setDraft={setStageDraft} />
            <label className="privacy-confirmation"><input required type="checkbox" checked={stageDraft.privacyConfirmed} onChange={(event) => setStageDraft({ ...stageDraft, privacyConfirmed: event.target.checked })} />I confirm this stage contains bounded, approved evidence and omits raw transcripts, contact details, secrets, and unapproved confidential material.</label>
          </fieldset>
          <div className="form-commit"><div><span className="lock-mark">↳</span><p><strong>This stage becomes immutable.</strong><br />Only the next defined stage becomes available.</p></div><button className="primary" disabled={busy}>{busy ? "Locking stage…" : `Commit ${nextStage.label}`}</button></div>
        </form>
      )}
    </section>
  );
}

type StageDraft = ReturnType<typeof emptyStageDraft>;

function StageField({ label, field, draft, setDraft, rows = 3 }: {
  label: string;
  field: keyof StageDraft;
  draft: StageDraft;
  setDraft: (value: StageDraft) => void;
  rows?: number;
}) {
  const value = draft[field];
  if (typeof value !== "string") return null;
  return <label>{label}<textarea required rows={rows} value={value} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} /></label>;
}
