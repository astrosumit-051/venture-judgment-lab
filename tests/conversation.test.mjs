import assert from "node:assert/strict";
import test from "node:test";

import {
  CONVERSATION_WORKFLOWS,
  WORKFLOW_CONTRACTS,
  conversationPhase,
  deepMergeDraft,
  emptyConversationDraft,
  latestConversationDraft,
} from "../app/conversation.ts";

test("every approved conversational workflow has a bounded commit contract", () => {
  assert.equal(CONVERSATION_WORKFLOWS.length, 18);
  for (const workflow of CONVERSATION_WORKFLOWS) {
    const contract = WORKFLOW_CONTRACTS[workflow];
    assert.equal(contract.id, workflow);
    assert.ok(contract.label);
    assert.ok(contract.description);
    assert.ok(contract.initialQuestion.endsWith("?"));
    assert.match(contract.requiredShape, /commitBody/i);
    assert.ok(["commit_record", "append_event", "advance_sourcing_lead", "commit_calibration_review"].includes(contract.operation));
  }
});

test("a Conversation Draft begins as uncommitted and preserves deterministic operation identity", () => {
  const snapshot = emptyConversationDraft("snapshot_judgment");
  assert.deepEqual(snapshot.commitBody, { operation: "commit_record", recordType: "snapshot_judgment" });
  assert.ok(snapshot.missingRequirements.length > 0);
  assert.deepEqual(snapshot.contradictions, []);
});

test("learner corrections deep-merge nested draft fields without dropping prior answers", () => {
  const original = { operation: "commit_record", payload: { company: "Alpha", confidence: 60, evidence: { source: "https://example.com" } } };
  const corrected = deepMergeDraft(original, { payload: { confidence: 45, evidence: { limitation: "Single source" } } });
  assert.deepEqual(corrected, {
    operation: "commit_record",
    payload: { company: "Alpha", confidence: 45, evidence: { source: "https://example.com", limitation: "Single source" } },
  });
});

test("conversation state is derived from append-only visible turns", () => {
  const base = { id: "1", sequence: 1, visibleText: "Question?", draft: emptyConversationDraft("snapshot_judgment"), createdAt: "2026-08-13T00:00:00.000Z" };
  assert.equal(conversationPhase([{ ...base, role: "teacher", metadata: { phase: "collecting" } }]), "collecting");
  assert.equal(conversationPhase([{ ...base, role: "teacher", metadata: { phase: "review_ready" } }]), "review_ready");
  assert.equal(conversationPhase([
    { ...base, role: "teacher", metadata: { phase: "review_ready" } },
    { ...base, id: "2", sequence: 2, role: "system", visibleText: "Preserved", metadata: { kind: "committed", recordId: "record-1" } },
  ]), "committed");
});

test("the latest preserved learner edit remains the retry draft", () => {
  const teacherDraft = { commitBody: { title: "Old" }, missingRequirements: [], contradictions: [] };
  const learnerDraft = { commitBody: { title: "Learner correction" }, missingRequirements: [], contradictions: [] };
  const conversation = {
    id: "conversation-1", workflow: "snapshot_judgment", title: "Snapshot", phase: "collecting",
    createdAt: "2026-08-13T00:00:00.000Z", committedRecordId: null,
    turns: [
      { id: "t1", sequence: 1, role: "teacher", visibleText: "Review", draft: teacherDraft, metadata: {}, createdAt: "2026-08-13T00:00:00.000Z" },
      { id: "t2", sequence: 2, role: "learner", visibleText: "Corrected", draft: learnerDraft, metadata: { kind: "structured_edit" }, createdAt: "2026-08-13T00:01:00.000Z" },
    ],
  };
  assert.deepEqual(latestConversationDraft(conversation), learnerDraft);
});
