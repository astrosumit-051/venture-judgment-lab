import assert from "node:assert/strict";
import test from "node:test";

import {
  DILIGENCE_STAGE_DEFINITIONS,
  diligenceSequenceStatus,
  validateDiligencePayload,
} from "../app/diligence.ts";

const today = "2026-08-08";

function stagePayload(stageKey, specific = {}) {
  const definition = DILIGENCE_STAGE_DEFINITIONS.find((stage) => stage.key === stageKey);
  return {
    caseId: "case-1",
    stageKey,
    stageIndex: DILIGENCE_STAGE_DEFINITIONS.indexOf(definition),
    stageLabel: definition.label,
    recordKey: `case-1|${stageKey}`,
    committedOn: today,
    timezone: "America/Chicago",
    sources: [{
      sourceType: "Public source",
      sourceReference: "https://example.com/evidence",
      observation: "A bounded observable fact.",
      reliabilityLimits: "Synthetic unit-test evidence.",
    }],
    limitations: "One synthetic source.",
    disconfirmingEvidence: "The observed evidence may not generalize.",
    inference: "The claim remains provisional.",
    nextEvidence: "Obtain a second independent source.",
    decisionDelta: "The evidence narrowed one uncertainty without reversing the view.",
    privacyConfirmed: true,
    ...specific,
  };
}

function record(stageKey, index) {
  const definition = DILIGENCE_STAGE_DEFINITIONS[index];
  return {
    id: `stage-${index}`,
    recordType: "diligence_stage",
    parentId: "case-1",
    title: definition.label,
    payload: { stageKey, stageIndex: index },
    committedAt: `2026-08-08T12:0${index}:00.000Z`,
  };
}

test("Diligence sequence exposes only the next stage for an exact canonical prefix", () => {
  const prefix = DILIGENCE_STAGE_DEFINITIONS.slice(0, 4).map((stage, index) => record(stage.key, index));
  const state = diligenceSequenceStatus(prefix, "case-1");
  assert.equal(state.validPrefix, true);
  assert.equal(state.nextStage?.key, "anti_memo");
  assert.equal(state.complete, false);

  const complete = diligenceSequenceStatus(
    DILIGENCE_STAGE_DEFINITIONS.map((stage, index) => record(stage.key, index)),
    "case-1",
  );
  assert.equal(complete.complete, true);
  assert.equal(complete.nextStage, null);
});

test("Diligence sequence locks when stored stages contain a gap or mismatched identity", () => {
  const corrupted = [record("foundation", 0), record("technical_product", 1)];
  const state = diligenceSequenceStatus(corrupted, "case-1");
  assert.equal(state.validPrefix, false);
  assert.equal(state.nextStage, null);
});

test("Diligence payloads require exact identity, bounded sources, privacy, and stage evidence", () => {
  assert.equal(validateDiligencePayload("diligence_case", {
    snapshotId: "snapshot-1",
    underwriteId: "underwrite-1",
    company: "Verification Co",
    openedOn: today,
    timezone: "America/Chicago",
    caseKey: "underwrite-1",
  }, today), null);

  const foundation = stagePayload("foundation", {
    foundationSummary: "The case begins from one locked Snapshot and Underwrite.",
    snapshotCrux: "Can the evidence support durable customer pull?",
    underwriteDecision: "Watch pending independent customer evidence.",
  });
  assert.equal(validateDiligencePayload("diligence_stage", foundation, today), null);
  assert.match(validateDiligencePayload("diligence_stage", { ...foundation, score: 88 }, today) ?? "", /undeclared field/i);
  assert.match(validateDiligencePayload("diligence_stage", { ...foundation, privacyConfirmed: false }, today) ?? "", /raw transcripts/i);
  assert.match(validateDiligencePayload("diligence_stage", {
    ...foundation,
    sources: [{ ...foundation.sources[0], sourceReference: "not-a-url" }],
  }, today) ?? "", /original HTTP/i);
});

test("Anti-Memo and oral defense carry their non-negotiable evidence", () => {
  const antiMemo = stagePayload("anti_memo", {
    nonInvestmentCase: "The product never becomes a system of record.",
    failureMechanism: "Generic substitutes erase switching costs before enterprise adoption compounds.",
    leadingFailureIndicators: "Flat retention and no proprietary workflow data after two enterprise cohorts.",
    reversalEvidence: "Cohort retention and workflow data demonstrate compounding customer value.",
  });
  assert.equal(validateDiligencePayload("diligence_stage", antiMemo, today), null);
  assert.match(validateDiligencePayload("diligence_stage", { ...antiMemo, reversalEvidence: "" }, today) ?? "", /required Anti-Memo/i);

  const oralDefense = stagePayload("oral_defense", {
    timedQuestions: Array.from({ length: 3 }, (_, index) => ({
      question: `Question ${index + 1}`,
      secondsAllowed: 90,
      answerSummary: "The learner answered from the committed evidence.",
      concession: "One uncertainty remains unresolved.",
    })),
    changedJudgment: "Confidence fell because customer evidence remained narrow.",
    unresolvedIssues: "Independent retention data is still missing.",
    simulatedIcDecision: "Watch; authorize a bounded follow-up rather than an investment claim.",
  });
  assert.equal(validateDiligencePayload("diligence_stage", oralDefense, today), null);
  const shortQuestion = structuredClone(oralDefense);
  shortQuestion.timedQuestions[0].secondsAllowed = 10;
  assert.match(validateDiligencePayload("diligence_stage", shortQuestion, today) ?? "", /30–300 second/i);
});
