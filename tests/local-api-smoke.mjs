import assert from "node:assert/strict";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";

async function json(path, init) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json();
  return { response, body, durationMs: performance.now() - startedAt };
}

const bootstrap = await json("/api/lab/bootstrap");
assert.equal(bootstrap.response.status, 200, JSON.stringify(bootstrap.body));
assert.equal(bootstrap.body.runtime.mode, "local");
assert.deepEqual(bootstrap.body.counts, { records: 0, events: 0, conversations: 0 });
assert.deepEqual(bootstrap.body.recentConversations, []);

const emptyRecords = await json("/api/lab/records?types=weekly_plan&limit=10");
assert.equal(emptyRecords.response.status, 200, JSON.stringify(emptyRecords.body));
assert.deepEqual(emptyRecords.body, { records: [], nextCursor: null });

const created = await json("/api/lab", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    operation: "commit_record",
    recordType: "weekly_plan",
    title: "Local verification week",
    payload: {
      weekOf: "2026-08-10",
      mode: "Normal Week",
      rationale: "Verify the local append-only record.",
      totalMinutes: 690,
      dailyLoops: 5,
    },
  }),
});
assert.equal(created.response.status, 201, JSON.stringify(created.body));
assert.equal(created.body.record.id, created.body.id);
assert.equal(created.body.record.recordType, "weekly_plan");
assert.equal(created.body.record.title, "Local verification week");

const populatedRecords = await json("/api/lab/records?types=weekly_plan&limit=10");
assert.equal(populatedRecords.response.status, 200, JSON.stringify(populatedRecords.body));
assert.equal(populatedRecords.body.records.length, 1);
assert.equal(populatedRecords.body.records[0].id, created.body.id);

const appended = await json("/api/lab", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    operation: "append_event",
    recordId: created.body.id,
    eventType: "reflection",
    eventData: { text: "The local record remains append-only." },
  }),
});
assert.equal(appended.response.status, 201, JSON.stringify(appended.body));
assert.equal(appended.body.event.id, appended.body.id);
assert.equal(appended.body.event.recordId, created.body.id);
assert.equal(appended.body.event.eventType, "reflection");

const history = await json("/api/lab/history?type=weekly_plan&limit=25");
assert.equal(history.response.status, 200, JSON.stringify(history.body));
assert.equal(history.body.records.length, 1);
assert.equal(history.body.records[0].id, created.body.id);
assert.equal(history.body.records[0].events.length, 1);
assert.deepEqual(history.body.records[0].childRecords, []);
assert.equal(history.body.nextCursor, null);

const populatedBootstrap = await json("/api/lab/bootstrap");
assert.deepEqual(populatedBootstrap.body.counts, { records: 1, events: 1, conversations: 0 });

for (const measurement of [bootstrap, emptyRecords, history, populatedBootstrap]) {
  assert.ok(measurement.durationMs < 300, `Warmed local request took ${measurement.durationMs.toFixed(1)}ms`);
}
