import assert from "node:assert/strict";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const suffix = `${Date.now()}`;
const headers = {
  "content-type": "application/json",
  "oai-authenticated-user-id": `verification-${suffix}`,
  "oai-authenticated-user-email": `verification-${suffix}@example.com`,
};

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

const forecast = await post({
  operation: "commit_record",
  recordType: "forecast",
  parentId: snapshot.id,
  title: "Verification Forecast — 61%",
  payload: {
    claim: "The verification history will return every committed record.",
    probability: 61,
    resolutionDate: "2026-08-06",
    supportingEvidence: "All prior writes returned created status.",
    disconfirmingCondition: "Any committed record is missing from the owner-scoped read.",
    resolutionSource: "https://example.com/resolution",
  },
});

await post({
  operation: "commit_record",
  recordType: "second_order_map",
  title: "Verification causal map",
  payload: {
    trigger: "A learner commits an immutable judgment.",
    firstOrder: "The original becomes available for later comparison.",
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

await post({
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
  eventType: "forecast_resolution",
  eventData: { text: "The owner-scoped read returned the locked Forecast and its appended resolution.", originalPreserved: true },
});

const final = await fetch(`${baseUrl}/api/lab`, { headers }).then((response) => response.json());
assert.equal(final.records.length, 10);
assert.equal(final.events.length, 1);
const lockedForecast = final.records.find((record) => record.id === forecast.id);
assert.equal(lockedForecast.payload.probability, 61);
assert.equal(final.events[0].recordId, forecast.id);

console.log("API smoke passed: 10 immutable records, 1 append-only event, owner isolation intact.");
