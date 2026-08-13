export const CONVERSATION_WORKFLOWS = [
  "reading_response",
  "history_update",
  "sourcing_experiment",
  "sourcing_lead",
  "sourcing_progress",
  "recruiting_opportunity",
  "recruiting_evidence",
  "snapshot_judgment",
  "forecast",
  "second_order_map",
  "founder_evidence_review",
  "weekly_underwrite",
  "diligence_case",
  "diligence_stage",
  "coach_request",
  "revision_attempt",
  "calibration_review",
  "weekly_plan",
] as const;

export type ConversationWorkflow = typeof CONVERSATION_WORKFLOWS[number];
export type ConversationRole = "teacher" | "learner" | "system";
export type ConversationPhase = "collecting" | "review_ready" | "committed" | "abandoned";

export type ConversationDraft = {
  commitBody: Record<string, unknown>;
  missingRequirements: string[];
  contradictions: string[];
};

export type ConversationTurn = {
  id: string;
  sequence: number;
  role: ConversationRole;
  visibleText: string;
  draft: ConversationDraft;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type LearningConversation = {
  id: string;
  workflow: ConversationWorkflow;
  title: string;
  phase: ConversationPhase;
  createdAt: string;
  turns: ConversationTurn[];
  committedRecordId: string | null;
};

export type TeacherReply = {
  message: string;
  draftPatch: Record<string, unknown>;
  missingRequirements: string[];
  contradictions: string[];
  phase: "collecting" | "review_ready";
};

export type WorkflowContract = {
  id: ConversationWorkflow;
  label: string;
  description: string;
  initialQuestion: string;
  operation: "commit_record" | "append_event" | "advance_sourcing_lead" | "commit_calibration_review";
  recordType?: string;
  contextRecordTypes: string[];
  requiredShape: string;
};

function recordContract(
  id: ConversationWorkflow,
  label: string,
  description: string,
  initialQuestion: string,
  recordType: string,
  requiredShape: string,
  contextRecordTypes: string[] = [],
): WorkflowContract {
  return { id, label, description, initialQuestion, operation: "commit_record", recordType, requiredShape, contextRecordTypes };
}

export const WORKFLOW_CONTRACTS: Record<ConversationWorkflow, WorkflowContract> = {
  reading_response: {
    id: "reading_response", label: "Reading response", description: "Preserve your Independent First Pass on one assigned reading.",
    initialQuestion: "Which assigned reading are you responding to, and what is the most important claim you took from it?",
    operation: "append_event", contextRecordTypes: ["reading_record"],
    requiredShape: "commitBody must be {operation:'append_event', recordId:<reading_record id>, eventType:'learner_response', eventData:{response:<learner's own response>, independentFirstPassConfirmed:true}}. Use only an eligible provided record id.",
  },
  history_update: {
    id: "history_update", label: "Later evidence or reflection", description: "Append a correction, reflection, source status, or later usefulness without rewriting the original.",
    initialQuestion: "Which existing record has new evidence, and what changed after the original was committed?",
    operation: "append_event", contextRecordTypes: ["snapshot_judgment", "forecast", "second_order_map", "founder_evidence_review", "weekly_underwrite", "weekly_plan", "diligence_case", "diligence_stage", "coach_request", "coach_feedback", "revision_attempt"],
    requiredShape: "commitBody must be {operation:'append_event', recordId:<eligible record id>, eventType:<reflection|later_usefulness|source_status|metadata_correction>, eventData:{text:<dated learner evidence>, originalPreserved:true}}. For founder, diligence, or coach records also set privateEvidenceConfirmed:true.",
  },
  sourcing_experiment: recordContract(
    "sourcing_experiment", "Sourcing experiment", "Commit a bounded company-discovery hypothesis before seeing its results.",
    "What specific company-discovery hypothesis do you want to test, before you know whether it works?", "sourcing_experiment",
    "commitBody must include operation, recordType, title, and payload with name, channel, targetSegment, searchSurface, hypothesis, leadingSignal, nonConsensusRationale, startDate, endDate, plannedLeads (1-100), successCondition, stopRule, timezone. The experiment must be prospective.",
  ),
  sourcing_lead: recordContract(
    "sourcing_lead", "Sourcing lead", "Preserve how a company was honestly discovered and why it may qualify.",
    "What company did you discover, and exactly how did it first come onto your radar?", "sourcing_lead",
    "commitBody must include operation, recordType, optional parentId for a sourcing experiment, title, and payload with company, companyUrl, attributionClass, channel, sourceVisibility, sourceReference, discoveredOn, sector, companyStage, observedSignal, nonConsensusReason, qualificationThesis, ventureMechanism, disqualifier, initialDisposition, outreachAngle, nextAction, dueDate, initialStage:'discovered', timezone, and privateEvidenceConfirmed when the source is not public. Do not invent normalizedCompanyDomain or discoveredAt; the server derives them.",
    ["sourcing_experiment"],
  ),
  sourcing_progress: {
    id: "sourcing_progress", label: "Sourcing progress", description: "Append observable funnel, relationship, rediscovery, or correction evidence.",
    initialQuestion: "Which sourcing lead changed, and what observable evidence changed—not just what activity occurred?",
    operation: "advance_sourcing_lead", contextRecordTypes: ["sourcing_lead"],
    requiredShape: "commitBody must be {operation:'advance_sourcing_lead', leadId:<sourcing_lead id>, progress:{updateKind, occurredOn, timezone, evidence, nextStage, relationshipQuality, outcome, nextAction, dueDate, privateEvidenceConfirmed:true, plus the typed fields required by that update kind}}. Never include raw messages, contact details, or ratings.",
  },
  recruiting_opportunity: recordContract(
    "recruiting_opportunity", "Recruiting opportunity", "Preserve one researched role, program cycle, relationship target, or fallback.",
    "What exact role or program did you find, and what first-party page proves this cycle exists?", "recruiting_opportunity",
    "commitBody must include operation, recordType, title, and payload matching the Recruiting Opportunity contract: firm, role, officialUrl, cycleKey, discoveredOn, sourceObservedOn, opportunityClass, funnelClass, status, qualificationReason, compensationEvidence, location, workMode, immigrationState, immigrationEvidence, deadline, nextAction, nextActionDue, timezone, privacyConfirmed. Use truthful Unknown states where evidence is absent. The server derives normalizedOfficialUrl and recordKey.",
  ),
  recruiting_evidence: recordContract(
    "recruiting_evidence", "Recruiting evidence", "Append a dated observation, interaction, application attempt, interview practice, or portfolio candidate.",
    "Which Recruiting Opportunity changed, and what dated evidence do you have?", "opportunity_observation",
    "Choose exactly one allowed child recordType: opportunity_observation, recruiting_interaction, application_attempt, interview_practice, or portfolio_candidate. commitBody must include operation, recordType, parentId:<recruiting_opportunity id>, title, and that type's complete payload including opportunityId equal to parentId, its typed date, timezone, privacy/approval fields, and no raw correspondence. Never claim submitted without learner approval and confirmation evidence.",
    ["recruiting_opportunity"],
  ),
  snapshot_judgment: recordContract(
    "snapshot_judgment", "Snapshot judgment", "Commit a 20-minute causal Independent First Pass.",
    "What early-stage company are you judging, and how did you discover it?", "snapshot_judgment",
    "commitBody must include operation, recordType, optional qualified sourcing-lead parentId, title, and payload with company, stage, sector, discoverySource, thesis, ventureMechanism, disposition (Pursue|Watch|Pass), confidence (1-99), crux, supportingEvidence, supportingSourceUrl, disconfirmingSignal, optional disconfirmingSourceUrl, topUnknown, nextEvidence, timezone, timeboxMinutes:20. Do not supply the thesis for the learner.",
    ["sourcing_lead"],
  ),
  forecast: recordContract(
    "forecast", "Forecast", "Put explicit odds and a resolution source on a future event.",
    "What specific future event do you believe may happen, and by what exact date can it be resolved?", "forecast",
    "commitBody must include operation, recordType, optional snapshot parentId, title, and payload with claim, probability (1-99), resolutionDate after today, supportingEvidence, disconfirmingCondition, resolutionSource as a valid URL, timezone, timeboxMinutes:10, status:'open'.",
    ["snapshot_judgment"],
  ),
  second_order_map: recordContract(
    "second_order_map", "Second-Order Map", "Trace a signal through actor response and later equilibrium.",
    "What trigger or change do you want to trace beyond its obvious first-order effect?", "second_order_map",
    "commitBody must include operation, recordType, title, and payload with trigger, firstOrder, secondOrder, thirdOrder, bottlenecks, incentives, suppliers, customers, substitutes, regulation, adjacentEffects, disconfirmingEvidence, timezone.",
  ),
  founder_evidence_review: recordContract(
    "founder_evidence_review", "Founder Evidence Review", "Separate observable founder behavior from inference across six dimensions.",
    "Which founder and company are you reviewing, and what specific public or consented observation are you using?", "founder_evidence_review",
    "commitBody must include operation, recordType, parentId:<snapshot id>, title, and payload with linkedSnapshotId, company, founderName, sourceType, sourceUrlOrContext, sourceDate, sourceLimitations, privacyBoundary, privateEvidenceConfirmed when non-public, exactly six dimensions (insight, integrity, adaptability, recruiting ability, speed, founder-market fit) each with direction, observation, inference, plus charismaCheck, counterEvidence, provisionalJudgment, confidence 1-99, nextQuestion, behavioralPrediction, timezone. Never create a founder score.",
    ["snapshot_judgment"],
  ),
  weekly_underwrite: recordContract(
    "weekly_underwrite", "Weekly Underwrite", "Investigate exactly three load-bearing questions with support and disconfirmation.",
    "Which locked Snapshot deserves deeper work, and why is it the best use of this week's attention?", "weekly_underwrite",
    "commitBody must include operation, recordType, parentId:<snapshot id>, title, and payload with snapshotId equal to parentId, selectionReason, exactly three questions, exactly three evidenceLedger rows mapped to those questions with observation, valid sourceUrl, direction and reliabilityLimits and inference; the ledger must materially support and challenge; founderEvidence, founderEvidenceSourceOrGap, optional founderReviewId, countercase, causalInvestmentCase, disposition, confidence 1-99, decisionDelta, nextEvidence, mode, timeboxMinutes, coachStatus.",
    ["snapshot_judgment", "founder_evidence_review"],
  ),
  diligence_case: recordContract(
    "diligence_case", "Diligence case", "Open the sequenced diligence ladder from one Snapshot and Underwrite.",
    "Which completed Weekly Underwrite should become a Diligence Case, and what question makes deeper work worthwhile?", "diligence_case",
    "commitBody must include operation, recordType:'diligence_case', parentId:<weekly_underwrite id>, title, and the complete Diligence Case payload including snapshotId, underwriteId equal to parentId, company, openedOn, timezone, focusQuestion, privacyConfirmed. The server derives case identity.",
    ["snapshot_judgment", "weekly_underwrite"],
  ),
  diligence_stage: recordContract(
    "diligence_stage", "Diligence stage", "Commit only the next unlocked stage in a Diligence Case.",
    "Which active Diligence Case are you continuing, and what evidence did you gather for its next unlocked stage?", "diligence_stage",
    "commitBody must include operation, recordType:'diligence_stage', parentId:<diligence_case id>, title, and the exact next stage payload required by the Diligence contract, including caseId equal to parentId, stageKey, completedOn, timezone, bounded sources with reliability limits, disconfirmation, inference, nextEvidence, decisionDelta, privacyConfirmed. Never skip a stage.",
    ["diligence_case", "diligence_stage"],
  ),
  coach_request: recordContract(
    "coach_request", "Judgment Coach request", "Ask for diagnosis only after committing original work.",
    "Which committed Independent First Pass should the Judgment Coach diagnose, and what exact reasoning gap do you suspect?", "coach_request",
    "commitBody must include operation, recordType:'coach_request', parentId:<eligible committed source id>, title, and payload with dimension, requestedOn, timezone, focusQuestion, learnerSelfDiagnosis, independentFirstPassConfirmed:true, privacyConfirmed:true. Source identity and keys are derived by the server. Do not ask for or reveal a model answer.",
    ["sourcing_lead", "snapshot_judgment", "forecast", "founder_evidence_review", "weekly_underwrite", "diligence_stage", "interview_practice"],
  ),
  revision_attempt: recordContract(
    "revision_attempt", "Revision attempt", "Answer one returned Coach Feedback with genuine evidence-based revision.",
    "Which Coach Feedback are you answering, and what part of your original judgment actually changes?", "revision_attempt",
    "commitBody must include operation, recordType:'revision_attempt', parentId:<coach_feedback id>, title, and payload with attemptedOn, timezone, revisedJudgment, evidenceAdded, responseToUnsupportedInference, disconfirmingCase, decisionDelta, genuineRevisionConfirmed:true, privacyConfirmed:true. Linkage fields are derived by the server.",
    ["coach_feedback"],
  ),
  calibration_review: {
    id: "calibration_review", label: "Calibration Review", description: "Resolve eligible forecasts and change a future decision rule without rewriting prior odds.",
    initialQuestion: "Which prior forecast or investment judgment taught you the most this month, and what later evidence is now available?",
    operation: "commit_calibration_review", contextRecordTypes: ["forecast", "snapshot_judgment", "weekly_underwrite"],
    requiredShape: "commitBody must be {operation:'commit_calibration_review', title, payload:{reviewMonth, sourcingResults, analyticalMistakes, judgmentComparison, laterEvidence, updatedDecisionRule, findings, restartPlan, reviewedJudgmentIds:[eligible ids]}, resolvedForecasts:[{forecastId, outcome:0|1, resolutionEvidence, resolutionSource:<valid URL>}]}. Do not alter original probabilities.",
  },
  weekly_plan: recordContract(
    "weekly_plan", "Practice plan", "Choose the week's accepted capacity mode without catch-up debt.",
    "What does your real capacity look like this week, including academic or recruiting constraints?", "weekly_plan",
    "commitBody must include operation, recordType:'weekly_plan', title, and payload with weekOf, mode, rationale, totalMinutes and dailyLoops exactly matching the mode, plus opportunity and deadline for Recruiting Surge, substitutions, and optional sourcingExperimentId. Normal and Monthly modes are 690 minutes/5 loops; Recruiting Surge 690/3; Exam Mode 180/1.",
    ["sourcing_experiment", "recruiting_opportunity"],
  ),
};

export function isConversationWorkflow(value: unknown): value is ConversationWorkflow {
  return typeof value === "string" && (CONVERSATION_WORKFLOWS as readonly string[]).includes(value);
}

export function emptyConversationDraft(workflow: ConversationWorkflow): ConversationDraft {
  const contract = WORKFLOW_CONTRACTS[workflow];
  return {
    commitBody: {
      operation: contract.operation,
      ...(contract.recordType ? { recordType: contract.recordType } : {}),
    },
    missingRequirements: ["Answer the teacher's first question."],
    contradictions: [],
  };
}

export function deepMergeDraft(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      merged[key] = deepMergeDraft(base[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export function conversationPhase(turns: ConversationTurn[]): ConversationPhase {
  const terminal = [...turns].reverse().find((turn) => turn.role === "system" && (turn.metadata.kind === "committed" || turn.metadata.kind === "abandoned"));
  if (terminal?.metadata.kind === "committed") return "committed";
  if (terminal?.metadata.kind === "abandoned") return "abandoned";
  const latestTeacher = [...turns].reverse().find((turn) => turn.role === "teacher");
  return latestTeacher?.metadata.phase === "review_ready" ? "review_ready" : "collecting";
}
