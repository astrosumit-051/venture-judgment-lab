import assert from "node:assert/strict";
import test from "node:test";

import {
  dailyRunChecksum,
  validateDailyRun,
} from "../app/dailyAssignment.ts";
import { dailyOperatorRunKey, scheduledAtWeekdaySevenEastern } from "../app/dailyOperator.ts";

const lanes = [
  "Current signal",
  "Durable investing insight",
  "Cross-domain input",
  "Career or freeflow",
];

function reading(lane, index) {
  return {
    readingId: `2026-08-13-${index}`,
    lane,
    title: `Source ${index}`,
    subtitle: "not stated",
    authorOrOrganization: `Author ${index}`,
    publisher: `Publisher ${index}`,
    sourceType: "Official documentation",
    sourceRole: index < 2 ? "Evidence owner" : "Interpretation",
    claimRole: index < 2 ? "primary" : "mixed",
    issuerInterest: "No material issuer interest identified.",
    canonicalUrl: `https://example.com/source-${index}`,
    persistentIdentifier: "not stated",
    publishedDate: lane === "Current signal" ? "2026-08-12" : "2024-01-01",
    sourceUpdatedDate: "not stated",
    accessedAt: "2026-08-13T10:45:00.000Z",
    linkVerifiedAt: "2026-08-13T10:45:00.000Z",
    linkResolves: true,
    estimatedMinutes: 10,
    assignedSection: "Full article",
    rightsOrLicense: "All rights reserved; metadata and link only.",
    accessMode: "open_web",
    materialReviewed: "full_text",
    archiveUrl: "not stated",
    archivedAt: "not stated",
    versionStatus: "Current version checked; no correction identified.",
    sectorContext: `Sector ${index}`,
    viewpoint: `Viewpoint ${index}`,
    viewpointRole: index === 3 ? "contrary" : index === 2 ? "orthogonal" : "supporting",
    underlyingEventOrClaimFingerprint: `bounded-claim-${index}`,
    corroborationSourceRole: "Evidence owner",
    corroborationUrl: `https://example.com/corroboration-${index}`,
    teachingPurpose: "Develop evidence-weighted judgment from a bounded source.",
    carryQuestion: "What evidence would change the current view?",
    downstreamTarget: "Snapshot Judgment",
    selectionRationale: "This source is more direct than the most obvious commentary alternative.",
    corroborationNotes: "The material claim was checked against evidence-owner documentation.",
    sourceReview: "The named organization owns the underlying evidence.",
    contextReview: "The publication context and incentives were reviewed.",
    claimReview: "The claim studied is bounded and explicitly identified.",
    evidenceReview: "The cited evidence directly supports the bounded claim.",
    corroborationReview: "Independent context or owner evidence was checked.",
    freshnessException: "",
    deduplicationStatus: "new",
    relatedReadingId: "",
    copyrightExcerpt: "",
    independentFirstPassWithheld: true,
  };
}

function readyRun() {
  return {
    scheduledFor: "2026-08-13T11:00:00.000Z",
    profileVersion: "normal-2026-v1",
    notificationIntent: "brief_ready",
    coachRequestIds: [],
    coachFeedbackIds: [],
    sourceStatusEventIds: [],
    assignment: {
      state: "ready",
      learnerDate: "2026-08-13",
      timezone: "America/Chicago",
      brief: {
        briefVersion: "2026-08-13-v1",
        carryForward: "Carry the strongest disconfirming evidence into the company screen.",
        readings: lanes.map(reading),
      },
    },
  };
}

test("a complete four-lane Daily Brief passes the pre-delivery contract", () => {
  assert.equal(validateDailyRun(readyRun()), null);
  assert.match(validateDailyRun({ ...readyRun(), ownerId: "caller-selected-owner" }) ?? "", /derived only from the registered automation credential/i);
  assert.match(validateDailyRun({ ...readyRun(), unexpected: "not stored" }) ?? "", /undeclared field/i);
  const nestedExtra = readyRun();
  nestedExtra.assignment.brief.readings[0].rawPageContent = "must not enter the private record";
  assert.match(validateDailyRun(nestedExtra) ?? "", /undeclared field/i);
});

test("the Daily Brief contract rejects missing evidence gates and learner answers", () => {
  const missingGate = readyRun();
  delete missingGate.assignment.brief.readings[0].claimReview;
  assert.match(validateDailyRun(missingGate) ?? "", /complete source, context, claim, evidence, and corroboration review/i);

  const prematureAnswer = readyRun();
  prematureAnswer.assignment.brief.readings[0].learnerResponse = "An answer must append after delivery.";
  assert.match(validateDailyRun(prematureAnswer) ?? "", /learner response/i);
});

test("the Daily Brief contract enforces diversity, freshness, deduplication, and time", () => {
  const samePublisher = readyRun();
  samePublisher.assignment.brief.readings[1].publisher = "Publisher 0";
  assert.match(validateDailyRun(samePublisher) ?? "", /publisher diversity/i);

  const staleSignal = readyRun();
  staleSignal.assignment.brief.readings[0].publishedDate = "2026-07-01";
  staleSignal.assignment.brief.readings[0].freshnessException = "This became newly relevant today.";
  assert.match(validateDailyRun(staleSignal) ?? "", /30 days/i);

  const accidentalDuplicate = readyRun();
  accidentalDuplicate.assignment.brief.readings[1].canonicalUrl = accidentalDuplicate.assignment.brief.readings[0].canonicalUrl;
  assert.match(validateDailyRun(accidentalDuplicate) ?? "", /duplicate/i);

  const tooLong = readyRun();
  tooLong.assignment.brief.readings[3].estimatedMinutes = 30;
  assert.match(validateDailyRun(tooLong) ?? "", /55 minutes/i);
});

test("ready readings require privacy-safe HTTPS sources and bounded domain enums", () => {
  const insecure = readyRun();
  insecure.assignment.brief.readings[0].canonicalUrl = "http://example.com/source";
  assert.match(validateDailyRun(insecure) ?? "", /privacy-safe HTTPS/i);

  const credential = readyRun();
  credential.assignment.brief.readings[0].canonicalUrl = "https://user:secret@example.com/source";
  assert.match(validateDailyRun(credential) ?? "", /credentials/i);

  const sourceRole = readyRun();
  sourceRole.assignment.brief.readings[0].sourceRole = "Prestigious source";
  assert.match(validateDailyRun(sourceRole) ?? "", /source role/i);

  const downstream = readyRun();
  downstream.assignment.brief.readings[0].downstreamTarget = "Anything later";
  assert.match(validateDailyRun(downstream) ?? "", /downstream target/i);
});

test("a new run is accepted only inside its six-hour completion grace", () => {
  const input = readyRun();
  assert.equal(validateDailyRun(input, new Date("2026-08-13T16:59:59.000Z")), null);
  assert.match(validateDailyRun(input, new Date("2026-08-13T17:00:01.000Z")) ?? "", /six-hour completion grace/i);
});

test("unavailable and displaced outcomes preserve bounded reasons without invented readings", () => {
  const unavailable = {
    scheduledFor: "2026-08-13T11:00:00.000Z",
    profileVersion: "normal-2026-v1",
    notificationIntent: "intervention_required",
    coachRequestIds: [],
    coachFeedbackIds: [],
    sourceStatusEventIds: [],
    assignment: {
      state: "brief_unavailable",
      learnerDate: "2026-08-13",
      timezone: "America/Chicago",
      reason: "A complete four-source brief could not pass the access gate.",
      nextAction: "Investigate the bounded source failure; do not reuse yesterday's Brief.",
    },
  };
  assert.equal(validateDailyRun(unavailable), null);
  assert.equal(validateDailyRun({ ...unavailable, assignment: { ...unavailable.assignment, brief: readyRun().assignment.brief } }), "An unavailable or displaced assignment cannot contain invented Brief readings.");

  const displaced = structuredClone(unavailable);
  displaced.assignment.state = "intentionally_displaced";
  displaced.assignment.reason = "Exam Mode schedules the single weekly Brief on Friday.";
  displaced.assignment.nextAction = "No catch-up debt; continue the approved Exam Mode plan.";
  displaced.notificationIntent = "none";
  assert.equal(validateDailyRun(displaced), null);
});

test("run identity and checksum are stable while different evidence conflicts", async () => {
  const input = readyRun();
  assert.equal(dailyOperatorRunKey(input.scheduledFor), "daily-operator|2026-08-13");
  assert.equal(await dailyRunChecksum(input), await dailyRunChecksum(structuredClone(input)));
  const changed = structuredClone(input);
  changed.assignment.brief.carryForward = "Different evidence.";
  assert.notEqual(await dailyRunChecksum(input), await dailyRunChecksum(changed));
});

test("7 AM Eastern weekday schedule validation is DST-safe", () => {
  assert.equal(scheduledAtWeekdaySevenEastern("2026-08-13T11:00:00.000Z"), true);
  assert.equal(scheduledAtWeekdaySevenEastern("2027-01-14T12:00:00.000Z"), true);
  assert.equal(scheduledAtWeekdaySevenEastern("2026-08-15T11:00:00.000Z"), false);
  assert.equal(scheduledAtWeekdaySevenEastern("2026-08-13T12:00:00.000Z"), false);
  assert.match(
    validateDailyRun({ ...readyRun(), scheduledFor: "2027-01-14T12:00:00.000Z" }, new Date("2026-08-13T12:00:00.000Z")) ?? "",
    /before its scheduled slot/i,
  );
});
