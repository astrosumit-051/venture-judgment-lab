import assert from "node:assert/strict";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const owner = process.env.LAB_SMOKE_OWNER_ID ?? `conversation-owner-${Date.now()}`;
const headers = {
  "content-type": "application/json",
  "oai-authenticated-user-id": owner,
  "oai-authenticated-user-email": `${owner}@example.com`,
};
const otherHeaders = {
  "content-type": "application/json",
  "oai-authenticated-user-id": `${owner}-other`,
  "oai-authenticated-user-email": `${owner}-other@example.com`,
};

async function json(path, options, expected) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  assert.equal(response.status, expected, JSON.stringify(body));
  assert.doesNotMatch(JSON.stringify(body), /conversation-smoke-secret-never-returned/);
  return body;
}

const started = await json("/api/lab/conversations", {
  method: "POST", headers, body: JSON.stringify({ workflow: "second_order_map" }),
}, 201);
assert.equal(started.conversation.phase, "collecting");
assert.equal(started.conversation.turns.length, 1);
assert.equal(started.conversation.turns[0].role, "teacher");

await json(`/api/lab/conversations/${started.conversation.id}`, { headers: otherHeaders }, 404);

const answered = await json(`/api/lab/conversations/${started.conversation.id}/turns`, {
  method: "POST", headers,
  body: JSON.stringify({ content: "Trace rising AI infrastructure demand through constrained compute supply and buyer adaptation." }),
}, 200);
assert.equal(answered.conversation.phase, "review_ready");
assert.deepEqual(answered.conversation.turns.map((turn) => turn.role), ["teacher", "learner", "teacher"]);
assert.equal(answered.conversation.turns[1].visibleText, "Trace rising AI infrastructure demand through constrained compute supply and buyer adaptation.");
assert.equal(answered.conversation.turns[2].draft.missingRequirements.length, 0);

const concurrentCommits = await Promise.all([1, 2].map(async () => {
  const response = await fetch(`${baseUrl}/api/lab/conversations/${started.conversation.id}/commit`, { method: "POST", headers });
  return { status: response.status, body: await response.json() };
}));
const committedResult = concurrentCommits.find((result) => result.status === 201);
assert.ok(committedResult, JSON.stringify(concurrentCommits));
assert.equal(concurrentCommits.filter((result) => result.status === 201).length, 1, JSON.stringify(concurrentCommits));
assert.ok(concurrentCommits.every((result) => [200, 201, 409].includes(result.status)), JSON.stringify(concurrentCommits));
const committed = committedResult.body;
assert.ok(committed.id);
assert.equal(committed.conversation.phase, "committed");
assert.equal(committed.conversation.committedRecordId, committed.id);
assert.equal(committed.conversation.turns.at(-1).role, "system");

const replay = await json(`/api/lab/conversations/${started.conversation.id}/commit`, { method: "POST", headers }, 200);
assert.equal(replay.idempotent, true);
assert.equal(replay.id, committed.id);
await json(`/api/lab/conversations/${started.conversation.id}/abandon`, { method: "POST", headers }, 409);

const listed = await json("/api/lab/conversations", { headers }, 200);
const preserved = listed.conversations.find((item) => item.id === started.conversation.id);
assert.equal(preserved.phase, "committed");
assert.equal(preserved.turns.length, 4);

const abandonedStart = await json("/api/lab/conversations", {
  method: "POST", headers, body: JSON.stringify({ workflow: "forecast" }),
}, 201);
const abandoned = await json(`/api/lab/conversations/${abandonedStart.conversation.id}/abandon`, { method: "POST", headers }, 200);
assert.equal(abandoned.conversation.phase, "abandoned");
assert.equal(abandoned.conversation.turns.at(-1).metadata.kind, "abandoned");
await json(`/api/lab/conversations/${abandonedStart.conversation.id}/commit`, { method: "POST", headers }, 409);

const failureStart = await json("/api/lab/conversations", {
  method: "POST", headers, body: JSON.stringify({ workflow: "snapshot_judgment" }),
}, 201);
const learnerEditedDraft = { operation: "commit_record", recordType: "snapshot_judgment", title: "Learner draft survives outage", payload: { company: "Local Reliability" } };
const failedTurn = await json(`/api/lab/conversations/${failureStart.conversation.id}/turns`, {
  method: "POST", headers,
  body: JSON.stringify({ content: "FORCE_PROVIDER_FAILURE preserve this learner edit", draftOverride: learnerEditedDraft }),
}, 503);
assert.equal(failedTurn.preserved, true);
assert.equal(failedTurn.conversation.turns.at(-1).role, "learner");
assert.deepEqual(failedTurn.conversation.turns.at(-1).draft.commitBody, learnerEditedDraft);

console.log("Conversation API smoke passed: owner isolation, strict turn sequencing, full transcript retention, real provider adaptation, review-before-commit, idempotent preservation, append-only abandonment, and learner-draft recovery during provider failure.");
