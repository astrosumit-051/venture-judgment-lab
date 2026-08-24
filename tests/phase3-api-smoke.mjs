import assert from "node:assert/strict";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const token = process.env.LAB_AUTOMATION_TOKEN;
assert.ok(token);
const suffix = Date.now();
const ownerHeaders = {
  "content-type": "application/json",
  "oai-authenticated-user-id": process.env.LAB_SMOKE_OWNER_ID ?? `phase3-${suffix}`,
  "oai-authenticated-user-email": `phase3-${suffix}@example.com`,
};
const otherHeaders = {
  "oai-authenticated-user-id": `phase3-other-${suffix}`,
  "oai-authenticated-user-email": `phase3-other-${suffix}@example.com`,
};

function parts(value, timezone) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value).map((part) => [part.type, part.value]));
}

function canonicalDate(value, timezone) {
  const valueParts = parts(value, timezone);
  return `${valueParts.year}-${valueParts.month}-${valueParts.day}`;
}

function latestWeekdaySevenEastern() {
  const cursor = new Date(process.env.LAB_API_SMOKE_NOW ?? Date.now());
  cursor.setUTCMinutes(0, 0, 0);
  for (let hours = 0; hours < 8 * 24; hours += 1) {
    const valueParts = parts(cursor, "America/New_York");
    if (!["Sat", "Sun"].includes(valueParts.weekday) && valueParts.hour === "07") return new Date(cursor);
    cursor.setTime(cursor.getTime() - 3_600_000);
  }
  throw new Error("No recent weekday Daily Operator slot.");
}

async function json(path, options, expected) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  assert.equal(response.status, expected, JSON.stringify(body));
  return body;
}

async function lab(body, expected = 201, headers = ownerHeaders) {
  return json("/api/lab", { method: "POST", headers, body: JSON.stringify(body) }, expected);
}

async function automation(path, method, body, expected, submittedToken = token) {
  return json(path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(submittedToken ? { authorization: `Bearer ${submittedToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, expected);
}

const scheduled = latestWeekdaySevenEastern();
const scheduledFor = scheduled.toISOString();
const learnerDate = canonicalDate(scheduled, "America/Chicago");
const futureLearnerDate = canonicalDate(new Date(scheduled.getTime() + 86_400_000), "America/Chicago");
const scheduledWeekday = parts(scheduled, "America/Chicago").weekday;
const currentLearnerDate = canonicalDate(new Date(), "America/Chicago");
const forecastResolutionDate = canonicalDate(new Date(Date.now() + 45 * 86_400_000), "America/Chicago");

await automation("/api/automation/daily", "GET", undefined, 401, "wrong-token");
const currentRegistration = await lab({
  operation: "register_lab_automation",
  timezone: "America/Chicago",
  practiceMode: "Normal Week",
  effectiveLearnerDate: learnerDate,
  expectedWeekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  notificationPreference: "ready_and_intervention",
}, 200);
assert.equal(currentRegistration.registered, true);
const registrationReplay = await lab({
  operation: "register_lab_automation",
  timezone: "America/Chicago",
  practiceMode: "Normal Week",
  effectiveLearnerDate: learnerDate,
  expectedWeekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  notificationPreference: "ready_and_intervention",
}, 200);
assert.equal(registrationReplay.profileId, currentRegistration.profileId);
assert.equal(registrationReplay.idempotent, true);
const futureRegistration = await lab({
  operation: "register_lab_automation",
  timezone: "America/Chicago",
  practiceMode: "Normal Week",
  effectiveLearnerDate: futureLearnerDate,
  expectedWeekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  notificationPreference: "ready_and_intervention",
});
assert.notEqual(futureRegistration.profileId, currentRegistration.profileId);
await lab({
  operation: "register_lab_automation",
  timezone: "America/New_York",
  practiceMode: "Exam Mode",
  effectiveLearnerDate: canonicalDate(new Date(scheduled.getTime() - 2 * 86_400_000), "America/Chicago"),
  expectedWeekdays: ["Fri"],
  notificationPreference: "ready_and_intervention",
}, 409);

const lanes = ["Current signal", "Durable investing insight", "Cross-domain input", "Career or freeflow"];
const readings = lanes.map((lane, index) => ({
  readingId: `${learnerDate}-phase3-${index}`,
  lane,
  title: `Phase 3 source ${index + 1}`,
  subtitle: "not stated",
  authorOrOrganization: `Phase 3 author ${index + 1}`,
  publisher: `Phase 3 publisher ${index + 1}`,
  sourceType: "Official documentation",
  sourceRole: index < 2 ? "Evidence owner" : "Interpretation",
  claimRole: index < 2 ? "primary" : "mixed",
  issuerInterest: "No material issuer interest identified.",
  canonicalUrl: `https://example.com/phase3-source-${suffix}-${index}`,
  persistentIdentifier: "not stated",
  publishedDate: lane === "Current signal" ? learnerDate : "2024-01-01",
  sourceUpdatedDate: "not stated",
  accessedAt: scheduledFor,
  linkVerifiedAt: scheduledFor,
  linkResolves: true,
  estimatedMinutes: 10,
  assignedSection: "Full article",
  rightsOrLicense: "Metadata and link only.",
  accessMode: "open_web",
  materialReviewed: "full_text",
  archiveUrl: "not stated",
  archivedAt: "not stated",
  sourceStatus: "available",
  versionStatus: "Current version checked.",
  sectorContext: `Sector ${index + 1}`,
  viewpoint: `Viewpoint ${index + 1}`,
  viewpointRole: index === 3 ? "contrary" : index === 2 ? "orthogonal" : "supporting",
  underlyingEventOrClaimFingerprint: `phase3-claim-${suffix}-${index}`,
  corroborationSourceRole: "Evidence owner",
  corroborationUrl: `https://example.com/phase3-corroboration-${suffix}-${index}`,
  teachingPurpose: "Develop evidence-weighted judgment from a bounded source.",
  carryQuestion: "What evidence would change the current view?",
  downstreamTarget: "Snapshot Judgment",
  selectionRationale: "This source is more direct than the obvious commentary alternative.",
  corroborationNotes: "The bounded claim was checked against owner evidence.",
  labSummary: "Synthetic source metadata for the isolated live API proof.",
  sourceReview: "The source identity and incentives were checked.",
  contextReview: "The publication context was checked.",
  claimReview: "The studied claim is explicitly bounded.",
  evidenceReview: "The evidence directly supports the bounded claim.",
  corroborationReview: "Owner or independent corroboration was checked.",
  freshnessException: "",
  deduplicationStatus: "new",
  relatedReadingId: "",
  copyrightExcerpt: "",
  independentFirstPassWithheld: true,
}));

const preCurriculumDrafts = await Promise.all([
  json("/api/lab/conversations", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({ workflow: "sourcing_lead" }),
  }, 201),
  json("/api/lab/conversations", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({ workflow: "snapshot_judgment" }),
  }, 201),
]);
assert.equal(preCurriculumDrafts.every((item) => item.conversation.phase === "collecting"), true);

const runInput = {
  contractVersion: "course_first_v1",
  curriculum: {
    epoch: {
      contractVersion: "course_first_v1",
      epochKey: `course-first|${learnerDate}`,
      startedLearnerDate: learnerDate,
      timezone: "America/Chicago",
      destination: "Summer 2027 early-stage investing role",
      breadthRotations: [
        "AI and data systems",
        "Industrial and climate systems",
        "Fintech infrastructure",
        "Digital health and bio tools",
        "Enterprise software",
        "Cybersecurity and digital trust",
      ],
      confirmationWeeksPerFinalist: 3,
      postCycleAllocation: { provisionalFocus: 70, runnerUpAndDisconfirmation: 30 },
      weekdayMinutes: 105,
      normalWeekMinutes: 720,
      calibrationWeekMinutes: 720,
    },
    practiceDay: {
      contractVersion: "course_first_v1",
      practiceDayKey: `course-first|${learnerDate}|${learnerDate}`,
      learnerDate,
      curriculumDay: 1,
      rotationWeek: 1,
      phase: "breadth",
      sector: "AI and data systems",
      rotationTitle: "AI & Data Systems Rotation",
      teachingPurpose: "Build conviction in data infrastructure and AI tooling.",
      whyToday: [
        "Build judgment on technical depth and defensibility.",
        "Practice independent sourcing and founder-market-fit reasoning.",
        "Strengthen falsifiable thinking with one clear forecast.",
      ],
      sourcingPrompt: {
        surface: "Recent accelerator launches and founder product announcements.",
        hypothesis: "Early AI infrastructure products with workflow pull will show evidence beyond demo novelty.",
        companyNamesWithheld: true,
      },
      checkpoints: [
        { id: "readings", label: "Read four curated readings", minutes: 55 },
        { id: "scan_and_judge", label: "Scan three early-stage companies, then choose and judge one", minutes: 25 },
        { id: "forecast", label: "Commit one falsifiable forecast", minutes: 10 },
        { id: "recruiting", label: "Complete one small recruiting action", minutes: 10 },
        { id: "preserve", label: "Review and preserve", minutes: 5 },
      ],
      totalMinutes: 105,
    },
  },
  scheduledFor,
  profileVersion: currentRegistration.profileVersion,
  notificationIntent: "brief_ready",
  coachRequestIds: [],
  coachFeedbackIds: [],
  sourceStatusEventIds: [],
  assignment: {
    state: "ready",
    learnerDate,
    timezone: "America/Chicago",
    brief: {
      briefVersion: `${learnerDate}-phase3-v1`,
      carryForward: "Carry the strongest disconfirming evidence into the company screen.",
      readings,
    },
  },
};
assert.ok(["Mon", "Tue", "Wed", "Thu", "Fri"].includes(scheduledWeekday));
await automation("/api/automation/daily", "POST", {
  ...runInput,
  profileVersion: futureRegistration.profileVersion,
}, 409);
const accepted = await automation("/api/automation/daily", "POST", runInput, 201);
assert.equal(accepted.state, "ready");
assert.equal(accepted.archivePreserved, false);
assert.ok(accepted.epochId);
assert.ok(accepted.practiceDayId);
assert.ok(accepted.dailyBriefId);
assert.equal(accepted.assignmentRecordId, accepted.dailyBriefId);
const linkedForecastPayload = {
  practiceDayId: accepted.practiceDayId,
  claim: "At least one observed AI infrastructure workflow will publish a durable usage signal before resolution.",
  probability: 60,
  resolutionDate: forecastResolutionDate,
  supportingEvidence: "The assigned route contains an observed workflow-pull hypothesis, not a supplied company conclusion.",
  disconfirmingCondition: "No independently discovered company publishes a durable usage signal by resolution.",
  resolutionSource: "https://example.com/phase3-resolution",
  timezone: "America/Chicago",
};
await lab({
  operation: "commit_record",
  recordType: "forecast",
  title: "Backdated course-first linked forecast",
  payload: { ...linkedForecastPayload, committedLearnerDate: "2026-01-01" },
}, 400);
await lab({
  operation: "commit_record",
  recordType: "forecast",
  title: "Course-first linked forecast",
  payload: linkedForecastPayload,
});
await lab({
  operation: "commit_record",
  recordType: "forecast",
  title: "Cross-owner course-first linked forecast",
  payload: linkedForecastPayload,
}, 404, otherHeaders);
const sourcingExperiment = await lab({
  operation: "commit_record",
  recordType: "sourcing_experiment",
  title: "Course-first independent discovery surface",
  payload: {
    name: "AI infrastructure workflow-pull discovery",
    channel: "Technical ecosystem",
    targetSegment: "Early-stage AI infrastructure",
    searchSurface: "Founder product launches and technical ecosystem announcements",
    hypothesis: "Workflow pull will produce observable usage evidence beyond demo novelty.",
    leadingSignal: "A named workflow repeats after initial implementation.",
    nonConsensusRationale: "Technical workflow evidence may precede broad financing coverage.",
    startDate: currentLearnerDate,
    endDate: currentLearnerDate,
    plannedLeads: 3,
    successCondition: "Three independently discovered companies with traceable public provenance.",
    stopRule: "Stop after three companies and compare them before selecting one.",
    timezone: "America/Chicago",
  },
});
const baseLead = {
  experimentId: sourcingExperiment.id,
  attributionClass: "Independent discovery",
  channel: "Technical ecosystem",
  sourceVisibility: "Public source",
  discoveredOn: currentLearnerDate,
  sector: "AI and data systems",
  companyStage: "Seed",
  observedSignal: "A public product launch names a repeated technical workflow.",
  nonConsensusReason: "The workflow signal precedes broad financing coverage.",
  qualificationThesis: "Repeated technical adoption may compound into distribution and switching costs.",
  ventureMechanism: "Workflow data and integrations may strengthen retention over time.",
  disqualifier: "No evidence yet that early workflow pull persists across customers.",
  initialDisposition: "Advance to Snapshot",
  outreachAngle: "Ask what repeated after the first implementation.",
  nextAction: "Compare the observed product, why now, strongest signal, and key unknown.",
  dueDate: currentLearnerDate,
  initialStage: "discovered",
  timezone: "America/Chicago",
  privateEvidenceConfirmed: false,
  practiceDayId: accepted.practiceDayId,
};
await lab({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: "Assigned company cannot count toward Practice Day discovery",
  payload: {
    ...baseLead,
    company: "Assigned Phase 3 Co",
    companyUrl: `https://assigned-${suffix}.example.com`,
    attributionClass: "Assigned search",
    sourceVisibility: "Internal assignment",
    sourceReference: "Bounded internal assignment context.",
    privateEvidenceConfirmed: true,
  },
}, 400);
const courseFirstLeads = [];
for (let index = 0; index < 3; index += 1) courseFirstLeads.push(await lab({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: `Independent Phase 3 company ${index + 1}`,
  payload: {
    ...baseLead,
    company: `Independent Phase 3 Co ${index + 1}`,
    companyUrl: `https://independent-${suffix}-${index}.example.com`,
    sourceReference: `https://example.com/independent-phase3-${suffix}-${index}`,
  },
}));
await lab({
  operation: "advance_sourcing_lead",
  leadId: courseFirstLeads[0].id,
  progress: {
    leadId: courseFirstLeads[0].id,
    updateKind: "Sourcing Progress",
    occurredOn: currentLearnerDate,
    nextStage: "qualified",
    outreachChannel: "No outreach yet",
    observedEvidence: "The comparison preserved one causal mechanism and one explicit disqualifier.",
    relationshipQuality: "No direct interaction",
    outcome: "Active",
    nextAction: "Lock the concise independent Snapshot.",
    dueDate: currentLearnerDate,
    privateEvidenceConfirmed: true,
    timezone: "America/Chicago",
  },
});
const selectedSnapshotPayload = {
  practiceDayId: accepted.practiceDayId,
  sourcingLeadId: courseFirstLeads[0].id,
  company: "Independent Phase 3 Co 1",
  stage: "Seed",
  sector: "AI and data systems",
  discoverySource: "Independent discovery · Technical ecosystem",
  thesis: "The company matters if observed workflow pull persists beyond the launch context.",
  ventureMechanism: "Repeated integrations could compound workflow data and switching costs.",
  disposition: "Watch",
  confidence: 58,
  crux: "Whether usage repeats across independent customer workflows.",
  supportingEvidence: "A public launch names a repeated technical workflow.",
  supportingSourceUrl: `https://example.com/independent-phase3-${suffix}-0`,
  disconfirmingSignal: "No cross-customer retention evidence is public yet.",
  topUnknown: "Whether the observed workflow survives beyond the initial launch.",
  nextEvidence: "Find one customer-owned usage or retention signal.",
};
await lab({ operation: "commit_record", recordType: "snapshot_judgment", parentId: courseFirstLeads[0].id, title: "Selected course-first Snapshot", payload: selectedSnapshotPayload });
await lab({ operation: "commit_record", recordType: "snapshot_judgment", parentId: courseFirstLeads[0].id, title: "Duplicate course-first Snapshot", payload: selectedSnapshotPayload }, 409);
const archivedDrafts = await json("/api/lab/conversations", { headers: ownerHeaders }, 200);
assert.equal(archivedDrafts.conversations.filter((item) => preCurriculumDrafts.some((draft) => draft.conversation.id === item.id)).every((item) => (
  item.phase === "abandoned"
  && item.turns.at(-1).metadata.archiveReason === "pre_curriculum"
  && item.turns.at(-1).metadata.curriculumEpochKey === `course-first|${learnerDate}`
)), true);
const replay = await automation("/api/automation/daily", "POST", runInput, 200);
assert.equal(replay.idempotent, true);
await automation("/api/automation/daily", "POST", {
  ...runInput,
  assignment: { ...runInput.assignment, brief: { ...runInput.assignment.brief, carryForward: "Conflicting evidence." } },
}, 409);

await automation("/api/automation/daily", "POST", {
  operation: "append_event",
  recordId: accepted.readingIds[1],
  eventType: "source_status",
  eventData: {
    status: "moved",
    evidence: "The assigned publisher URL moved after the immutable assignment.",
    sourceUrl: "https://example.com/phase3-moved-source",
    originalPreserved: true,
  },
}, 201);

await lab({
  operation: "append_event",
  recordId: accepted.assignmentRecordId,
  eventType: "completion",
  eventData: {
    completedLearnerDate: learnerDate,
    originalPreserved: true,
  },
}, 409);
await lab({
  operation: "commit_record",
  recordType: "recruiting_opportunity",
  title: "Course-first recruiting evidence",
  payload: {
    practiceDayId: accepted.practiceDayId,
    firm: "Phase 3 Ventures",
    roleTitle: "Summer 2027 investing role research",
    cycleKey: `summer-2027-${suffix}`,
    opportunityClass: "Relationship-led target",
    funnelClass: "Relationship target",
    officialUrl: `https://phase3-${suffix}.example.com/careers`,
    location: "United States",
    workMode: "Unknown",
    discoveredOn: learnerDate,
    verifiedOn: learnerDate,
    timezone: "America/Chicago",
    initialStatus: "No public opening",
    deadlineTimezone: "Not stated",
    compensationEvidence: "No role or compensation is published; no employment claim is made.",
    roleScope: "One bounded first-party target review for the daily recruiting checkpoint.",
    qualificationReason: "The firm is relevant to early-stage technology investing, without assuming an opening.",
    immigrationState: "Unknown",
    immigrationEvidence: "No role exists to assess and no authorization is claimed.",
    authorizationClaim: false,
    nextAction: "Preserve the observation without contacting anyone.",
    dueDate: learnerDate,
  },
});
for (let index = 0; index < accepted.readingIds.length; index += 1) await lab({
  operation: "append_event",
  recordId: accepted.readingIds[index],
  eventType: "learner_response",
  eventData: {
    independentFirstPass: `Reading ${index + 1}: the observed signal is real, but durability remains an inference.`,
    takeaway: `Reading ${index + 1}: separate evidence ownership from interpretation.`,
    uncertainty: `Reading ${index + 1}: the relevant base rate remains unknown.`,
    originalPreserved: true,
    privateEvidenceConfirmed: true,
  },
});
const courseCompletion = await lab({
  operation: "append_event",
  recordId: accepted.assignmentRecordId,
  eventType: "completion",
  eventData: {
    completedLearnerDate: learnerDate,
    originalPreserved: true,
  },
});
assert.ok(courseCompletion.id);
await lab({
  operation: "append_event",
  recordId: accepted.assignmentRecordId,
  eventType: "completion",
  eventData: {
    completedLearnerDate: learnerDate,
    originalPreserved: true,
  },
}, 409);

const exported = await automation(`/api/automation/export?runKey=${encodeURIComponent(accepted.runKey)}`, "GET", undefined, 200);
assert.equal(exported.payload.cursor.runKey, accepted.runKey);
assert.equal(exported.payload.counts.assignments, 1);
const acknowledgement = {
  runKey: accepted.runKey,
  cursor: exported.payload.cursor,
  counts: exported.payload.counts,
  digest: exported.payloadDigest,
};
const preserved = await automation("/api/automation/export", "POST", acknowledgement, 201);
assert.equal(preserved.idempotent, false);
const preservedReplay = await automation("/api/automation/export", "POST", acknowledgement, 200);
assert.equal(preservedReplay.idempotent, true);
await automation("/api/automation/export", "POST", { ...acknowledgement, digest: "0".repeat(64) }, 409);

const otherToday = await json("/api/lab/assignment/today", { headers: otherHeaders }, 404);
assert.match(otherToday.error, /No active Lab Profile/);
const today = await json("/api/lab/assignment/today", { headers: ownerHeaders }, 200);
if (learnerDate === currentLearnerDate) {
  assert.equal(today.assignment.id, accepted.assignmentId);
  assert.equal(today.epoch.id, accepted.epochId);
  assert.equal(today.practiceDay.id, accepted.practiceDayId);
  assert.equal(today.practiceDay.dailyBriefId, accepted.dailyBriefId);
  assert.equal(today.progress.readings.completed, 4);
  assert.equal(today.progress.readings.state, "complete");
  assert.equal(today.progress.scanAndJudge.state, "complete");
  assert.equal(today.progress.forecast.state, "complete");
  assert.equal(today.progress.recruiting.state, "complete");
  assert.equal(today.progress.preserve.state, "complete");
  assert.equal(today.assignment.brief.readings.length, 4);
  assert.equal(today.assignment.events.some((event) => event.eventType === "learner_response"), true);
  assert.equal(today.assignment.events.some((event) => event.eventType === "source_status"), true);
} else {
  assert.equal(today.assignment, null);
}

console.log("Phase 3 API smoke passed: course-first epoch and Practice Day delivery, pre-curriculum draft archival, derived progress, closed-and-open completion gates, immutable replay/conflict, deterministic export, and owner isolation.");
