"use client";

import { useEffect, useState } from "react";
import { WORKFLOW_CONTRACTS, type ConversationWorkflow, type LearningConversation } from "./conversation";

type ApiResult = { conversations?: LearningConversation[] };

export function TeacherLauncherSurface({
  activeConversation,
  onOpen,
}: {
  activeConversation?: LearningConversation;
  onOpen: (workflow?: ConversationWorkflow) => void;
}) {
  const [discoveredActive, setDiscoveredActive] = useState<LearningConversation | undefined>(activeConversation);
  useEffect(() => {
    if (activeConversation) return;
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

export function TeacherEntrySurface({
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
