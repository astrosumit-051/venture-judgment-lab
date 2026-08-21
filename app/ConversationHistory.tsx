"use client";

import { useEffect, useState } from "react";
import { WORKFLOW_CONTRACTS, type LearningConversation } from "./conversation";

export function ConversationHistory() {
  const [conversations, setConversations] = useState<LearningConversation[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/lab/conversations", { cache: "no-store" })
        .then((response) => response.json())
        .then((result: { conversations?: LearningConversation[] }) => setConversations(result.conversations ?? []));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const committed = conversations.filter((item) => item.phase === "committed");
  if (!committed.length) return null;
  return <section className="conversation-history"><div className="section-heading"><div><span className="eyebrow coral">Learning Conversations</span><h3>Full visible transcripts</h3></div><span className="quiet">Hidden model reasoning is never stored</span></div>{committed.map((item) => <details key={item.id}><summary><span><strong>{WORKFLOW_CONTRACTS[item.workflow].label}</strong><small>{new Date(item.createdAt).toLocaleString()} · linked artifact {item.committedRecordId}</small></span><span>{item.turns.filter((turn) => turn.role !== "system").length} turns</span></summary><div className="transcript">{item.turns.map((turn) => <article key={turn.id} className={`turn turn-${turn.role}`}><span>{turn.role === "teacher" ? "Teacher" : turn.role === "learner" ? "You" : "Preserved"}</span><p>{turn.visibleText}</p></article>)}</div></details>)}</section>;
}
