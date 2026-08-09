import assert from "node:assert/strict";
import test from "node:test";

import {
  COACH_DIFFICULTY_ADJUSTMENTS,
  boundedCoachSource,
  evaluateMasteryEvidence,
  validateCoachPayload,
} from "../app/coach.ts";

const today = "2026-08-08";

const requestPayload = {
  sourceRecordId: "source-1",
  sourceRecordType: "weekly_underwrite",
  dimension: "diligence",
  companyIdentity: "Verification Systems",
  requestedOn: today,
  timezone: "America/Chicago",
  requestKey: "source-1:diligence",
  focusQuestion: "Where does the causal investment case outrun its evidence?",
  learnerSelfDiagnosis: "The economic inference may rely too heavily on one customer example.",
  independentFirstPassConfirmed: true,
  privacyConfirmed: true,
};

test("Coach Request preserves a committed Independent First Pass without pre-revealing an answer", () => {
  assert.equal(validateCoachPayload("coach_request", requestPayload, today), null);
  assert.match(
    validateCoachPayload("coach_request", { ...requestPayload, modelAnswer: "Copy this conclusion." }, today),
    /undeclared field/i,
  );
});

test("the operator sees only the queued source's explicit bounded coaching projection", () => {
  const projection = boundedCoachSource("weekly_underwrite", {
    selectionReason: "The retention mechanism is load-bearing.",
    causalInvestmentCase: "Workflow repetition could create durable pull.",
    evidenceLedger: [{ observation: "One customer repeated the workflow.", inference: "Retention may follow." }],
    privateContactDetails: "founder@example.com",
    rawTranscript: "never expose this",
  });
  assert.equal(projection.selectionReason, "The retention mechanism is load-bearing.");
  assert.deepEqual(projection.evidenceLedger, [{ observation: "One customer repeated the workflow.", inference: "Retention may follow." }]);
  assert.equal("privateContactDetails" in projection, false);
  assert.equal("rawTranscript" in projection, false);
});

test("Coach Feedback is diagnostic, bounded, and never a grade or model answer", () => {
  const feedback = {
    requestId: "request-1",
    sourceRecordId: "source-1",
    dimension: "diligence",
    companyIdentity: "Verification Systems",
    respondedOn: today,
    timezone: "America/Chicago",
    feedbackKey: "request-1",
    unsupportedInference: "The analysis infers durable retention from one repeated workflow.",
    evidenceGap: "No independent retention cohort is present.",
    recurringError: "Anecdote-to-generalization jump",
    recurringErrorKind: "anecdote_to_generalization",
    recurringErrorCount: 1,
    requiredRevision: "Separate the observed repetition from the unproven retention mechanism.",
    nextDifficultyAdjustment: COACH_DIFFICULTY_ADJUSTMENTS[2],
    competingInterpretation: "The repeated workflow may reflect a design-partner subsidy rather than durable pull.",
    benchmark: "A defensible claim distinguishes observed use, retention evidence, and the causal bridge between them.",
    foundationalError: true,
    genuineDisconfirmingCase: false,
    disconfirmingCaseEvidence: "No qualifying disconfirming case was demonstrated in this attempt.",
    privacyConfirmed: true,
  };
  assert.equal(validateCoachPayload("coach_feedback", feedback, today), null);
  assert.match(validateCoachPayload("coach_feedback", { ...feedback, grade: "B+" }, today), /undeclared field/i);
  assert.match(validateCoachPayload("coach_feedback", { ...feedback, modelAnswer: "Use this memo." }, today), /undeclared field/i);
  assert.match(validateCoachPayload("coach_feedback", { ...feedback, nextDifficultyAdjustment: "advance_independently" }, today), /foundational error/i);
  assert.match(validateCoachPayload("coach_feedback", { ...feedback, recurringErrorKind: "other_bounded_pattern" }, today), /stable lowercase underscore key/i);
  assert.equal(validateCoachPayload("coach_feedback", {
    ...feedback,
    recurringErrorKind: "other_bounded_pattern",
    recurringErrorPatternKey: "market_proxy_substitution",
  }, today), null);
  assert.match(validateCoachPayload("coach_feedback", { ...feedback, recurringErrorPatternKey: "market_proxy_substitution" }, today), /permitted only/i);
});

test("Revision Attempt preserves the source and identifies a genuine evidence-based change", () => {
  const revision = {
    coachFeedbackId: "feedback-1",
    sourceRecordId: "source-1",
    dimension: "diligence",
    companyIdentity: "Verification Systems",
    attemptedOn: today,
    timezone: "America/Chicago",
    revisionKey: "feedback-1",
    revisedJudgment: "Repeated workflow use is observable, but durable retention remains unproven.",
    evidenceAdded: "The revision separates the customer observation from the retention inference.",
    responseToUnsupportedInference: "The causal bridge is now explicitly marked as an unknown.",
    disconfirmingCase: "Design-partner subsidy could explain the observed repetition.",
    decisionDelta: "Confidence falls until an independent cohort supports retention.",
    genuineRevisionConfirmed: true,
    privacyConfirmed: true,
  };
  assert.equal(validateCoachPayload("revision_attempt", revision, today), null);
  assert.match(validateCoachPayload("revision_attempt", { ...revision, genuineRevisionConfirmed: false }, today), /genuine revision/i);
});

test("Mastery becomes repeated or corroborated only at the exact approved evidence threshold", () => {
  const attempts = [
    {
      requestId: "request-1", sourceRecordId: "source-1", companyIdentity: "Alpha", feedbackId: "feedback-1",
      committedAt: "2026-08-01T12:00:00.000Z", independentFirstPassConfirmed: true, foundationalError: true,
      genuineDisconfirmingCase: false, revisionAttemptId: "revision-1", genuineRevisionConfirmed: true,
    },
    {
      requestId: "request-2", sourceRecordId: "source-2", companyIdentity: "Beta", feedbackId: "feedback-2",
      committedAt: "2026-08-02T12:00:00.000Z", independentFirstPassConfirmed: true, foundationalError: false,
      genuineDisconfirmingCase: false, revisionAttemptId: "", genuineRevisionConfirmed: false,
    },
    {
      requestId: "request-3", sourceRecordId: "source-3", companyIdentity: "Alpha", feedbackId: "feedback-3",
      committedAt: "2026-08-03T12:00:00.000Z", independentFirstPassConfirmed: true, foundationalError: false,
      genuineDisconfirmingCase: false, revisionAttemptId: "", genuineRevisionConfirmed: false,
    },
  ];
  const qualified = evaluateMasteryEvidence("diligence", attempts);
  assert.equal(qualified.evidenceState, "repeated_or_corroborated");
  assert.equal(qualified.qualifies, true);
  assert.deepEqual(qualified.latestFeedbackIds, ["feedback-2", "feedback-3"]);

  assert.equal(evaluateMasteryEvidence("diligence", attempts.slice(0, 2)).qualifies, false);
  assert.equal(evaluateMasteryEvidence("diligence", attempts.map((attempt) => ({ ...attempt, companyIdentity: "Alpha" }))).qualifies, false);
  assert.equal(evaluateMasteryEvidence("diligence", attempts.map((attempt, index) => ({ ...attempt, companyIdentity: index === 1 ? " ALPHA " : "Alpha" }))).qualifies, false);
  assert.equal(evaluateMasteryEvidence("diligence", attempts.map((attempt) => ({ ...attempt, revisionAttemptId: "", genuineRevisionConfirmed: false }))).qualifies, false);
  assert.equal(evaluateMasteryEvidence("diligence", attempts.map((attempt, index) => ({ ...attempt, foundationalError: index === 2 }))).qualifies, false);
});
