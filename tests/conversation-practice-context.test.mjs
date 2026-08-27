import assert from "node:assert/strict";
import test from "node:test";

import {
  applyConversationPracticeContext,
  parseConversationPracticeContext,
  practiceContextFromConversation,
} from "../app/conversationPracticeContext.ts";

const context = { practiceDayId: "practice-day-1", selectedSourcingLeadId: "lead-3" };

test("Practice Day conversation context is bounded and survives append-only turns", () => {
  assert.deepEqual(parseConversationPracticeContext(context), context);
  assert.equal(parseConversationPracticeContext({ ...context, mutableCompletion: true }), null);
  assert.equal(parseConversationPracticeContext({ practiceDayId: "" }), null);
  assert.deepEqual(practiceContextFromConversation({
    id: "conversation-1", workflow: "snapshot_judgment", title: "Daily Snapshot", phase: "collecting", createdAt: "2026-08-26T12:00:00.000Z", committedRecordId: null,
    turns: [{ id: "turn-1", sequence: 1, role: "learner", visibleText: "My first pass", draft: { commitBody: {}, missingRequirements: [], contradictions: [] }, metadata: { kind: "opening_intent", practiceContext: context }, createdAt: "2026-08-26T12:00:00.000Z" }],
  }), context);
});

test("Today Snapshot preservation injects the immutable Practice Day and selected lead", () => {
  const result = applyConversationPracticeContext("snapshot_judgment", {
    operation: "commit_record",
    recordType: "snapshot_judgment",
    title: "Nimbus first pass",
    payload: { company: "Nimbus", thesis: "Causal learner thesis" },
  }, context);
  assert.equal(result.error, undefined);
  assert.equal(result.commitBody.parentId, "lead-3");
  assert.equal(result.commitBody.payload.practiceDayId, "practice-day-1");
  assert.equal(result.commitBody.payload.sourcingLeadId, "lead-3");
});

test("Today Forecast and recruiting evidence receive the day link without accepting backdating", () => {
  for (const workflow of ["forecast", "recruiting_evidence"]) {
    const recordType = workflow === "forecast" ? "forecast" : "interview_practice";
    const result = applyConversationPracticeContext(workflow, {
      operation: "commit_record", recordType, title: "Daily checkpoint", payload: {},
    }, { practiceDayId: "practice-day-1" });
    assert.equal(result.error, undefined);
    assert.equal(result.commitBody.payload.practiceDayId, "practice-day-1");
  }
  assert.match(applyConversationPracticeContext("forecast", {
    operation: "commit_record", recordType: "forecast", payload: { practiceDayId: "older-day" },
  }, { practiceDayId: "practice-day-1" }).error, /cannot change/i);
});
