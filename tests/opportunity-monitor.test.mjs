import assert from "node:assert/strict";
import test from "node:test";

import {
  materialOpportunityChanges,
  MONITOR_TARGETS,
  latestExpectedMonitorRun,
  monitorRunKey,
  scheduledAtMondayEightEastern,
  validateOpportunityMonitorRun,
} from "../app/opportunityMonitor.ts";

const baseSnapshot = {
  targetKey: "bessemer-analyst-program",
  firm: "Bessemer Venture Partners",
  roleTitle: "Summer Analyst 2027",
  cycleKey: "summer-analyst-2027",
  officialUrl: "https://job-boards.greenhouse.io/bvpanalyst/jobs/4633431005",
  location: "New York, NY",
  workMode: "On site",
  status: "Open",
  opportunityClass: "Qualifying Internship",
  funnelClass: "Qualified role",
  publishedDeadline: "",
  deadlineTimezone: "Not stated",
  compensationEvidence: "$2,200 per week plus a $5,000 relocation and housing payment.",
  roleScope: "Ten-week full-time investment role with sourcing and diligence.",
  qualificationReason: "Paid direct investment-team work.",
  immigrationState: "General eligibility",
  immigrationEvidence: "The application accepts a Student Visa or Work Visa response; role authorization is not established.",
  authorizationClaim: false,
  nextAction: "Obtain role-specific DSO evidence before making an authorization claim.",
  dueDate: "2026-08-10",
  observedOn: "2026-08-08",
  timezone: "America/Chicago",
  decisionRequired: false,
  decisionReason: "",
};

function runInput() {
  return {
    scheduledFor: "2026-08-03T12:00:00.000Z",
    checks: MONITOR_TARGETS.map((target) => ({
      targetKey: target.key,
      checkedAt: "2026-08-08T15:00:00.000Z",
      outcome: "reachable",
      failureCode: "",
      failureSummary: "",
      snapshots: target.key === baseSnapshot.targetKey ? [baseSnapshot] : [],
    })),
  };
}

test("monitor registry is unique and accepts only first-party HTTPS targets", () => {
  assert.ok(MONITOR_TARGETS.length >= 7);
  assert.equal(new Set(MONITOR_TARGETS.map((target) => target.key)).size, MONITOR_TARGETS.length);
  for (const target of MONITOR_TARGETS) {
    assert.equal(new URL(target.sourceUrl).protocol, "https:");
    assert.ok(target.allowedHosts.includes(new URL(target.sourceUrl).hostname));
  }
});

test("Monday 8 AM Eastern schedule validation is DST-safe", () => {
  assert.equal(scheduledAtMondayEightEastern("2026-08-10T12:00:00.000Z"), true);
  assert.equal(scheduledAtMondayEightEastern("2027-01-04T13:00:00.000Z"), true);
  assert.equal(scheduledAtMondayEightEastern("2026-08-10T13:00:00.000Z"), false);
  assert.equal(scheduledAtMondayEightEastern("2026-08-09T12:00:00.000Z"), false);
  assert.equal(monitorRunKey("2026-08-10T12:00:00.000Z"), "opportunity-monitor|2026-08-10");
  assert.equal(latestExpectedMonitorRun(new Date("2026-08-10T11:59:00.000Z")), "2026-08-03T12:00:00.000Z");
  assert.equal(latestExpectedMonitorRun(new Date("2026-08-10T12:01:00.000Z")), "2026-08-03T12:00:00.000Z");
  assert.equal(latestExpectedMonitorRun(new Date("2026-08-10T18:01:00.000Z")), "2026-08-10T12:00:00.000Z");
  assert.equal(latestExpectedMonitorRun(new Date("2027-01-04T19:01:00.000Z")), "2027-01-04T13:00:00.000Z");
});

test("material comparison ignores rechecks but catches deadline, pay, status, classification, and visa evidence", () => {
  assert.deepEqual(materialOpportunityChanges(baseSnapshot, { ...baseSnapshot, observedOn: "2026-08-09" }), []);
  const changed = materialOpportunityChanges(baseSnapshot, {
    ...baseSnapshot,
    status: "Closed",
    opportunityClass: "Investing Milestone",
    funnelClass: "Archived",
    publishedDeadline: "2026-08-09",
    compensationEvidence: "No compensation is established on the first-party page.",
    immigrationState: "Unknown",
    immigrationEvidence: "The page no longer states a student-visa response.",
  });
  assert.deepEqual(changed, [
    "status", "opportunityClass", "funnelClass", "publishedDeadline",
    "compensationEvidence", "immigrationState", "immigrationEvidence",
  ]);
});

test("run validation requires every registered page once and rejects future, off-schedule, or non-first-party evidence", () => {
  const valid = runInput();
  assert.equal(validateOpportunityMonitorRun(valid, new Date("2026-08-08T16:00:00.000Z")), null);

  assert.match(validateOpportunityMonitorRun({ ...valid, checks: valid.checks.slice(1) }, new Date("2026-08-08T16:00:00.000Z")) ?? "", /every registered first-party target/i);
  assert.match(validateOpportunityMonitorRun({ ...valid, scheduledFor: "2026-08-03T13:00:00.000Z" }, new Date("2026-08-08T16:00:00.000Z")) ?? "", /Monday at 8:00 AM Eastern/i);
  assert.match(validateOpportunityMonitorRun({ ...valid, checks: valid.checks.map((check, index) => index === 0 ? { ...check, checkedAt: "2026-08-09T15:00:00.000Z" } : check) }, new Date("2026-08-08T16:00:00.000Z")) ?? "", /future/i);
  assert.match(validateOpportunityMonitorRun({ ...valid, checks: valid.checks.map((check) => check.targetKey === baseSnapshot.targetKey ? { ...check, snapshots: [{ ...baseSnapshot, officialUrl: "https://example.com/fake-role" }] } : check) }, new Date("2026-08-08T16:00:00.000Z")) ?? "", /first-party host/i);
  assert.match(validateOpportunityMonitorRun({ ...valid, checks: valid.checks.map((check) => check.targetKey === baseSnapshot.targetKey ? { ...check, snapshots: [{ ...baseSnapshot, immigrationState: "Authorized", authorizationClaim: true }] } : check) }, new Date("2026-08-08T16:00:00.000Z")) ?? "", /cannot claim role authorization/i);
});

test("one stable first-party page may preserve distinct annual cycles in the same run", () => {
  const valid = runInput();
  const nextCycle = { ...baseSnapshot, roleTitle: "Summer Analyst 2028", cycleKey: "summer-analyst-2028" };
  const twoCycles = {
    ...valid,
    checks: valid.checks.map((check) => check.targetKey === baseSnapshot.targetKey ? { ...check, snapshots: [baseSnapshot, nextCycle] } : check),
  };
  assert.equal(validateOpportunityMonitorRun(twoCycles, new Date("2026-08-08T16:00:00.000Z")), null);
});

test("an Open opportunity past its published deadline is a stale-deadline decision, not silent current state", () => {
  const valid = runInput();
  const staleSnapshot = { ...baseSnapshot, publishedDeadline: "2026-08-07" };
  const stale = { ...valid, checks: valid.checks.map((check) => check.targetKey === baseSnapshot.targetKey ? { ...check, snapshots: [staleSnapshot] } : check) };
  assert.match(validateOpportunityMonitorRun(stale, new Date("2026-08-08T16:00:00.000Z")) ?? "", /requires a learner decision/i);
  const decisionSnapshot = { ...staleSnapshot, decisionRequired: true, decisionReason: "The page remains open after its stated deadline; decide whether to verify or archive." };
  assert.equal(validateOpportunityMonitorRun({ ...valid, checks: valid.checks.map((check) => check.targetKey === baseSnapshot.targetKey ? { ...check, snapshots: [decisionSnapshot] } : check) }, new Date("2026-08-08T16:00:00.000Z")), null);
});

test("failure checks are bounded and require no fabricated opportunity snapshots", () => {
  const valid = runInput();
  const failureRun = {
    ...valid,
    checks: valid.checks.map((check, index) => index === 0 ? {
      ...check,
      outcome: "failure",
      failureCode: "unreachable",
      failureSummary: "The first-party page returned no usable response after a bounded retry.",
      snapshots: [],
    } : check),
  };
  assert.equal(validateOpportunityMonitorRun(failureRun, new Date("2026-08-08T16:00:00.000Z")), null);
  assert.match(validateOpportunityMonitorRun({ ...failureRun, checks: failureRun.checks.map((check, index) => index === 0 ? { ...check, snapshots: [baseSnapshot] } : check) }, new Date("2026-08-08T16:00:00.000Z")) ?? "", /failure cannot include opportunity snapshots/i);
});

test("a complete monitor run is bounded before its canonical checks are persisted", () => {
  const valid = runInput();
  const oversized = {
    ...valid,
    checks: valid.checks.map((check, index) => index === 0 ? { ...check, failureSummary: "x".repeat(100_001) } : check),
  };
  assert.match(validateOpportunityMonitorRun(oversized, new Date("2026-08-08T16:00:00.000Z")) ?? "", /too large/i);
});
