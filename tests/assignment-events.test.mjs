import assert from "node:assert/strict";
import test from "node:test";

import { completionReadiness, validateAssignmentEvent } from "../app/assignmentEvents.ts";

test("Reading Record learner responses remain bounded Independent First Pass evidence", () => {
  assert.equal(validateAssignmentEvent("reading_record", "learner_response", {
    independentFirstPass: "The claim is plausible, but the evidence does not yet establish retention.",
    takeaway: "Separate observed adoption from inferred durability.",
    uncertainty: "Cohort behavior remains unknown.",
    originalPreserved: true,
    privateEvidenceConfirmed: true,
  }), null);
  assert.match(validateAssignmentEvent("daily_brief", "learner_response", {
    independentFirstPass: "Wrong parent.",
    takeaway: "Wrong parent.",
    uncertainty: "Wrong parent.",
    originalPreserved: true,
    privateEvidenceConfirmed: true,
  }) ?? "", /Reading Record/i);
});

test("typed source overlays cannot rewrite their original Reading Record", () => {
  assert.equal(validateAssignmentEvent("reading_record", "replacement_link", {
    replacementUrl: "https://example.com/lawful-replacement",
    reason: "The original publisher URL moved after assignment.",
    originalPreserved: true,
  }), null);
  assert.equal(validateAssignmentEvent("reading_record", "revisit", {
    reason: "New disconfirming evidence changes the reading question.",
    changedQuestion: "Which inference no longer survives?",
    originalPreserved: true,
  }), null);
  assert.match(validateAssignmentEvent("reading_record", "replacement_link", {
    replacementUrl: "javascript:alert(1)",
    reason: "Unsafe.",
    originalPreserved: true,
  }) ?? "", /HTTPS/i);
});

test("Daily Brief completion and missed practice are mutually exclusive typed outcomes", () => {
  assert.equal(validateAssignmentEvent("daily_brief", "completion", {
    completedLearnerDate: "2026-08-13",
    originalPreserved: true,
  }), null);
  assert.equal(validateAssignmentEvent("daily_brief", "missed_practice", {
    learnerDate: "2026-08-13",
    reason: "The learner date ended without a completion event.",
    noCatchUpDebt: true,
    originalPreserved: true,
  }), null);
  assert.match(validateAssignmentEvent("reading_record", "completion", {
    completedLearnerDate: "2026-08-13",
    originalPreserved: true,
  }) ?? "", /Daily Brief/i);
});

test("Daily Brief completion requires one learner response for each of exactly four distinct readings", () => {
  const readings = ["reading-1", "reading-2", "reading-3", "reading-4"];
  assert.match(completionReadiness(readings, ["reading-1", "reading-2", "reading-3"]) ?? "", /all four distinct Reading Records/i);
  assert.match(completionReadiness(readings, ["reading-1", "reading-1", "reading-2", "reading-3", "reading-4"]) ?? "", /exactly one learner response/i);
  assert.equal(completionReadiness(readings, readings), null);
  assert.match(completionReadiness(readings.slice(0, 3), readings.slice(0, 3)) ?? "", /exactly four Reading Records/i);
});
