import {
  WORKFLOW_CONTRACTS,
  type ConversationWorkflow,
} from "./conversation.ts";

export type ConversationRouteContext = {
  learnerDate?: string;
  hasAssignment?: boolean;
  hasActiveConversation?: boolean;
  unfinishedWorkflows?: ConversationWorkflow[];
  recentRecords?: Array<{ recordType: string; title: string }>;
};

export type ConversationRouteResult =
  | {
      kind: "start";
      workflow: ConversationWorkflow;
      label: string;
      explanation: string;
    }
  | {
      kind: "answer";
      message: string;
      suggestedWorkflow?: ConversationWorkflow;
    }
  | {
      kind: "clarify";
      question: string;
      candidates: ConversationWorkflow[];
    };

type RouteRule = {
  workflow: ConversationWorkflow;
  pattern: RegExp;
  explanation: string;
};

const EXTERNAL_ACTION_PATTERN = /\b(?:apply for me|(?:send|email|message|contact|submit|publish|post|delete|erase)\s+(?:this|that|the|a|an|my|to|for|application|founder|firm|record|message|email|post)\b|bypass|ignore (?:the|all) rules?)\b/i;

const ROUTE_RULES: RouteRule[] = [
  { workflow: "calibration_review", pattern: /\b(calibrat|score|brier|resolve).*(forecast|prediction)|\blast month(?:'s)? predictions?\b/i, explanation: "I’ll help compare the original judgment with later evidence and change a future decision rule." },
  { workflow: "revision_attempt", pattern: /\b(revis|respond).*(coach|feedback)|\bcoach feedback\b/i, explanation: "I’ll help preserve a genuine evidence-based revision without rewriting the original." },
  { workflow: "coach_request", pattern: /\b(coach|diagnos|reasoning gap|critique my)\b/i, explanation: "I’ll help diagnose a committed Independent First Pass without supplying a competing answer." },
  { workflow: "diligence_stage", pattern: /\b(next|continue|stage).*(diligence)|\bdiligence stage\b/i, explanation: "I’ll help continue only the next unlocked stage of the Diligence Case." },
  { workflow: "diligence_case", pattern: /\b(open|start|new).*(diligence)|\bdiligence case\b/i, explanation: "I’ll help open a sequenced Diligence Case from completed prior work." },
  { workflow: "weekly_underwrite", pattern: /\b(underwrite|load-bearing question|deep dive)\b/i, explanation: "I’ll help test exactly three load-bearing questions with support and disconfirmation." },
  { workflow: "founder_evidence_review", pattern: /\b(founder|founding team).*(evidence|interview|behavior|behaviour|review)|\bfounder evidence\b/i, explanation: "I’ll help separate observable founder behavior from inference." },
  { workflow: "second_order_map", pattern: /\b(second[- ]order|third[- ]order|causal map|trace consequences)\b/i, explanation: "I’ll help trace the signal through actor response and later equilibrium." },
  { workflow: "forecast", pattern: /\b(forecast|prediction|probability|odds|\d{1,2}%|\d{1,2} percent)\b/i, explanation: "I’ll help turn the claim into explicit odds, a horizon, and a resolution source." },
  { workflow: "snapshot_judgment", pattern: /\b(snapshot|first pass|judge|screen|thesis).*(company|startup)|\bcompany screen\b/i, explanation: "I’ll help lock your causal 20-minute Independent First Pass." },
  { workflow: "sourcing_progress", pattern: /\b(sourcing|lead).*(progress|reply|meeting|relationship|stage|update)\b/i, explanation: "I’ll help append observable sourcing progress without rewriting discovery." },
  { workflow: "sourcing_experiment", pattern: /\b(sourcing|discover).*(experiment|hypothesis|test|channel)\b/i, explanation: "I’ll help commit the discovery hypothesis before its results are known." },
  { workflow: "sourcing_lead", pattern: /\b(found|discovered|sourced|demo day|came across).*(startup|company)|\bnew sourcing lead\b/i, explanation: "I’ll help preserve how you found the company and why it may qualify." },
  { workflow: "recruiting_evidence", pattern: /\b(application|interview|recruiting).*(update|submitted|interaction|evidence|practice|portfolio)\b/i, explanation: "I’ll help append bounded recruiting evidence without overstating an outcome." },
  { workflow: "recruiting_opportunity", pattern: /\b(internship|job|role|fellowship|application|recruiting opportunity)\b/i, explanation: "I’ll help preserve the opportunity from first-party evidence before outcomes are known." },
  { workflow: "weekly_plan", pattern: /\b(plan|capacity|exam mode|recruiting surge|normal week|practice mode|my week)\b/i, explanation: "I’ll help choose a sustainable practice mode without creating catch-up debt." },
  { workflow: "history_update", pattern: /\b(later evidence|correction|reflection|what changed|update my record)\b/i, explanation: "I’ll help append what changed while preserving the original record." },
  { workflow: "reading_response", pattern: /\b(reading|article|daily brief|brief response|independent first pass)\b/i, explanation: "I’ll help preserve your Independent First Pass on the assigned reading." },
];

function start(workflow: ConversationWorkflow, explanation: string): ConversationRouteResult {
  return { kind: "start", workflow, label: WORKFLOW_CONTRACTS[workflow].label, explanation };
}

export function routeConversationIntent(
  rawMessage: string,
  context: ConversationRouteContext = {},
): ConversationRouteResult {
  const message = rawMessage.trim().slice(0, 10_000);
  if (!message) {
    return {
      kind: "clarify",
      question: "What are you working through right now? Rough notes are enough.",
      candidates: ["snapshot_judgment", "reading_response", "weekly_plan"],
    };
  }
  if (EXTERNAL_ACTION_PATTERN.test(message)) {
    return {
      kind: "answer",
      message: "I can help you think, draft, or preserve evidence, but I can’t contact anyone, submit anything, delete your record, or bypass review.",
    };
  }
  if (/\b(what should i do|where (?:do|should) i start|today(?:'s)? work|next action)\b/i.test(message)) {
    if (context.hasActiveConversation) {
      return {
        kind: "answer",
        message: "You have unfinished work ready to continue. Open it below, or tell me what has changed.",
      };
    }
    if (context.hasAssignment) {
      return start("reading_response", "Your Daily Brief is ready, so we’ll begin with your Independent First Pass.");
    }
    return start("weekly_plan", "There is no active Daily Brief yet, so we’ll choose the right practice mode and next action.");
  }
  const matched = ROUTE_RULES.find((rule) => rule.pattern.test(message));
  if (matched) return start(matched.workflow, matched.explanation);
  return {
    kind: "clarify",
    question: "Is this about judging a company, today’s practice, or sourcing and recruiting?",
    candidates: ["snapshot_judgment", "weekly_plan", "sourcing_lead"],
  };
}
