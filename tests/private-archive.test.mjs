import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildPrivateArchiveExport,
  canonicalizeJson,
  matchesArchiveAcknowledgement,
  sha256Hex,
} from "../app/privateArchive.ts";
import { publishPrivateArchive } from "../scripts/sync-private-learning-record.mjs";
import { recoverPrivateArchive } from "../app/privateArchiveRecovery.ts";

test("private archive canonicalization follows JCS ordering and primitive serialization", async () => {
  const value = {
    string: "€$\u000f\nA'B\"\\\"/",
    numbers: [333333333.33333329, 1E30, 4.50, 2e-3, 0.000000000000000000000000001],
    literals: [null, true, false],
  };
  const canonical = "{\"literals\":[null,true,false],\"numbers\":[333333333.3333333,1e+30,4.5,0.002,1e-27],\"string\":\"€$\\u000f\\nA'B\\\"\\\\\\\"/\"}";

  assert.equal(canonicalizeJson(value), canonical);
  assert.equal(
    await sha256Hex(canonicalizeJson({ b: 2, a: 1 })),
    "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
  );
});

test("private archive canonicalization rejects non-I-JSON values", () => {
  assert.throws(() => canonicalizeJson({ value: Number.NaN }), /finite/);
  assert.throws(() => canonicalizeJson({ value: undefined }), /JSON value/);
  assert.throws(() => canonicalizeJson({ value: "\ud800" }), /Unicode scalar/);
});

test("stored archive acknowledgement replays exactly without depending on a regenerated export", () => {
  const acknowledgement = {
    runKey: "daily-operator|2026-08-13",
    cursor: { runId: "run-1", runKey: "daily-operator|2026-08-13", throughCreatedAt: "2026-08-13T12:00:00.000Z" },
    counts: { records: 1, events: 0, profiles: 1, assignments: 1, automationRuns: 1 },
    digest: "a".repeat(64),
  };
  assert.equal(matchesArchiveAcknowledgement(JSON.stringify(acknowledgement), structuredClone(acknowledgement)), true);
  assert.equal(matchesArchiveAcknowledgement(JSON.stringify(acknowledgement), { ...acknowledgement, digest: "b".repeat(64) }), false);
});

function exportDb({ countOverride } = {}) {
  const prepared = [];
  const run = { id: "run-1", created_at: "2026-08-13T12:00:00.000Z" };
  const sectionRows = [
    [{ id: "record-1", recordType: "automation_run", parentId: null, title: "Run", payloadJson: "{}", committedAt: run.created_at, createdAt: run.created_at }],
    [],
    [{ id: "profile-1", profileVersion: 1, timezone: "America/Chicago", practiceMode: "normal", expectedWeekdaysJson: "[1,2,3,4,5]", notificationPreference: "ready_or_intervention", effectiveLearnerDate: "2026-08-13", automationBinding: "daily_operator", createdAt: run.created_at }],
    [{ id: "assignment-1", learnerDate: "2026-08-13", profileId: "profile-1", automationRunId: "run-1", evidenceRecordId: "brief-1", state: "ready", payloadChecksum: "abc", createdAt: run.created_at }],
    [{ id: "run-1", operatorKind: "daily_operator", scheduledFor: "2026-08-13T11:00:00.000Z", profileId: "profile-1", inputChecksum: "input", evidenceRecordId: "record-1", notificationIntent: "ready", createdAt: run.created_at }],
  ];
  const db = {
    prepare(sql) {
      const statement = {
        sql,
        bindings: [],
        bind(...bindings) { this.bindings = bindings; return this; },
        async first() { return run; },
      };
      prepared.push(statement);
      return statement;
    },
    async batch(statements) {
      assert.equal(statements.length, 15);
      return sectionRows.flatMap((rows, index) => [
        { success: true, results: rows.length ? [{ created_at: rows.at(-1).createdAt, id: rows.at(-1).id }] : [] },
        { success: true, results: [{ count: index === 0 && countOverride !== undefined ? countOverride : rows.length }] },
        { success: true, results: rows },
      ]);
    },
  };
  return { db, prepared };
}

test("private export is one bounded owner-scoped batch with fixed cursor, counts, and stable checksums", async () => {
  const firstDb = exportDb();
  const first = await buildPrivateArchiveExport(firstDb.db, "owner-a", "daily-operator|2026-08-13");
  const second = await buildPrivateArchiveExport(exportDb().db, "owner-a", "daily-operator|2026-08-13");

  assert.deepEqual(first, second);
  assert.equal(first.payload.ownerFingerprint, "95256875151043abdcafdd26fd390c650d6311e1d7185df477ce50736b6a5d0b");
  assert.deepEqual(first.payload.cursor, {
    runId: "run-1",
    runKey: "daily-operator|2026-08-13",
    bounds: {
      records: { createdAt: "2026-08-13T12:00:00.000Z", id: "record-1" },
      events: null,
      profiles: { createdAt: "2026-08-13T12:00:00.000Z", id: "profile-1" },
      assignments: { createdAt: "2026-08-13T12:00:00.000Z", id: "assignment-1" },
      automationRuns: { createdAt: "2026-08-13T12:00:00.000Z", id: "run-1" },
    },
  });
  assert.deepEqual(first.payload.counts, { records: 1, events: 0, profiles: 1, assignments: 1, automationRuns: 1 });
  assert.match(first.payloadDigest, /^[a-f0-9]{64}$/);
  assert.equal(firstDb.prepared.length, 16);
  for (const statement of firstDb.prepared.slice(1)) {
    assert.match(statement.sql, /owner_id = \?/);
    assert.equal(statement.bindings[0], "owner-a");
  }
  for (let index = 1; index < firstDb.prepared.length; index += 3) {
    assert.match(firstDb.prepared[index].sql, /ORDER BY created_at DESC, id DESC LIMIT 1/);
    assert.deepEqual(firstDb.prepared[index].bindings, ["owner-a"]);
    assert.deepEqual(firstDb.prepared[index + 1].bindings, ["owner-a", "owner-a"]);
    assert.deepEqual(firstDb.prepared[index + 2].bindings, ["owner-a", "owner-a"]);
    assert.match(firstDb.prepared[index + 2].sql, /ORDER BY rows\.created_at ASC, rows\.id ASC/);
  }
});

test("private export fails closed when database counts do not match returned rows", async () => {
  await assert.rejects(
    buildPrivateArchiveExport(exportDb({ countOverride: 2 }).db, "owner-a", "daily-operator|2026-08-13"),
    /records count did not reconcile/,
  );
});

test("private archive publishes 0600 in its same-directory temp flow and accepts only an identical replay", async () => {
  const root = await mkdtemp(join(tmpdir(), "venture-lab-archive-test-"));
  try {
    const bundle = await buildPrivateArchiveExport(exportDb().db, "owner-a", "daily-operator|2026-08-13");
    const first = await publishPrivateArchive(bundle, root);
    const replay = await publishPrivateArchive(bundle, root);
    assert.equal(first.idempotent, false);
    assert.equal(replay.idempotent, true);
    assert.equal(replay.path, first.path);
    assert.equal((await stat(first.path)).mode & 0o777, 0o600);
    assert.deepEqual(JSON.parse(await readFile(first.path, "utf8")), bundle);

    const conflicting = structuredClone(bundle);
    conflicting.payload.sections.records[0].title = "Changed run";
    conflicting.payload.sectionChecksums.records = await sha256Hex(canonicalizeJson(conflicting.payload.sections.records));
    conflicting.payloadDigest = await sha256Hex(canonicalizeJson(conflicting.payload));
    await assert.rejects(
      publishPrivateArchive(conflicting, root),
      /different digest/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("private archive recovery verifies owner identity before importing", async () => {
  const bundle = await buildPrivateArchiveExport(exportDb().db, "owner-a", "daily-operator|2026-08-13");
  await assert.rejects(recoverPrivateArchive({}.db, "owner-b", bundle), /owner does not match/i);
});

test("private archive recovery refuses a non-fresh owner scope", async () => {
  const bundle = await buildPrivateArchiveExport(exportDb().db, "owner-a", "daily-operator|2026-08-13");
  const db = {
    prepare() { return { bind() { return this; } }; },
    async batch() { return [{ results: [{ count: 1 }] }, ...Array.from({ length: 4 }, () => ({ results: [{ count: 0 }] }))]; },
  };
  await assert.rejects(recoverPrivateArchive(db, "owner-a", bundle), /fresh D1/i);
});
