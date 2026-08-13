import assert from "node:assert/strict";
import test from "node:test";

import {
  DAILY_OPERATOR_COMPLETION_GRACE_MS,
  dailyOperatorRunKey,
  dailyOperatorNotification,
  latestExpectedDailyOperatorRun,
  scheduledAtWeekdaySevenEastern,
} from "../app/dailyOperator.ts";

test("weekday 7 AM Eastern slots and run keys remain stable across DST", () => {
  assert.equal(scheduledAtWeekdaySevenEastern("2026-08-10T11:00:00.000Z"), true);
  assert.equal(scheduledAtWeekdaySevenEastern("2027-01-04T12:00:00.000Z"), true);
  assert.equal(scheduledAtWeekdaySevenEastern("2026-08-09T11:00:00.000Z"), false);
  assert.equal(scheduledAtWeekdaySevenEastern("2026-08-10T12:00:00.000Z"), false);
  assert.equal(scheduledAtWeekdaySevenEastern("2026-08-10T11:00:30.000Z"), false);

  assert.equal(
    dailyOperatorRunKey("2026-08-10T11:00:00.000Z"),
    "daily-operator|2026-08-10",
  );
  assert.equal(
    dailyOperatorRunKey("2027-01-04T12:00:00.000Z"),
    "daily-operator|2027-01-04",
  );
  assert.equal(dailyOperatorRunKey("not-a-date"), "");
});

test("a Daily Operator slot becomes missed only after its six-hour grace", () => {
  assert.equal(DAILY_OPERATOR_COMPLETION_GRACE_MS, 6 * 3_600_000);
  assert.equal(
    latestExpectedDailyOperatorRun(new Date("2026-08-10T10:59:00.000Z")),
    "2026-08-07T11:00:00.000Z",
  );
  assert.equal(
    latestExpectedDailyOperatorRun(new Date("2026-08-10T11:01:00.000Z")),
    "2026-08-07T11:00:00.000Z",
  );
  assert.equal(
    latestExpectedDailyOperatorRun(new Date("2026-08-10T17:01:00.000Z")),
    "2026-08-10T11:00:00.000Z",
  );
  assert.equal(
    latestExpectedDailyOperatorRun(new Date("2027-01-04T18:01:00.000Z")),
    "2027-01-04T12:00:00.000Z",
  );
});

test("the learner is notified only after durable readiness or for intervention", () => {
  assert.deepEqual(dailyOperatorNotification({
    assignmentState: "ready",
    assignmentAccepted: true,
    archivePreserved: true,
    exactReplay: false,
    interventionReason: "",
  }), {
    decision: "NOTIFY",
    reason: "brief_ready",
  });

  assert.deepEqual(dailyOperatorNotification({
    assignmentState: "ready",
    assignmentAccepted: true,
    archivePreserved: false,
    exactReplay: false,
    interventionReason: "",
  }), {
    decision: "NOTIFY",
    reason: "archive_intervention",
  });

  assert.deepEqual(dailyOperatorNotification({
    assignmentState: "brief_unavailable",
    assignmentAccepted: true,
    archivePreserved: true,
    exactReplay: false,
    interventionReason: "No complete lawful four-lane Brief passed validation.",
  }), {
    decision: "NOTIFY",
    reason: "learner_intervention",
  });

  assert.deepEqual(dailyOperatorNotification({
    assignmentState: "intentionally_displaced",
    assignmentAccepted: true,
    archivePreserved: true,
    exactReplay: false,
    interventionReason: "",
  }), {
    decision: "DONT_NOTIFY",
    reason: "intentional_displacement",
  });

  assert.deepEqual(dailyOperatorNotification({
    assignmentState: "ready",
    assignmentAccepted: true,
    archivePreserved: true,
    exactReplay: true,
    interventionReason: "",
  }), {
    decision: "DONT_NOTIFY",
    reason: "exact_replay",
  });
});
