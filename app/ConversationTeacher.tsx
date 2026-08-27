"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  latestConversationDraft,
  WORKFLOW_CONTRACTS,
  type ConversationWorkflow,
  type LearningConversation,
} from "./conversation";

type ApiResult = { conversation?: LearningConversation; conversations?: LearningConversation[]; error?: string; preserved?: boolean };
type RouteResult =
  | { kind: "start"; workflow: ConversationWorkflow; label: string; explanation: string }
  | { kind: "answer"; message: string; suggestedWorkflow?: ConversationWorkflow }
  | { kind: "clarify"; question: string; candidates: ConversationWorkflow[] };

const NEXT_ACTIONS: Partial<Record<ConversationWorkflow, string>> = {
  reading_response: "Continue the Daily Judgment Loop with a Snapshot Judgment when you are ready.",
  sourcing_lead: "A qualified Sourcing Lead can become a Snapshot Judgment after you preserve the first evidence.",
  snapshot_judgment: "Add a Forecast next if one claim in this Snapshot can be resolved by a specific date.",
  forecast: "Return at the resolution date; later evidence will score the original odds without rewriting them.",
  weekly_underwrite: "Use the Decision Delta to choose whether this company deserves a Diligence Case.",
  recruiting_opportunity: "Preserve only observable application or interaction evidence as it occurs.",
  coach_request: "Wait for the diagnostic feedback, then make a genuine Revision Attempt if the evidence changes.",
};

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

export function ConversationTeacher({
  initialWorkflow = "snapshot_judgment",
  initialConversationId,
  directStart = false,
  initialOpeningMessage = "",
  onCommitted,
}: {
  initialWorkflow?: ConversationWorkflow;
  initialConversationId?: string | null;
  directStart?: boolean;
  initialOpeningMessage?: string;
  onCommitted?: () => void | Promise<void>;
}) {
  const [conversations, setConversations] = useState<LearningConversation[]>([]);
  const [conversation, setConversation] = useState<LearningConversation | null>(null);
  const [workflow, setWorkflow] = useState<ConversationWorkflow>(initialWorkflow);
  const [routeMessage, setRouteMessage] = useState("");
  const [routeReply, setRouteReply] = useState("");
  const [routeCandidates, setRouteCandidates] = useState<ConversationWorkflow[]>([]);
  const [routeExplanation, setRouteExplanation] = useState("");
  const [answer, setAnswer] = useState("");
  const [structuredDraft, setStructuredDraft] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(false);

  const draft = useMemo(() => latestDraft(conversation), [conversation]);
  const activeConversations = conversations.filter((item) => item.phase === "collecting" || item.phase === "review_ready");
  const learnerTurnCount = conversation?.turns.filter((turn) => turn.role === "learner").length ?? 0;

  async function load() {
    const response = await fetch("/api/lab/conversations", { cache: "no-store" });
    const result = await response.json() as ApiResult;
    if (!response.ok) throw new Error(result.error ?? "Your private conversations could not be loaded.");
    const loaded = result.conversations ?? [];
    setConversations(loaded);
    if (conversation) setConversation(loaded.find((item) => item.id === conversation.id) ?? conversation);
    else if (initialConversationId) setConversation(loaded.find((item) => item.id === initialConversationId) ?? null);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Your private conversations could not be loaded."));
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when the Teacher surface opens.
  }, []);

  useEffect(() => {
    if (!draft) return;
    const timer = window.setTimeout(() => setStructuredDraft(JSON.stringify(draft.commitBody, null, 2)), 0);
    return () => window.clearTimeout(timer);
  }, [draft]);

  async function start(selectedWorkflow = workflow, openingMessage = "", explanation = "") {
    setBusy(true); setError(""); setRetryable(false);
    setWorkflow(selectedWorkflow); setRouteExplanation(explanation);
    try {
      const response = await fetch("/api/lab/conversations", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ workflow: selectedWorkflow, ...(openingMessage ? { openingMessage } : {}) }),
      });
      const result = await response.json() as ApiResult;
      if (result.conversation) setConversation(result.conversation);
      if (!response.ok || !result.conversation) {
        if (result.preserved) { setRouteMessage(""); setRetryable(true); }
        throw new Error(result.error ?? "The conversation could not begin.");
      }
      setRouteMessage(""); setRouteReply(""); setRouteCandidates([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The conversation could not begin.");
    } finally { setBusy(false); }
  }

  async function routeIntent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = routeMessage.trim();
    if (!message) return;
    setBusy(true); setError(""); setRouteReply(""); setRouteCandidates([]);
    try {
      const response = await fetch("/api/lab/conversations/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, source: "today" }),
      });
      const result = await response.json() as RouteResult & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Luna could not choose a starting point.");
      if (result.kind === "start") {
        setBusy(false);
        await start(result.workflow, message, result.explanation);
        return;
      }
      if (result.kind === "answer") {
        setRouteReply(result.message);
        setRouteCandidates(result.suggestedWorkflow ? [result.suggestedWorkflow] : []);
      } else {
        setRouteReply(result.question);
        setRouteCandidates(result.candidates.slice(0, 3));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Luna could not choose a starting point.");
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

  if (!conversation) return <section className="conversation-teacher conversation-home">
    <div className="conversation-intro"><div><span className="eyebrow coral">Luna · Conversational Teacher</span><h2>What are you working through?</h2><p>Write naturally. Luna will choose the right Lab capability, ask one useful question at a time, and show what it heard before anything becomes permanent.</p></div></div>
    {error && <div className="conversation-error" role="alert">{error}</div>}
    {directStart && <div className="route-reply direct-capability"><span className="eyebrow coral">Ready to use</span><p><strong>{WORKFLOW_CONTRACTS[workflow].label}</strong> · {WORKFLOW_CONTRACTS[workflow].description}</p>{initialOpeningMessage && <small>Your local route draft will become the preserved opening thought when you start.</small>}<button className="primary" disabled={busy} onClick={() => void start(workflow, initialOpeningMessage)}>{busy ? "Opening…" : "Start this conversation"}</button></div>}
    <form className="intent-composer" onSubmit={(event) => void routeIntent(event)}><label htmlFor="luna-intent"><span>Talk to Luna</span><textarea id="luna-intent" rows={5} value={routeMessage} onChange={(event) => setRouteMessage(event.target.value)} placeholder="Try: I found a startup at demo day, help me judge a company, or what should I do today?" /></label><button className="primary" disabled={busy || !routeMessage.trim()}>{busy ? "Finding the right path…" : "Continue"} <span>→</span></button><small>Luna can organize and preserve your reasoning. It cannot contact anyone or submit anything.</small></form>
    {routeReply && <div className="route-reply" role="status"><span className="eyebrow coral">One quick clarification</span><p>{routeReply}</p>{routeCandidates.length > 0 && <div>{routeCandidates.map((candidate) => <button key={candidate} onClick={() => void start(candidate, routeMessage, `You chose ${WORKFLOW_CONTRACTS[candidate].label} after Luna asked for clarification.`)}><strong>{WORKFLOW_CONTRACTS[candidate].label}</strong><small>{WORKFLOW_CONTRACTS[candidate].description}</small></button>)}</div>}</div>}
    <div className="conversation-prompts" aria-label="Example things to ask"><button onClick={() => setRouteMessage("What should I do today?")}>What should I do today?</button><button onClick={() => setRouteMessage("I found a startup and want to preserve how I discovered it")}>I found a company</button><button onClick={() => setRouteMessage("Help me make a falsifiable forecast")}>Make a forecast</button></div>
    {activeConversations.length > 0 && <div className="conversation-resume"><span className="eyebrow">Continue where you left off</span>{activeConversations.map((item) => <button key={item.id} onClick={() => setConversation(item)}><span>{WORKFLOW_CONTRACTS[item.workflow].label}</span><small>{item.phase.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleDateString()}</small></button>)}</div>}
  </section>;

  return <section className="conversation-teacher active-conversation">
    <header className="conversation-head"><div><span className="eyebrow coral">{WORKFLOW_CONTRACTS[conversation.workflow].label}</span><h2>{conversation.title}</h2><p>Your full conversation is saved privately.</p></div><div><button className="text-button" disabled={busy || conversation.phase === "committed"} onClick={() => void abandon()}>Leave this draft</button><button className="text-button" onClick={() => setConversation(null)}>Start something else</button></div></header>
    <div className="tool-invocation"><span>Using</span><strong>{WORKFLOW_CONTRACTS[conversation.workflow].label}</strong><p>{routeExplanation || WORKFLOW_CONTRACTS[conversation.workflow].description}</p></div>
    <ol className="conversation-steps" aria-label="Conversation progress"><li className="current"><span>1</span><strong>Talk</strong><small>Answer naturally</small></li><li className={conversation.phase === "review_ready" || conversation.phase === "committed" ? "current" : ""}><span>2</span><strong>Review</strong><small>Check what I heard</small></li><li className={conversation.phase === "committed" ? "current" : ""}><span>3</span><strong>Preserve</strong><small>Confirm the record</small></li></ol>
    {error && <div className="conversation-error" role="alert"><span>{error}</span>{retryable && <button onClick={() => void sendTurn(undefined, { retry: true })} disabled={busy}>Try again</button>}</div>}
    <details className="conversation-so-far" open={learnerTurnCount < 2}><summary>Conversation so far · {conversation.turns.filter((turn) => turn.role !== "system").length} turns</summary><div className="transcript" aria-live="polite">{conversation.turns.map((turn) => <article key={turn.id} className={`turn turn-${turn.role}`}><span>{turn.role === "teacher" ? "Coach" : turn.role === "learner" ? "You" : "Preserved"}</span><p>{turn.visibleText}</p><time>{new Date(turn.createdAt).toLocaleString()}</time></article>)}</div></details>
    {(conversation.phase === "collecting" || conversation.phase === "review_ready") && <form className="conversation-composer" onSubmit={(event) => void sendTurn(event)}><div className="composer-guidance"><span>Question {learnerTurnCount + 1}</span><p>Use rough notes or complete sentences. If I misunderstood, just say “that isn’t what I meant” and correct it.</p></div><label htmlFor="teacher-answer"><span>Your answer</span><textarea id="teacher-answer" rows={4} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type what you’re thinking…" /></label><button className="primary" disabled={busy || !answer.trim()}>{busy ? "Listening…" : "Send"} <span>→</span></button></form>}
    {conversation.phase === "committed" && <div className="next-action"><span className="eyebrow coral">Preserved</span><strong>Your record and full visible transcript are safe.</strong><p>{NEXT_ACTIONS[conversation.workflow] ?? "Return to Today and tell Luna what you want to work through next."}</p></div>}
    {draft && <section className="conversation-review"><div className="review-heading"><div><span className="eyebrow coral">Here’s what I heard</span><h3>Review before anything is preserved.</h3></div><span className={`review-state ${conversation.phase}`}>{conversation.phase === "review_ready" ? "Ready for your confirmation" : conversation.phase === "committed" ? "Preserved" : "Still gathering evidence"}</span></div>
      <div className="record-preview"><span>Draft record</span><strong>{WORKFLOW_CONTRACTS[conversation.workflow].label}</strong><small>Nothing below is permanent yet.</small></div>
      <DraftSummary value={draft.commitBody} />
      {(draft.missingRequirements.length > 0 || draft.contradictions.length > 0) && <div className="review-gaps">{draft.missingRequirements.length > 0 && <div><strong>Still needed</strong><ul>{draft.missingRequirements.map((item) => <li key={item}>{item}</li>)}</ul></div>}{draft.contradictions.length > 0 && <div><strong>Resolve these contradictions</strong><ul>{draft.contradictions.map((item) => <li key={item}>{item}</li>)}</ul></div>}</div>}
      <details className="structured-editor"><summary>Edit structured draft</summary><p>Advanced escape hatch. The teacher will recheck your edits against the same evidence contract.</p><textarea rows={18} value={structuredDraft} onChange={(event) => setStructuredDraft(event.target.value)} spellCheck={false} /><button className="secondary" disabled={busy} onClick={() => void saveStructuredDraft()}>Save and recheck draft</button></details>
      {conversation.phase === "review_ready" && !draft.missingRequirements.length && !draft.contradictions.length && <div className="confirm-preserve"><div><strong>This becomes immutable.</strong><p>The full visible transcript stays linked to the resulting Lab artifact. Later evidence appends; it never rewrites this record.</p></div><button className="primary" disabled={busy} onClick={() => void commit()}>{busy ? "Preserving…" : "Confirm and preserve"}</button></div>}
    </section>}
  </section>;
}
