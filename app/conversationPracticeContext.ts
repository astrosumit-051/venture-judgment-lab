import type { ConversationWorkflow, LearningConversation } from "./conversation";

export type ConversationPracticeContext = {
  practiceDayId: string;
  selectedSourcingLeadId?: string;
};

export const PRACTICE_CONTEXT_WORKFLOWS = new Set<ConversationWorkflow>([
  "sourcing_lead",
  "snapshot_judgment",
  "forecast",
  "recruiting_evidence",
]);

function boundedId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
}

export function parseConversationPracticeContext(value: unknown): ConversationPracticeContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (keys.some((key) => !["practiceDayId", "selectedSourcingLeadId"].includes(key))
    || !boundedId(candidate.practiceDayId)
    || (candidate.selectedSourcingLeadId !== undefined && !boundedId(candidate.selectedSourcingLeadId))) return null;
  return {
    practiceDayId: candidate.practiceDayId,
    ...(candidate.selectedSourcingLeadId ? { selectedSourcingLeadId: candidate.selectedSourcingLeadId } : {}),
  };
}

export function practiceContextFromConversation(conversation: LearningConversation): ConversationPracticeContext | null {
  for (const turn of conversation.turns) {
    const parsed = parseConversationPracticeContext(turn.metadata.practiceContext);
    if (parsed) return parsed;
  }
  return null;
}

export function applyConversationPracticeContext(
  workflow: ConversationWorkflow,
  commitBody: Record<string, unknown>,
  context: ConversationPracticeContext,
): { commitBody?: Record<string, unknown>; error?: string } {
  if (!PRACTICE_CONTEXT_WORKFLOWS.has(workflow) || commitBody.operation !== "commit_record") {
    return { error: "This conversation cannot contribute to a Practice Day checkpoint." };
  }
  const rawPayload = commitBody.payload;
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return { error: "The Practice Day conversation needs a complete record payload before preservation." };
  }
  const payload = { ...(rawPayload as Record<string, unknown>) };
  if (payload.practiceDayId !== undefined && payload.practiceDayId !== context.practiceDayId) {
    return { error: "The conversation draft cannot change its immutable Practice Day link." };
  }
  payload.practiceDayId = context.practiceDayId;
  const next = { ...commitBody, payload };
  if (workflow === "snapshot_judgment") {
    if (!context.selectedSourcingLeadId) return { error: "Choose one of today’s three independently discovered companies before preserving the Snapshot." };
    if ((next.parentId !== undefined && next.parentId !== context.selectedSourcingLeadId)
      || (payload.sourcingLeadId !== undefined && payload.sourcingLeadId !== context.selectedSourcingLeadId)) {
      return { error: "The Snapshot draft cannot change the independently selected company." };
    }
    next.parentId = context.selectedSourcingLeadId;
    payload.sourcingLeadId = context.selectedSourcingLeadId;
  } else if (context.selectedSourcingLeadId) {
    return { error: "Only a Snapshot conversation can carry a selected daily company." };
  }
  return { commitBody: next };
}
