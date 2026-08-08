import assert from "node:assert/strict";
import test from "node:test";

import { applySourcingCorrections, computeSourcingMetrics } from "../app/sourcing.ts";

const originalPayload = {
  company: "Original Company",
  attributionClass: "Independent discovery",
  channel: "Technical ecosystem",
  sourceVisibility: "Public source",
  sourceReference: "https://example.com/original",
};

const correctionEvents = [
  {
    id: "correction-company",
    recordId: "lead-1",
    eventType: "sourcing_metadata_correction",
    eventData: { correctionField: "Company name", correctedValue: "Correct Company" },
    occurredAt: "2026-08-08T10:00:00.000Z",
  },
  {
    id: "correction-provenance",
    recordId: "lead-1",
    eventType: "sourcing_metadata_correction",
    eventData: {
      correctionField: "Discovery provenance",
      correctedValue: {
        attributionClass: "Referral or inbound",
        channel: "Founder or operator network",
        sourceVisibility: "Public source",
        sourceReference: "https://example.com/corrected",
      },
    },
    occurredAt: "2026-08-08T11:00:00.000Z",
  },
];

test("typed sourcing corrections preserve the original and produce an effective overlay", () => {
  const effective = applySourcingCorrections(originalPayload, correctionEvents);

  assert.equal(originalPayload.company, "Original Company");
  assert.equal(originalPayload.attributionClass, "Independent discovery");
  assert.equal(effective.company, "Correct Company");
  assert.equal(effective.attributionClass, "Referral or inbound");
  assert.equal(effective.channel, "Founder or operator network");
  assert.equal(effective.sourceReference, "https://example.com/corrected");
});

test("sourcing metrics use corrected attribution and preserve downstream denominators", () => {
  const records = [
    { id: "experiment-1", recordType: "sourcing_experiment", parentId: null, title: "Experiment", payload: { successCondition: "One Snapshot", stopRule: "Stop after five misses" }, committedAt: "2026-08-08T09:00:00.000Z" },
    { id: "lead-1", recordType: "sourcing_lead", parentId: "experiment-1", title: "Lead", payload: originalPayload, committedAt: "2026-08-08T09:10:00.000Z" },
    { id: "snapshot-1", recordType: "snapshot_judgment", parentId: "lead-1", title: "Snapshot", payload: {}, committedAt: "2026-08-08T12:00:00.000Z" },
    { id: "underwrite-1", recordType: "weekly_underwrite", parentId: "snapshot-1", title: "Underwrite", payload: {}, committedAt: "2026-08-08T13:00:00.000Z" },
  ];
  const events = [
    ...correctionEvents,
    { id: "qualified", recordId: "lead-1", eventType: "sourcing_progress", eventData: { nextStage: "qualified" }, occurredAt: "2026-08-08T09:30:00.000Z" },
  ];

  const metrics = computeSourcingMetrics(records, events);

  assert.equal(metrics.independent, 0);
  assert.equal(metrics.qualified, 1);
  assert.equal(metrics.snapshotRate, 100);
  assert.equal(metrics.underwriteRate, 100);
  assert.deepEqual(metrics.attributionRows, [{ label: "Referral or inbound", leads: 1, snapshots: 1, underwrites: 1 }]);
  assert.equal(metrics.experimentRows[0].leads, 1);
  assert.equal(metrics.experimentRows[0].snapshots, 1);
  assert.equal(metrics.experimentRows[0].underwrites, 1);
});
