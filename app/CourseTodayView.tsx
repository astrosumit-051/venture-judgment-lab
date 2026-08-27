"use client";

import { useState } from "react";
import {
  ArrowRight, BookOpenText, Briefcase, CaretDown, Check, Circle,
  Clock, Compass, Crosshair, LockKey, Sparkle, Target, TrendUp,
} from "@phosphor-icons/react";
import type { AssignmentReading } from "./DailyAssignmentView";
import type { CourseRecord, CourseTodayState, PracticeDay, PracticeProgress } from "./courseViewTypes";

type Workflow = "reading_response" | "sourcing_lead" | "snapshot_judgment" | "forecast" | "recruiting_evidence" | "history_update" | "coach_request";

type Props = CourseTodayState & {
  records: CourseRecord[];
  loading: boolean;
  error: string;
  visualPreview: boolean;
  onRetry: () => void;
  onOpenBrief: () => void;
  onWorkflow: (workflow: Workflow, openingMessage?: string) => void;
};

type Company = { id: string; name: string; observedProduct: string; whyNow: string; strongestSignal: string; keyUnknown: string };

const PREVIEW_PROGRESS: PracticeProgress = {
  readings: { required: 4, completed: 4, state: "complete" },
  scanAndJudge: { requiredCompanies: 3, discoveredCompanies: 3, snapshotLocked: false, state: "in_progress" },
  forecast: { required: 1, completed: 0, state: "not_started" },
  recruiting: { required: 1, completed: 0, state: "not_started" },
  preserve: { required: 1, completed: 0, state: "not_started" },
};

const PREVIEW_DAY: PracticeDay = {
  id: "visual-preview-day",
  learnerDate: "2026-08-24",
  curriculumDay: 1,
  rotationWeek: 1,
  phase: "breadth",
  sector: "AI and data systems",
  rotationTitle: "AI & Data Systems Rotation",
  teachingPurpose: "Build conviction in data infrastructure and AI tooling. This rep develops signal on technical depth, defensibility, and early enterprise traction.",
  whyToday: [
    "Map a live sector before narrowing your focus.",
    "Separate observed product evidence from a compelling story.",
    "Commit a falsifiable view before Luna challenges it.",
  ],
  sourcingPrompt: {
    surface: "Recent university demo days, developer launches, and open-source contributor ecosystems.",
    hypothesis: "The next durable AI data layer will emerge where evaluation or governance becomes part of the production workflow.",
    companyNamesWithheld: true,
  },
  checkpoints: [
    { id: "readings", label: "Read four curated readings", minutes: 55 },
    { id: "scan_and_judge", label: "Scan three early-stage companies, then choose and judge one", minutes: 25 },
    { id: "forecast", label: "Commit one falsifiable forecast", minutes: 10 },
    { id: "recruiting", label: "Complete one small recruiting action", minutes: 10 },
    { id: "preserve", label: "Review and preserve", minutes: 5 },
  ],
  totalMinutes: 105,
};

const PREVIEW_COMPANIES: Company[] = [
  { id: "preview-1", name: "Mercury", observedProduct: "Real-time data quality monitoring for ML pipelines", whyNow: "GenAI adoption drives data reliability needs", strongestSignal: "Pilot conversions with data platform teams", keyUnknown: "Can they expand beyond early data teams?" },
  { id: "preview-2", name: "TensorWave", observedProduct: "High-throughput inference serving for model teams", whyNow: "Inference demand outgrows general-purpose clouds", strongestSignal: "Large traction with production deployments", keyUnknown: "Can they win versus hyperscaler GPU roadmaps?" },
  { id: "preview-3", name: "Nimbus", observedProduct: "Vector database built for RAG at scale", whyNow: "RAG usage requires better recall, latency, and cost", strongestSignal: "Design partner shipped in three weeks", keyUnknown: "Can they sustain accuracy without huge infra costs?" },
];

function text(payload: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) if (typeof payload[key] === "string" && String(payload[key]).trim()) return String(payload[key]);
  return fallback;
}

function companiesFrom(records: CourseRecord[], practiceDayId?: string): Company[] {
  return records.filter((record) => record.recordType === "sourcing_lead" && record.payload.practiceDayId === practiceDayId).slice(0, 3).map((record) => ({
    id: record.id,
    name: text(record.payload, ["company", "companyName"], record.title),
    observedProduct: text(record.payload, ["observedProduct", "observedSignal"], "Not yet preserved"),
    whyNow: text(record.payload, ["whyNow", "qualificationThesis"], "Not yet preserved"),
    strongestSignal: text(record.payload, ["strongestSignal", "ventureMechanism"], "Not yet preserved"),
    keyUnknown: text(record.payload, ["keyUnknown", "disqualifier"], "Not yet preserved"),
  }));
}

const STEP_META = [
  { id: "readings", label: "Readings", detail: "Four sources · 55 minutes", icon: BookOpenText },
  { id: "scan", label: "Scan companies", detail: "Discover three · Judge one · 25 minutes", icon: Compass },
  { id: "forecast", label: "Forecast", detail: "One falsifiable prediction · 10 minutes", icon: TrendUp },
  { id: "recruiting", label: "Recruiting", detail: "One small career action · 10 minutes", icon: Briefcase },
  { id: "preserve", label: "Review & preserve", detail: "Keep the original and the update · 5 minutes", icon: LockKey },
] as const;

function stateFor(stepId: string, progress: PracticeProgress) {
  if (stepId === "scan") return progress.scanAndJudge.state;
  return progress[stepId as "readings" | "forecast" | "recruiting" | "preserve"].state;
}

export function CourseTodayView(props: Props) {
  const day = props.visualPreview ? PREVIEW_DAY : props.practiceDay;
  const progress = props.visualPreview ? PREVIEW_PROGRESS : props.progress;
  const companies = props.visualPreview ? PREVIEW_COMPANIES : companiesFrom(props.records, day?.id);
  const snapshotLocked = Boolean(progress?.scanAndJudge.snapshotLocked);
  const firstIncomplete = progress ? STEP_META.find((step) => stateFor(step.id, progress) !== "complete")?.id ?? "preserve" : "readings";
  const [expanded, setExpanded] = useState<string>(props.visualPreview ? "scan" : firstIncomplete);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => companies.at(-1)?.id ?? "");
  const [judgment, setJudgment] = useState(() => day && typeof window !== "undefined" ? window.localStorage.getItem(`vc-lab-causal-draft:${day.id}`) ?? "" : "");
  const [draftNotice, setDraftNotice] = useState("");
  const effectiveSelectedCompanyId = selectedCompanyId || companies.at(-1)?.id || "";

  function saveDraft() {
    if (!day) return;
    window.localStorage.setItem(`vc-lab-causal-draft:${day.id}`, judgment);
    setDraftNotice("Draft saved on this Mac. Nothing was preserved yet.");
  }

  if (props.loading) return <div className="course-state" role="status"><Clock size={24} /><h2>Preparing today’s route…</h2><p>Checking the private course record on this Mac.</p></div>;
  if (props.error && !day) return <div className="course-state course-state-error" role="alert"><Crosshair size={24} /><h2>Today’s route is not connected yet.</h2><p>{props.error}</p><div><button className="primary" onClick={props.onRetry}>Try again</button><button className="quiet-button" onClick={() => props.onWorkflow("snapshot_judgment")}>Work with Luna instead</button></div></div>;
  if (!day || !progress) return <div className="course-state"><Target size={24} /><span className="eyebrow coral">Course-first Lab ready</span><h2>Day 1 has not started.</h2><p>The new progression is installed, but no Curriculum Epoch has been activated. Starting Day 1 remains a separate, deliberate action so the record begins cleanly.</p></div>;

  const readings = props.assignment?.brief?.readings ?? [];
  return <div className="course-today-layout">
    <div className="course-route">
      <header className="route-intro"><span className="eyebrow coral">Today’s route · {day.totalMinutes} minutes</span>{props.visualPreview && <span className="preview-disclosure">Design preview · not learner evidence</span>}<h2>{day.rotationTitle}</h2><p>{day.teachingPurpose}</p>{!props.visualPreview && <div><span>Day {day.curriculumDay}</span><span>Week {day.rotationWeek} of 12</span><span>{day.phase}</span></div>}</header>
      <div className="checkpoint-course" aria-label="Today’s ordered checkpoints">
        {STEP_META.map((step, index) => {
          const state = stateFor(step.id, progress);
          const open = expanded === step.id;
          const Icon = step.icon;
          return <article className={`course-step ${state} ${open ? "expanded" : ""}`} key={step.id}>
            <button className="course-step-header" aria-expanded={open} onClick={() => setExpanded(open ? "" : step.id)}>
              <span className="step-line"><span className="step-marker">{state === "complete" ? <Check weight="bold" /> : String(index + 1).padStart(2, "0")}</span></span>
              <Icon className="step-icon" size={19} />
              <span><strong>{step.label}</strong><small>{step.detail}</small></span>
              <span className={`step-state ${state}`}>{state.replaceAll("_", " ")}</span><CaretDown className="step-chevron" size={16} />
            </button>
            {open && <div className="course-step-body">
              {step.id === "readings" && <ReadingCheckpoint readings={readings} preview={props.visualPreview} onOpenBrief={props.onOpenBrief} />}
              {step.id === "scan" && <ScanCheckpoint companies={companies} selectedCompanyId={effectiveSelectedCompanyId} onSelect={setSelectedCompanyId} day={day} judgment={judgment} setJudgment={setJudgment} draftNotice={draftNotice} onSaveDraft={saveDraft} onWorkflow={props.onWorkflow} snapshotLocked={snapshotLocked} preview={props.visualPreview} />}
              {step.id === "forecast" && <ActionCheckpoint title="Commit a prediction that can prove you wrong." body="Name the outcome, horizon, probability, resolution source, and the evidence that would move you." action="Open Forecast" onClick={() => props.onWorkflow("forecast")} complete={state === "complete"} />}
              {step.id === "recruiting" && <ActionCheckpoint title="Move the job search forward by one observable step." body="Preserve a verified opportunity, interaction, application action, or interview practice—not an intention." action="Open recruiting action" onClick={() => props.onWorkflow("recruiting_evidence")} complete={state === "complete"} />}
              {step.id === "preserve" && <ActionCheckpoint title="Review the route before closing the day." body="The route can close only after all five evidence gates are satisfied. Originals stay and later revisions accumulate beside them." action="Review today’s record" onClick={props.onOpenBrief} complete={state === "complete"} />}
            </div>}
          </article>;
        })}
      </div>
    </div>
    <aside className="why-today">
      <span className="eyebrow">Why today</span><p>{props.visualPreview ? "Data infrastructure choices shape AI product outcomes and margins. This rotation builds your ability to spot durable moats in data, compute, and developer tooling." : day.teachingPurpose}</p>
      <div>{day.whyToday.map((reason, index) => { const Icon = [Target, Compass, TrendUp][index] ?? Circle; return <article key={reason}><Icon size={19} /><span>{reason}</span></article>; })}</div>
      <section className={snapshotLocked ? "luna-boundary unlocked" : "luna-boundary"}><Sparkle size={21} weight="fill" /><span className="eyebrow">Ask Luna (after lock)</span><h4>{snapshotLocked ? "Your judgment is preserved." : "Your judgment comes first. Lock it before asking."}</h4><p>{snapshotLocked ? "Luna can now identify the weakest causal bridge and press for disconfirmation." : "Luna gives pointed feedback. She does not do your work for you."}</p><button className="secondary" disabled={!snapshotLocked} onClick={() => props.onWorkflow("coach_request")}>{snapshotLocked ? "Ask Luna to challenge it" : "Ask Luna"}<ArrowRight size={15} /></button></section>
    </aside>
  </div>;
}

function ReadingCheckpoint({ readings, preview, onOpenBrief }: { readings: AssignmentReading[]; preview: boolean; onOpenBrief: () => void }) {
  const items = preview ? [
    { title: "The new AI infrastructure stack", lane: "Current sector signal", assignedSection: "Market map and emerging control points", teachingPurpose: "Locate where new bottlenecks are forming." },
    { title: "The power of market pull", lane: "Durable investing memo", assignedSection: "Demand before product", teachingPurpose: "Distinguish adoption evidence from technical novelty." },
    { title: "Aviation safety and incident learning", lane: "Cross-domain input", assignedSection: "Near-miss reporting systems", teachingPurpose: "Borrow a causal model for AI evaluation." },
    { title: "Writing an investment point of view", lane: "Career and freeflow", assignedSection: "Claims, evidence, and disconfirmation", teachingPurpose: "Turn observation into a defensible view." },
  ] : readings;
  if (!items.length) return <div className="checkpoint-empty"><p>No verified four-reading Brief is attached to this Practice Day.</p><button className="quiet-button" onClick={onOpenBrief}>Inspect assignment status</button></div>;
  return <div className="route-readings">{items.map((reading, index) => <article key={`${reading.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{reading.lane}</small><strong>{reading.title}</strong><p><b>Read</b> {reading.assignedSection}</p><p><b>Purpose</b> {reading.teachingPurpose}</p></div></article>)}<button className="quiet-button" onClick={onOpenBrief}>Open readings and first-pass responses</button></div>;
}

function ScanCheckpoint({ companies, selectedCompanyId, onSelect, day, judgment, setJudgment, draftNotice, onSaveDraft, onWorkflow, snapshotLocked, preview = false }: { companies: Company[]; selectedCompanyId: string; onSelect: (id: string) => void; day: PracticeDay; judgment: string; setJudgment: (value: string) => void; draftNotice: string; onSaveDraft: () => void; onWorkflow: Props["onWorkflow"]; snapshotLocked: boolean; preview?: boolean }) {
  return <div className="scan-checkpoint">
    {preview ? <p className="scan-instruction">Compare three early-stage companies in AI/data infrastructure. Select one and write your causal judgment.</p> : <div className="discovery-brief"><span className="eyebrow">Independent discovery brief</span><p><strong>Surface</strong>{day.sourcingPrompt.surface}</p><p><strong>Hypothesis</strong>{day.sourcingPrompt.hypothesis}</p><small>Company names are intentionally withheld. Find all three yourself.</small></div>}
    {companies.length < 3 ? <div className="checkpoint-empty"><p>{companies.length} of 3 independently discovered companies preserved. Three are required before the Snapshot can lock.</p><button className="primary" onClick={() => onWorkflow("sourcing_lead")}>Preserve company {companies.length + 1}</button></div> : <>
      <div className="company-comparison" role="table" aria-label="Three-company comparison">
        <div className="comparison-row comparison-head" role="row"><span role="columnheader">Compare</span>{companies.map((company) => <button key={company.id} className={selectedCompanyId === company.id ? "selected" : ""} onClick={() => onSelect(company.id)} role="columnheader"><span className="select-dot">{selectedCompanyId === company.id && <Check weight="bold" />}</span>{company.name}</button>)}</div>
        {(["observedProduct", "whyNow", "strongestSignal", "keyUnknown"] as const).map((key) => <div className="comparison-row" role="row" key={key}><strong role="rowheader">{{ observedProduct: "Observed product", whyNow: "Why now", strongestSignal: "Strongest signal", keyUnknown: "Key unknown" }[key]}</strong>{companies.map((company) => <p key={company.id} className={selectedCompanyId === company.id ? "selected" : ""} role="cell">{company[key]}</p>)}</div>)}
      </div>
      <section className="causal-judgment"><span className="eyebrow coral">Your causal judgment {preview ? "(Independent First Pass)" : `· ${companies.find((company) => company.id === selectedCompanyId)?.name}`}</span><label htmlFor="causal-judgment-draft">{preview ? `Why will ${companies.find((company) => company.id === selectedCompanyId)?.name} win or lose over the next 12–18 months?` : "Why could this company become important—and what must be true?"}</label><textarea id="causal-judgment-draft" rows={3} value={judgment} disabled={snapshotLocked} onChange={(event) => setJudgment(event.target.value)} placeholder={preview ? "Write your causal thesis. Be specific about mechanism, timing, and what must be true." : "Write the causal chain in your own words before coaching…"} /><small>{draftNotice || "Lock to preserve your independent view. You can’t change it after locking."}</small><div><button className="primary" disabled={!judgment.trim() || snapshotLocked} onClick={() => { onSaveDraft(); onWorkflow("snapshot_judgment", `Selected company: ${companies.find((company) => company.id === selectedCompanyId)?.name}. Independent causal judgment: ${judgment.trim()}`); }}>Lock judgment <LockKey size={15} /></button><button className="quiet-button" disabled={snapshotLocked} onClick={onSaveDraft}>Save draft</button></div></section>
    </>}
  </div>;
}

function ActionCheckpoint({ title, body, action, onClick, complete }: { title: string; body: string; action: string; onClick: () => void; complete: boolean }) {
  return <div className="action-checkpoint"><div>{complete ? <Check size={22} weight="bold" /> : <Circle size={22} />}<span><strong>{title}</strong><p>{body}</p></span></div><button className="quiet-button" onClick={onClick}>{complete ? "Review preserved evidence" : action}<ArrowRight size={14} /></button></div>;
}
