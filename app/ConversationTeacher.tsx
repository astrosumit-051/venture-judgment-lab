"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  latestConversationDraft,
  WORKFLOW_CONTRACTS,
  type ConversationWorkflow,
  type LearningConversation,
} from "./conversation";

type ApiResult = { conversation?: LearningConversation; conversations?: LearningConversation[]; error?: string; preserved?: boolean };

const WORKFLOW_GROUPS: Array<{ id: string; label: string; description: string; workflows: ConversationWorkflow[] }> = [
  {
    id: "today",
    label: "Do today’s work",
    description: "Read, reflect, and choose a sustainable plan.",
    workflows: ["reading_response", "history_update", "weekly_plan"],
  },
  {
    id: "judgment",
    label: "Think through a company",
    description: "Capture a first pass, prediction, causal map, or deeper analysis.",
    workflows: ["snapshot_judgment", "forecast", "second_order_map", "founder_evidence_review", "weekly_underwrite", "diligence_case", "diligence_stage"],
  },
  {
    id: "career",
    label: "Source or recruit",
    description: "Work through company discovery, relationships, and opportunities.",
    workflows: ["sourcing_experiment", "sourcing_lead", "sourcing_progress", "recruiting_opportunity", "recruiting_evidence"],
  },
  {
    id: "improve",
    label: "Improve my judgment",
    description: "Request diagnosis, revise, or calibrate completed work.",
    workflows: ["coach_request", "revision_attempt", "calibration_review"],
  },
];

function latestDraft(conversation: LearningConversation | null) {
  return conversation ? latestConversationDraft(conversation) : null;
}

function sentenceCase(value: string): string {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function DraftSummary({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined || value === "") return <span className="draft-empty">Not answered</span>;
  if (Array.isArray(value)) return <div className="draft-list">{value.map((item, index) => <DraftSummary key={index} value={item} depth={depth + 1} />)}</div>;
  if (typeof value === "object") return <dl className={depth === 0 ? "draft-summary" : "draft-nested"}>{Object.entries(value as Record<string, unknown>).filter(([key]) => depth > 0 || !["operation", "recordType"].includes(key)).map(([key, nested]) => (
    <div key={key}><dt>{sentenceCase(key)}</dt><dd><DraftSummary value={nested} depth={depth + 1} /></dd></div>
  ))}</dl>;
  if (typeof value === "boolean") return <span>{value ? "Confirmed" : "No"}</span>;
  return <span>{String(value)}</span>;
}

export function TeacherLauncher({
  activeConversation,
  onOpen,
}: {
  activeConversation?: LearningConversation;
  onOpen: (workflow?: ConversationWorkflow) => void;
}) {
  const [discoveredActive, setDiscoveredActive] = useState<LearningConversation | undefined>(activeConversation);
  useEffect(() => {
    if (activeConversation) { setDiscoveredActive(activeConversation); return; }
    void fetch("/api/lab/conversations", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: ApiResult) => setDiscoveredActive((result.conversations ?? []).find((item) => item.phase === "collecting" || item.phase === "review_ready")))
      .catch(() => undefined);
  }, [activeConversation]);
  const current = activeConversation ?? discoveredActive;
  return <section className="teacher-launcher" aria-label="Conversational Teacher">
    <div><span className="eyebrow coral">Talk to Coach</span><h2>Talk it through. I’ll organize the evidence.</h2><p>Start with rough thoughts. I’ll ask one useful question at a time and turn your answers into a draft you can review.</p></div>
    <div className="teacher-launcher-actions">
      <button className="primary" onClick={() => onOpen(current?.workflow)}>{current ? "Continue conversation" : "Start today’s work"} <span>→</span></button>
      <small>Private transcript · full visible conversation preserved</small>
    </div>
  </section>;
}

export function TeacherEntryStrip({
  workflow,
  advancedVisible,
  onOpen,
  onToggleAdvanced,
}: {
  workflow: ConversationWorkflow;
  advancedVisible: boolean;
  onOpen: () => void;
  onToggleAdvanced: () => void;
}) {
  const contract = WORKFLOW_CONTRACTS[workflow];
  return <div className="teacher-entry-strip">
    <div><span className="eyebrow coral">Conversation first</span><strong>Talk through {contract.label.toLowerCase()}</strong><p>{contract.description}</p></div>
    <div><button className="primary" onClick={onOpen}>Talk to Teacher</button><button className="text-button" onClick={onToggleAdvanced}>{advancedVisible ? "Hide advanced entry" : "Edit structured draft"}</button></div>
  </div>;
}

export function ConversationTeacher({
  initialWorkflow = "snapshot_judgment",
  onCommitted,
}: {
  initialWorkflow?: ConversationWorkflow;
  onCommitted?: () => void | Promise<void>;
}) {
  const [conversations, setConversations] = useState<LearningConversation[]>([]);
  const [conversation, setConversation] = useState<LearningConversation | null>(null);
  const [workflow, setWorkflow] = useState<ConversationWorkflow>(initialWorkflow);
  const [answer, setAnswer] = useState("");
  const [structuredDraft, setStructuredDraft] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(false);

  const draft = useMemo(() => latestDraft(conversation), [conversation]);
  const activeConversations = conversations.filter((item) => item.phase === "collecting" || item.phase === "review_ready");
  const selectedGroup = WORKFLOW_GROUPS.find((group) => group.workflows.includes(workflow)) ?? WORKFLOW_GROUPS[0];
  const learnerTurnCount = conversation?.turns.filter((turn) => turn.role === "learner").length ?? 0;

  async function load() {
    const response = await fetch("/api/lab/conversations", { cache: "no-store" });
    const result = await response.json() as ApiResult;
    if (!response.ok) throw new Error(result.error ?? "Your private conversations could not be loaded.");
    const loaded = result.conversations ?? [];
    setConversations(loaded);
    if (conversation) setConversation(loaded.find((item) => item.id === conversation.id) ?? conversation);
  }

  useEffect(() => {
    setWorkflow(initialWorkflow);
  }, [initialWorkflow]);

  useEffect(() => {
    void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Your private conversations could not be loaded."));
  }, []);

  useEffect(() => {
    if (draft) setStructuredDraft(JSON.stringify(draft.commitBody, null, 2));
  }, [draft]);

  async function start() {
    setBusy(true); setError(""); setRetryable(false);
    try {
      const response = await fetch("/api/lab/conversations", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflow }),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.conversation) throw new Error(result.error ?? "The conversation could not begin.");
      setConversation(result.conversation);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The conversation could not begin.");
    } finally { setBusy(false); }
  }

  async function sendTurn(event?: FormEvent<HTMLFormElement>, options?: { retry?: boolean; draftOverride?: Record<string, unknown> }) {
    event?.preventDefault();
    if (!conversation || (!answer.trim() && !options?.retry && !options?.draftOverride)) return;
    setBusy(true); setError(""); setRetryable(false);
    try {
      const response = await fetch(`/api/lab/conversations/${conversation.id}/turns`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: options?.draftOverride ? "I edited the structured draft directly. Recheck it without adding facts." : answer.trim(),
          retry: options?.retry === true,
          ...(options?.draftOverride ? { draftOverride: options.draftOverride } : {}),
        }),
      });
      const result = await response.json() as ApiResult;
      if (result.conversation) setConversation(result.conversation);
      if (!response.ok) {
        if (result.preserved) { setAnswer(""); setRetryable(true); }
        throw new Error(result.error ?? "The teacher could not continue. Your answer remains preserved.");
      }
      setAnswer("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The teacher could not continue. Your answer remains preserved.");
    } finally { setBusy(false); }
  }

  async function saveStructuredDraft() {
    try {
      const parsed = JSON.parse(structuredDraft) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The structured draft must be a JSON object.");
      await sendTurn(undefined, { draftOverride: parsed as Record<string, unknown> });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The structured draft is not valid JSON.");
    }
  }

  async function commit() {
    if (!conversation) return;
    setBusy(true); setError(""); setRetryable(false);
    try {
      const response = await fetch(`/api/lab/conversations/${conversation.id}/commit`, { method: "POST" });
      const result = await response.json() as ApiResult;
      if (!response.ok) throw new Error(result.error ?? "The confirmed draft could not be preserved.");
      if (result.conversation) setConversation(result.conversation);
      await load();
      await onCommitted?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The confirmed draft could not be preserved.");
    } finally { setBusy(false); }
  }

  async function abandon() {
    if (!conversation) return;
    setBusy(true); setError(""); setRetryable(false);
    try {
      const response = await fetch(`/api/lab/conversations/${conversation.id}/abandon`, { method: "POST" });
      const result = await response.json() as ApiResult;
      if (!response.ok) throw new Error(result.error ?? "The conversation could not be closed.");
      setConversation(null);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The conversation could not be closed."); }
    finally { setBusy(false); }
  }

  if (!conversation) return <section className="conversation-teacher">
    <div className="conversation-intro"><div><span className="eyebrow coral">Talk to Coach</span><h2>What do you want to do?</h2><p>Choose a goal—not a form. You can answer naturally, change your mind, and review everything before it becomes part of your record.</p></div><div className="provider-disclosure"><strong>Private and evidence-first</strong><p>Your conversation is sent to GPT-5.6 Luna and preserved privately in the Lab. Do not enter passwords, raw correspondence, or unapproved confidential material.</p></div></div>
    {error && <div className="conversation-error" role="alert">{error}</div>}
    {activeConversations.length > 0 && <div className="conversation-resume"><span className="eyebrow">Continue where you left off</span>{activeConversations.map((item) => <button key={item.id} onClick={() => setConversation(item)}><span>{WORKFLOW_CONTRACTS[item.workflow].label}</span><small>{item.phase.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleDateString()}</small></button>)}</div>}
    <div className="goal-picker" aria-label="Choose a goal">{WORKFLOW_GROUPS.map((group) => <button key={group.id} className={selectedGroup.id === group.id ? "selected" : ""} onClick={() => setWorkflow(group.workflows[0])}><strong>{group.label}</strong><small>{group.description}</small></button>)}</div>
    <section className="workflow-choice"><div><span className="eyebrow">Choose a starting point</span><h3>{selectedGroup.label}</h3></div><div className="workflow-picker">{selectedGroup.workflows.map((id) => <button key={id} className={workflow === id ? "selected" : ""} onClick={() => setWorkflow(id)}><strong>{WORKFLOW_CONTRACTS[id].label}</strong><small>{WORKFLOW_CONTRACTS[id].description}</small></button>)}</div></section>
    <div className="teacher-start-row"><div><strong>{WORKFLOW_CONTRACTS[workflow].label}</strong><span>{WORKFLOW_CONTRACTS[workflow].description}</span></div><button className="primary teacher-start" disabled={busy} onClick={() => void start()}>{busy ? "Opening…" : "Start conversation"} <span>→</span></button></div>
  </section>;

  return <section className="conversation-teacher active-conversation">
    <header className="conversation-head"><div><span className="eyebrow coral">{WORKFLOW_CONTRACTS[conversation.workflow].label}</span><h2>{conversation.title}</h2><p>Your full conversation is saved privately.</p></div><div><button className="text-button" disabled={busy || conversation.phase === "committed"} onClick={() => void abandon()}>Leave this draft</button><button className="text-button" onClick={() => setConversation(null)}>Choose another goal</button></div></header>
    <ol className="conversation-steps" aria-label="Conversation progress"><li className="current"><span>1</span><strong>Talk</strong><small>Answer naturally</small></li><li className={conversation.phase === "review_ready" || conversation.phase === "committed" ? "current" : ""}><span>2</span><strong>Review</strong><small>Check what I heard</small></li><li className={conversation.phase === "committed" ? "current" : ""}><span>3</span><strong>Preserve</strong><small>Confirm the record</small></li></ol>
    {error && <div className="conversation-error" role="alert"><span>{error}</span>{retryable && <button onClick={() => void sendTurn(undefined, { retry: true })} disabled={busy}>Try again</button>}</div>}
    <details className="conversation-so-far" open={learnerTurnCount < 2}><summary>Conversation so far · {conversation.turns.filter((turn) => turn.role !== "system").length} turns</summary><div className="transcript" aria-live="polite">{conversation.turns.map((turn) => <article key={turn.id} className={`turn turn-${turn.role}`}><span>{turn.role === "teacher" ? "Coach" : turn.role === "learner" ? "You" : "Preserved"}</span><p>{turn.visibleText}</p><time>{new Date(turn.createdAt).toLocaleString()}</time></article>)}</div></details>
    {(conversation.phase === "collecting" || conversation.phase === "review_ready") && <form className="conversation-composer" onSubmit={(event) => void sendTurn(event)}><div className="composer-guidance"><span>Question {learnerTurnCount + 1}</span><p>Use rough notes or complete sentences. If I misunderstood, just say “that isn’t what I meant” and correct it.</p></div><label htmlFor="teacher-answer"><span>Your answer</span><textarea id="teacher-answer" rows={4} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type what you’re thinking…" /></label><button className="primary" disabled={busy || !answer.trim()}>{busy ? "Listening…" : "Send"} <span>→</span></button></form>}
    {draft && <section className="conversation-review"><div className="review-heading"><div><span className="eyebrow coral">Here’s what I heard</span><h3>Review before anything is preserved.</h3></div><span className={`review-state ${conversation.phase}`}>{conversation.phase === "review_ready" ? "Ready for your confirmation" : "Still gathering evidence"}</span></div>
      <div className="record-preview"><span>Draft record</span><strong>{WORKFLOW_CONTRACTS[conversation.workflow].label}</strong><small>Nothing below is permanent yet.</small></div>
      <DraftSummary value={draft.commitBody} />
      {(draft.missingRequirements.length > 0 || draft.contradictions.length > 0) && <div className="review-gaps">{draft.missingRequirements.length > 0 && <div><strong>Still needed</strong><ul>{draft.missingRequirements.map((item) => <li key={item}>{item}</li>)}</ul></div>}{draft.contradictions.length > 0 && <div><strong>Resolve these contradictions</strong><ul>{draft.contradictions.map((item) => <li key={item}>{item}</li>)}</ul></div>}</div>}
      <details className="structured-editor"><summary>Edit structured draft</summary><p>Advanced escape hatch. The teacher will recheck your edits against the same evidence contract.</p><textarea rows={18} value={structuredDraft} onChange={(event) => setStructuredDraft(event.target.value)} spellCheck={false} /><button className="secondary" disabled={busy} onClick={() => void saveStructuredDraft()}>Save and recheck draft</button></details>
      {conversation.phase === "review_ready" && !draft.missingRequirements.length && !draft.contradictions.length && <div className="confirm-preserve"><div><strong>This becomes immutable.</strong><p>The full visible transcript stays linked to the resulting Lab artifact. Later evidence appends; it never rewrites this record.</p></div><button className="primary" disabled={busy} onClick={() => void commit()}>{busy ? "Preserving…" : "Confirm and preserve"}</button></div>}
    </section>}
  </section>;
}

export function ConversationHistory() {
  const [conversations, setConversations] = useState<LearningConversation[]>([]);
  useEffect(() => { void fetch("/api/lab/conversations", { cache: "no-store" }).then((response) => response.json()).then((result: ApiResult) => setConversations(result.conversations ?? [])); }, []);
  const committed = conversations.filter((item) => item.phase === "committed");
  if (!committed.length) return null;
  return <section className="conversation-history"><div className="section-heading"><div><span className="eyebrow coral">Learning Conversations</span><h3>Full visible transcripts</h3></div><span className="quiet">Hidden model reasoning is never stored</span></div>{committed.map((item) => <details key={item.id}><summary><span><strong>{WORKFLOW_CONTRACTS[item.workflow].label}</strong><small>{new Date(item.createdAt).toLocaleString()} · linked artifact {item.committedRecordId}</small></span><span>{item.turns.filter((turn) => turn.role !== "system").length} turns</span></summary><div className="transcript">{item.turns.map((turn) => <article key={turn.id} className={`turn turn-${turn.role}`}><span>{turn.role === "teacher" ? "Teacher" : turn.role === "learner" ? "You" : "Preserved"}</span><p>{turn.visibleText}</p></article>)}</div></details>)}</section>;
}
