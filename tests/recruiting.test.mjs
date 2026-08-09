import assert from "node:assert/strict";
import test from "node:test";

import {
  computeRecruitingMetrics,
  RECRUITING_TARGET_SEEDS,
  recruitingRecordKey,
  validateRecruitingPayload,
} from "../app/recruiting.ts";

const opportunityPayload = {
  firm: "Verification Ventures",
  roleTitle: "Summer Investor",
  opportunityClass: "Qualifying Internship",
  funnelClass: "Qualified role",
  officialUrl: "https://example.com/role",
  normalizedOfficialUrl: "https://example.com/role",
  location: "New York, NY",
  workMode: "On site",
  discoveredOn: "2026-08-08",
  verifiedOn: "2026-08-08",
  timezone: "America/Chicago",
  initialStatus: "Open",
  publishedDeadline: "",
  deadlineTimezone: "Not stated",
  compensationEvidence: "$1,000 per week in the official posting.",
  roleScope: "Sourcing, diligence, and investment-team exposure.",
  qualificationReason: "Paid investment-team work with direct early-stage judgment exposure.",
  immigrationState: "General eligibility",
  immigrationEvidence: "The learner has general CPT eligibility; role fit is not DSO-confirmed.",
  authorizationClaim: false,
  nextAction: "Confirm role-specific CPT fit before submission.",
  dueDate: "2026-08-10",
};

function record(id, recordType, parentId, payload, committedAt = "2026-08-08T12:00:00.000Z") {
  return { id, recordType, parentId, title: id, payload, committedAt };
}

test("qualifying-role funnel metrics exclude milestones and count real stage evidence once", () => {
  const records = [
    record("role-1", "recruiting_opportunity", null, opportunityPayload),
    record("milestone-1", "recruiting_opportunity", null, {
      ...opportunityPayload,
      firm: "Milestone Program",
      roleTitle: "Student Fellow",
      officialUrl: "https://example.com/milestone",
      normalizedOfficialUrl: "https://example.com/milestone",
      opportunityClass: "Investing Milestone",
      funnelClass: "Qualified role",
    }),
    record("referral", "recruiting_interaction", "role-1", {
      interactionKind: "Referral",
      interactionState: "Received",
    }),
    record("application", "application_attempt", "role-1", { attemptState: "Submitted" }),
    record("interview", "recruiting_interaction", "role-1", {
      interactionKind: "Interview",
      interactionState: "Completed",
    }),
    record("offer", "opportunity_observation", "role-1", {
      observedOn: "2026-08-12",
      status: "Offer",
      immigrationState: "Employer-compatible",
      nextAction: "Obtain the DSO authorization before work begins.",
      dueDate: "2026-08-14",
    }, "2026-08-12T12:00:00.000Z"),
  ];

  const metrics = computeRecruitingMetrics(records);

  assert.equal(metrics.qualifiedRoles, 1);
  assert.equal(metrics.referrals, 1);
  assert.equal(metrics.applications, 1);
  assert.equal(metrics.interviews, 1);
  assert.equal(metrics.offers, 1);
  assert.equal(metrics.milestones, 1);
  assert.equal(metrics.rows.find((row) => row.id === "role-1").currentStatus, "Offer");
});

test("authorization and external-action claims require the exact evidence state and approval", () => {
  assert.match(
    validateRecruitingPayload("recruiting_opportunity", {
      ...opportunityPayload,
      authorizationClaim: true,
    }, "2026-08-08") ?? "",
    /only the Authorized state/i,
  );

  assert.match(
    validateRecruitingPayload("application_attempt", {
      opportunityId: "role-1",
      attemptedOn: "2026-08-08",
      timezone: "America/Chicago",
      attemptState: "Submitted",
      artifactChecklist: "Resume and transcript attached.",
      claimLedger: "Every claim checked against the Private Learning Record.",
      authorizationStatement: "No role authorization claimed.",
      immigrationState: "General eligibility",
      authorizationClaim: false,
      confirmationReference: "confirmation-123",
      approvalConfirmed: false,
      nextAction: "Preserve the employer response.",
      dueDate: "2026-08-10",
    }, "2026-08-08") ?? "",
    /explicit learner approval/i,
  );

  assert.match(
    validateRecruitingPayload("recruiting_interaction", {
      opportunityId: "role-1",
      interactionKind: "Inquiry",
      direction: "Outbound",
      interactionState: "Sent",
      occurredOn: "2026-08-08",
      timezone: "America/Chicago",
      counterpartyRole: "Recruiting contact",
      evidenceSummary: "A bounded inquiry summary without raw correspondence.",
      outcome: "Waiting",
      nextAction: "Wait for a reply.",
      dueDate: "2026-08-12",
      approvalConfirmed: false,
      privateEvidenceConfirmed: true,
    }, "2026-08-08") ?? "",
    /explicit learner approval/i,
  );

  assert.match(
    validateRecruitingPayload("application_attempt", {
      opportunityId: "role-1",
      attemptedOn: "2026-08-08",
      timezone: "America/Chicago",
      attemptState: "Draft",
      artifactChecklist: "Resume checked.",
      claimLedger: "Claims checked.",
      authorizationStatement: "I am authorized for this role. No role authorization claimed.",
      immigrationState: "General eligibility",
      authorizationClaim: false,
      approvalConfirmed: false,
      nextAction: "Obtain role-specific evidence.",
      dueDate: "2026-08-10",
    }, "2026-08-08") ?? "",
    /No role authorization claimed/i,
  );
});

test("verified target seeds preserve live classification and status boundaries", () => {
  const bessemer = RECRUITING_TARGET_SEEDS.find((target) => target.firm === "Bessemer Venture Partners");
  const keyhorse = RECRUITING_TARGET_SEEDS.find((target) => target.firm === "Keyhorse Capital");

  assert.equal(bessemer?.opportunityClass, "Qualifying Internship");
  assert.equal(bessemer?.initialStatus, "Open");
  assert.equal(keyhorse?.opportunityClass, "Relationship-led target");
  assert.equal(keyhorse?.initialStatus, "No public opening");
  assert.equal(recruitingRecordKey("recruiting_opportunity", opportunityPayload), "https://example.com/role");
});

test("child identity rejects exact duplicates without colliding materially different same-day evidence", () => {
  const first = {
    opportunityId: "role-1",
    occurredOn: "2026-08-08",
    interactionKind: "Referral",
    interactionState: "Received",
    counterpartyRole: "Alumnus",
    evidenceSummary: "First material outcome.",
  };
  const second = { ...first, evidenceSummary: "A materially different outcome." };
  assert.equal(recruitingRecordKey("recruiting_interaction", first), recruitingRecordKey("recruiting_interaction", { ...first }));
  assert.notEqual(recruitingRecordKey("recruiting_interaction", first), recruitingRecordKey("recruiting_interaction", second));
});

test("evidence-backed reclassification can qualify a role and later archival preserves its cumulative funnel", () => {
  const records = [
    record("relationship-role", "recruiting_opportunity", null, {
      ...opportunityPayload,
      opportunityClass: "Relationship-led target",
      funnelClass: "Relationship target",
    }),
    record("qualified", "opportunity_observation", "relationship-role", {
      observedOn: "2026-08-09",
      status: "Open",
      opportunityClass: "Qualifying Internship",
      funnelClass: "Qualified role",
    }, "2026-08-09T12:00:00.000Z"),
    record("application", "application_attempt", "relationship-role", { attemptState: "Submitted" }),
    record("archived", "opportunity_observation", "relationship-role", {
      observedOn: "2026-08-10",
      status: "Closed",
      opportunityClass: "Qualifying Internship",
      funnelClass: "Archived",
    }, "2026-08-10T12:00:00.000Z"),
  ];
  const metrics = computeRecruitingMetrics(records);
  assert.equal(metrics.qualifiedRoles, 1);
  assert.equal(metrics.applications, 1);
  assert.equal(metrics.rows[0].currentStatus, "Closed");
  assert.equal(metrics.rows[0].funnelClass, "Archived");
});
