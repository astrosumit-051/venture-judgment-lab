import assert from "node:assert/strict";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const suffix = `${Date.now()}`;
const headers = {
  "content-type": "application/json",
  "oai-authenticated-user-id": `verification-${suffix}`,
  "oai-authenticated-user-email": `verification-${suffix}@example.com`,
};
const chicagoDateParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date()).map((part) => [part.type, part.value]));
const todayInChicago = `${chicagoDateParts.year}-${chicagoDateParts.month}-${chicagoDateParts.day}`;

async function post(body, expected = 201) {
  const response = await fetch(`${baseUrl}/api/lab`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return result;
}

const initial = await fetch(`${baseUrl}/api/lab`, { headers }).then((response) => response.json());
assert.deepEqual(initial, { records: [], events: [] });

await post({
  operation: "commit_record",
  recordType: "snapshot_judgment",
  title: "Invalid Snapshot",
  payload: { company: "Incomplete" },
}, 400);

const lanes = ["Current signal", "Durable investing insight", "Cross-domain input", "Career or freeflow"];
const readings = lanes.map((lane, index) => ({
  readingId: `verification-${index}`,
  lane,
  title: `Verified reading ${index + 1}`,
  authorOrOrganization: "Verification Author",
  publisher: `Verification Publisher ${index + 1}`,
  sourceType: "verification source",
  sourceRole: index < 2 ? "Evidence owner" : "Interpretation",
  claimRole: index < 2 ? "primary" : "mixed",
  issuerInterest: "No material commercial stake in this verification record.",
  canonicalUrl: `https://example.com/source-${index + 1}`,
  publishedDate: "2026-08-04",
  sourceUpdatedDate: "not stated",
  accessedAt: new Date().toISOString(),
  estimatedMinutes: 1,
  assignedSection: "Verification section",
  rightsOrLicense: "Verification-only metadata",
  accessMode: "open web",
  materialReviewed: "excerpt",
  teachingPurpose: "Verify atomic reading preservation.",
  carryQuestion: "Does the record remain linked?",
  downstreamTarget: "Snapshot Judgment",
  selectionRationale: "Exercises the persisted contract.",
  corroborationNotes: "Synthetic verification source.",
  versionStatus: "verification",
  learnerResponse: "Independent response preserved for the smoke test.",
}));

const brief = await post({
  operation: "commit_daily_brief",
  briefVersion: `verification-${suffix}`,
  assignedDate: "2026-08-05",
  timezone: "America/Chicago",
  carryForward: "Carry verified evidence into the next judgment.",
  readings,
});
assert.equal(brief.readingIds.length, 4);

const snapshot = await post({
  operation: "commit_record",
  recordType: "snapshot_judgment",
  title: "Verification Co — Watch at 58%",
  payload: {
    company: "Verification Co",
    stage: "Seed",
    sector: "Testing",
    discoverySource: "Daily Brief",
    thesis: "Verification Co matters if the evidence-preservation loop works end to end.",
    ventureMechanism: "Repeated judgment records compound into a defensible learning advantage.",
    disposition: "Watch",
    confidence: 58,
    crux: "The persisted data survives a second read.",
    supportingEvidence: "The API accepted an atomic four-reading brief.",
    supportingSourceUrl: "https://example.com/support",
    disconfirmingSignal: "The interaction has not yet been reloaded.",
    topUnknown: "Whether linked records remain queryable.",
    nextEvidence: "Reload the owner-scoped history.",
  },
});

await post({
  operation: "commit_record",
  recordType: "forecast",
  parentId: snapshot.id,
  title: "Invalid Forecast",
  payload: {
    claim: "This malformed Forecast must be rejected.",
    probability: "invalid",
    resolutionDate: "0",
    timezone: "America/Chicago",
    supportingEvidence: "Malformed verification input.",
    disconfirmingCondition: "The API accepts invalid odds or a fake date.",
    resolutionSource: "https://example.com/invalid-resolution",
  },
}, 400);

const forecast = await post({
  operation: "commit_record",
  recordType: "forecast",
  parentId: snapshot.id,
  title: "Verification Forecast — 61%",
  payload: {
    claim: "The verification history will return every committed record.",
    probability: 61,
    resolutionDate: "2026-08-06",
    timezone: "America/Chicago",
    supportingEvidence: "All prior writes returned created status.",
    disconfirmingCondition: "Any committed record is missing from the owner-scoped read.",
    resolutionSource: "https://example.com/resolution",
  },
});

const futureForecast = await post({
  operation: "commit_record",
  recordType: "forecast",
  parentId: snapshot.id,
  title: "Future Verification Forecast — 40%",
  payload: {
    claim: "A future verification event will occur before 2100.",
    probability: 40,
    resolutionDate: "2099-12-31",
    timezone: "America/Chicago",
    supportingEvidence: "The event remains possible but is not yet observable.",
    disconfirmingCondition: "The resolution date arrives without the event.",
    resolutionSource: "https://example.com/future-resolution",
  },
});

const sameDayForecast = await post({
  operation: "commit_record",
  recordType: "forecast",
  parentId: snapshot.id,
  title: "Same-day Verification Forecast — 50%",
  payload: {
    claim: "A same-day verification event will occur before the local day ends.",
    probability: 50,
    resolutionDate: todayInChicago,
    timezone: "America/Chicago",
    supportingEvidence: "The committed date is still in progress.",
    disconfirmingCondition: "The entire local date elapses without the event.",
    resolutionSource: "https://example.com/same-day-resolution",
  },
});

await post({
  operation: "commit_record",
  recordType: "second_order_map",
  title: "Verification causal map",
  payload: {
    trigger: "A learner commits an immutable judgment.",
    firstOrder: "The original becomes available for later comparison.",
    secondOrder: "Repeated comparisons expose systematic overconfidence.",
    thirdOrder: "The learner changes decision rules and improves future calibration.",
    bottlenecks: "Enough repetitions and later evidence.",
    incentives: "Accuracy becomes more valuable than hindsight.",
    suppliers: "Verified sources and observations.",
    customers: "The learner and future reviewers.",
    substitutes: "Mutable notes without timestamps.",
    regulation: "Privacy and source rights constrain handling.",
    adjacentEffects: "Calibration and recruiting evidence improve.",
    disconfirmingEvidence: "Later updates overwrite rather than append.",
  },
});

await post({
  operation: "commit_record",
  recordType: "weekly_plan",
  title: "Verification Normal Week",
  payload: {
    weekOf: "2026-08-03",
    mode: "Normal Week",
    rationale: "Verify accepted arithmetic.",
    totalMinutes: 690,
    dailyLoops: 5,
  },
});

await post({
  operation: "commit_record",
  recordType: "weekly_plan",
  title: "Invalid Exam Week",
  payload: {
    weekOf: "2026-08-03",
    mode: "Exam Mode",
    rationale: "This intentionally uses the wrong total.",
    totalMinutes: 690,
    dailyLoops: 1,
  },
}, 400);

const underwrite = await post({
  operation: "commit_record",
  recordType: "weekly_underwrite",
  parentId: snapshot.id,
  title: "Verification Co — Underwrite",
  payload: {
    snapshotId: snapshot.id,
    selectionReason: "Tests a load-bearing persistence uncertainty.",
    questions: ["Does the brief persist?", "Does the forecast remain unchanged?", "Do events append?"],
    evidenceLedger: [
      { loadBearingQuestion: "Does the brief persist?", observation: "Five linked rows were inserted.", sourceUrl: "https://example.com/one", direction: "supports", reliabilityLimits: "Local verification only.", inference: "Atomic persistence works." },
      { loadBearingQuestion: "Does the forecast remain unchanged?", observation: "No resolution has been read yet.", sourceUrl: "https://example.com/two", direction: "challenges", reliabilityLimits: "Pre-resolution evidence.", inference: "The final read must control." },
      { loadBearingQuestion: "Do events append?", observation: "The event endpoint accepts a linked record.", sourceUrl: "https://example.com/three", direction: "complicates", reliabilityLimits: "One event type tested.", inference: "Append behavior can be checked directly." },
    ],
    founderEvidence: "Not applicable to the synthetic verification company; explicit gap recorded.",
    founderEvidenceSourceOrGap: "No real founder exists in this verification case.",
    countercase: "The API may accept writes but fail to preserve them on the owner-scoped read.",
    causalInvestmentCase: "A functioning append-only record makes judgment improvement inspectable.",
    disposition: "Watch",
    confidence: 67,
    decisionDelta: "Confidence increased after atomic brief insertion; the final read remains decisive.",
    nextEvidence: "Read the complete owner-scoped record and compare the locked probability.",
  },
});

await post({
  operation: "append_event",
  recordId: forecast.id,
  eventType: "reflection",
  eventData: { text: "The final read remains the decisive verification step.", originalPreserved: true },
});

await post({
  operation: "commit_calibration_review",
  title: "Invalid early-negative Calibration Review",
  payload: {
    reviewMonth: "2026-08",
    reviewedJudgmentIds: [snapshot.id],
    judgmentComparison: "The locked Snapshot remains unresolved.",
    laterEvidence: "No outcome evidence exists yet.",
    sourcingResults: "Synthetic sourcing produced one company.",
    analyticalMistakes: "A negative outcome would be premature.",
    updatedDecisionRule: "Wait for the committed horizon before resolving non-occurrence.",
    findings: "The outcome is not yet observable.",
    restartPlan: "Revisit at the resolution date.",
  },
  resolvedForecasts: [
    {
      forecastId: futureForecast.id,
      outcome: 0,
      resolutionEvidence: "The event has not happened yet.",
      resolutionSource: "https://example.com/future-resolution-result",
    },
  ],
}, 400);

await post({
  operation: "commit_calibration_review",
  title: "Invalid same-day-negative Calibration Review",
  payload: {
    reviewMonth: todayInChicago.slice(0, 7),
    reviewedJudgmentIds: [snapshot.id],
    judgmentComparison: "The locked Snapshot remains unresolved.",
    laterEvidence: "The committed local date has not fully elapsed.",
    sourcingResults: "Synthetic sourcing produced one company.",
    analyticalMistakes: "A same-day negative outcome would close the horizon early.",
    updatedDecisionRule: "Wait until the entire local resolution date has elapsed.",
    findings: "The non-occurrence outcome is not yet observable.",
    restartPlan: "Revisit on the next local date.",
  },
  resolvedForecasts: [
    {
      forecastId: sameDayForecast.id,
      outcome: 0,
      resolutionEvidence: "The event has not happened yet today.",
      resolutionSource: "https://example.com/same-day-resolution-result",
    },
  ],
}, 400);

await post({
  operation: "commit_calibration_review",
  title: "Calibration Review — August 2026",
  payload: {
    reviewMonth: "2026-08",
    reviewedJudgmentIds: [snapshot.id, underwrite.id],
    judgmentComparison: "The deeper Underwrite raised confidence only after the persistence evidence strengthened.",
    laterEvidence: "The owner-scoped read returned the committed records and preserved the original Snapshot.",
    sourcingResults: "One synthetic company moved from discovery into an Underwrite.",
    analyticalMistakes: "The initial view underweighted persistence risk.",
    updatedDecisionRule: "Require a reload before increasing confidence in durable state.",
    findings: "The resolved forecast was directionally correct and preserved at its original odds.",
    restartPlan: "Make the next forecast before inspecting the final system state.",
  },
  resolvedForecasts: [
    {
      forecastId: forecast.id,
      outcome: 1,
      resolutionEvidence: "The final owner-scoped read returned all committed records.",
      resolutionSource: "https://example.com/resolution-result",
    },
  ],
});

const final = await fetch(`${baseUrl}/api/lab`, { headers }).then((response) => response.json());
assert.equal(final.records.length, 13);
assert.equal(final.events.length, 2);
const lockedForecast = final.records.find((record) => record.id === forecast.id);
assert.equal(lockedForecast.payload.probability, 61);
assert.equal(final.events.filter((event) => event.recordId === forecast.id).length, 2);
const calibration = final.records.find((record) => record.recordType === "calibration_review");
assert.equal(calibration.payload.brierScore, 0.1521);

console.log("API smoke passed: 13 immutable records, 2 append-only events, calibration scoring, horizon-boundary checks, and owner isolation intact.");
