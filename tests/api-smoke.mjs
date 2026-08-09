import assert from "node:assert/strict";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const suffix = `${Date.now()}`;
const headers = {
  "content-type": "application/json",
  "oai-authenticated-user-id": `verification-${suffix}`,
  "oai-authenticated-user-email": `verification-${suffix}@example.com`,
};
function chicagoDate(daysFromToday = 0) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() + daysFromToday * 86_400_000)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const yesterdayInChicago = chicagoDate(-1);
const todayInChicago = chicagoDate();
const tomorrowInChicago = chicagoDate(1);
const experimentEndInChicago = chicagoDate(7);

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

const experimentPayload = {
  name: "Technical pilot signal test",
  channel: "Technical ecosystem",
  targetSegment: "Seed-stage industrial software companies with public pilot evidence.",
  searchSurface: "Technical partner directories and public integration announcements.",
  hypothesis: "Public implementation evidence will surface credible industrial software companies before broad funding coverage.",
  leadingSignal: "A named customer pilot with a technically specific implementation claim.",
  nonConsensusRationale: "Implementation evidence may appear before investor or press attention.",
  startDate: todayInChicago,
  endDate: experimentEndInChicago,
  plannedLeads: 5,
  successCondition: "At least one independently discovered company earns a linked Snapshot.",
  stopRule: "Change the search surface if five reviewed signals produce no qualified company.",
  timezone: "America/Chicago",
};

await post({
  operation: "commit_record",
  recordType: "sourcing_experiment",
  title: "Invalid Sourcing Experiment",
  payload: { ...experimentPayload, endDate: yesterdayInChicago },
}, 400);

await post({
  operation: "commit_record",
  recordType: "sourcing_experiment",
  title: "Backfilled Sourcing Experiment",
  payload: { ...experimentPayload, startDate: yesterdayInChicago },
}, 400);

const sourcingExperiment = await post({
  operation: "commit_record",
  recordType: "sourcing_experiment",
  title: "Sourcing Experiment — Technical pilot signal test",
  payload: experimentPayload,
});

const sourcingLeadPayload = {
  experimentId: sourcingExperiment.id,
  company: "Verification Co",
  companyUrl: "https://verification.example.com",
  attributionClass: "Independent discovery",
  channel: "Technical ecosystem",
  sourceVisibility: "Public source",
  sourceReference: "https://example.com/verification-pilot",
  discoveredOn: todayInChicago,
  sector: "Testing infrastructure",
  companyStage: "Seed",
  observedSignal: "A named pilot exposed an observable implementation claim.",
  nonConsensusReason: "The technical signal preceded broad financing coverage.",
  qualificationThesis: "Verification Co may compound through embedded workflow data if the pilot converts.",
  ventureMechanism: "Repeated integrations could create distribution and switching-cost advantages.",
  disqualifier: "No evidence yet that the pilot converts into repeatable deployments.",
  initialDisposition: "Advance to Snapshot",
  outreachAngle: "Ask how the pilot changed the deployment process and what repeated afterward.",
  nextAction: "Complete a 20-minute Snapshot.",
  dueDate: tomorrowInChicago,
  privateEvidenceConfirmed: false,
  initialStage: "discovered",
  timezone: "America/Chicago",
};

await post({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: "Invalid Sourcing Lead",
  payload: { ...sourcingLeadPayload, attributionClass: "Independent-ish" },
}, 400);

await post({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: "Unconfirmed private Sourcing Lead",
  payload: {
    ...sourcingLeadPayload,
    sourceVisibility: "Private relationship",
    sourceReference: "Private relationship context.",
    privateEvidenceConfirmed: false,
  },
}, 400);

await post({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: "Contradictory independent Sourcing Lead",
  payload: {
    ...sourcingLeadPayload,
    channel: "Institutional database",
    sourceVisibility: "Licensed database",
    sourceReference: "Licensed database record without private content.",
    privateEvidenceConfirmed: true,
  },
}, 400);

await post({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: "Contradictory database Sourcing Lead",
  payload: {
    ...sourcingLeadPayload,
    attributionClass: "Database screening",
  },
}, 400);

await post({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: "Pre-experiment Sourcing Lead",
  payload: { ...sourcingLeadPayload, discoveredOn: yesterdayInChicago },
}, 400);

await post({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: "Cross-timezone Sourcing Lead",
  payload: { ...sourcingLeadPayload, timezone: "UTC" },
}, 400);

const sourcingLead = await post({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: "Verification Co — Sourcing Lead",
  payload: sourcingLeadPayload,
});

await post({
  operation: "commit_record",
  recordType: "sourcing_lead",
  parentId: sourcingExperiment.id,
  title: "Duplicate Verification Co — Sourcing Lead",
  payload: { ...sourcingLeadPayload, companyUrl: "https://www.verification.example.com/another-page" },
}, 409);

const snapshotPayload = {
  sourcingLeadId: sourcingLead.id,
  company: "Verification Co",
  stage: "Seed",
  sector: "Testing",
  discoverySource: "Independent discovery · Technical ecosystem",
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
};

await post({
  operation: "commit_record",
  recordType: "snapshot_judgment",
  parentId: sourcingLead.id,
  title: "Premature sourced Snapshot",
  payload: snapshotPayload,
}, 400);

const sourcingProgress = {
  leadId: sourcingLead.id,
  updateKind: "Sourcing Progress",
  occurredOn: todayInChicago,
  nextStage: "qualified",
  outreachChannel: "No outreach yet",
  observedEvidence: "The 20-minute qualification preserved one causal mechanism and one disqualifier.",
  relationshipQuality: "No direct interaction",
  outcome: "Active",
  nextAction: "Send one evidence-specific founder note.",
  dueDate: tomorrowInChicago,
  privateEvidenceConfirmed: true,
  timezone: "America/Chicago",
};

await post({ operation: "advance_sourcing_lead", leadId: sourcingLead.id, progress: sourcingProgress });

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: { ...sourcingProgress, timezone: "UTC" },
}, 400);

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: { ...sourcingProgress, nextStage: "founder_meeting" },
}, 400);

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: { ...sourcingProgress, nextStage: "outreach_sent", outreachChannel: "Email", rawMessage: "This must not be stored." },
}, 400);

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: {
    ...sourcingProgress,
    occurredOn: todayInChicago,
    nextStage: "outreach_sent",
    outreachChannel: "Email",
    observedEvidence: "A concise evidence-specific note was sent; no raw message or contact detail was preserved.",
    outcome: "Nurture",
    nextAction: "Wait for a response until the committed follow-up date.",
  },
});

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: {
    ...sourcingProgress,
    updateKind: "Metadata correction",
    occurredOn: todayInChicago,
    nextStage: "outreach_sent",
    correctionField: "Discovery date",
    correctionReason: "This correction attempts to move discovery before the committed experiment window.",
    correctedValue: yesterdayInChicago,
    observedEvidence: "The proposed date predates the prospective experiment and must not become effective.",
    nextAction: "Reject the correction and preserve the valid discovery date.",
  },
}, 400);

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: {
    ...sourcingProgress,
    updateKind: "Metadata correction",
    occurredOn: todayInChicago,
    nextStage: "outreach_sent",
    correctionField: "Discovery provenance",
    correctionReason: "This correction intentionally conflicts with the linked experiment channel.",
    correctedValue: {
      attributionClass: "Database screening",
      channel: "Institutional database",
      sourceVisibility: "Licensed database",
      sourceReference: "Licensed database context without private company material.",
    },
    observedEvidence: "An internally consistent correction must still remain consistent with its linked experiment.",
    nextAction: "Reject the correction and preserve the experiment association.",
  },
}, 400);

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: {
    ...sourcingProgress,
    updateKind: "Metadata correction",
    occurredOn: todayInChicago,
    nextStage: "outreach_sent",
    correctionField: "Discovery provenance",
    correctionReason: "The public operator post was a direct referral, not an independently selected search result.",
    correctedValue: {
      attributionClass: "Referral or inbound",
      channel: "Technical ecosystem",
      sourceVisibility: "Public source",
      sourceReference: "https://example.com/verification-referral",
    },
    observedEvidence: "The dated source explicitly sent the company to the learner, correcting the original independent attribution.",
    nextAction: "Use referral attribution in all downstream cohort and conversion evidence.",
  },
});

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: {
    ...sourcingProgress,
    occurredOn: todayInChicago,
    nextStage: "response_received",
    outreachChannel: "Email",
    relationshipQuality: "One-way contact",
    outcome: "No response",
    observedEvidence: "No response has been observed, so a response stage cannot be claimed.",
  },
}, 400);

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: {
    ...sourcingProgress,
    updateKind: "Rediscovery or channel evidence",
    occurredOn: todayInChicago,
    nextStage: "outreach_sent",
    alternateDiscoveryChannel: "Founder or operator network",
    observedEvidence: "A later operator referral independently surfaced the same company.",
    nextAction: "Preserve whether the referral produces a responsive exchange.",
  },
});

await post({
  operation: "advance_sourcing_lead",
  leadId: sourcingLead.id,
  progress: {
    ...sourcingProgress,
    updateKind: "Metadata correction",
    occurredOn: todayInChicago,
    nextStage: "outreach_sent",
    correctionField: "Company name",
    correctionReason: "The original record used a shortened working name rather than the company's current public name.",
    correctedValue: "Verification Systems",
    observedEvidence: "The company website now presents the public name Verification Systems; the original record remains preserved.",
    nextAction: "Use the corrected company name in downstream analysis and retain the original metadata.",
  },
});

await post({
  operation: "append_event",
  recordId: sourcingLead.id,
  eventType: "reflection",
  eventData: { text: "This generic path must not bypass staged sourcing progress.", originalPreserved: true },
}, 400);

await post({
  operation: "commit_record",
  recordType: "snapshot_judgment",
  parentId: sourcingLead.id,
  title: "Snapshot with stale original company name",
  payload: snapshotPayload,
}, 400);

await post({
  operation: "commit_record",
  recordType: "snapshot_judgment",
  parentId: sourcingLead.id,
  title: "Invalid sourced Snapshot",
  payload: { ...snapshotPayload, company: "Verification Systems", discoverySource: "Independent discovery · Technical ecosystem" },
}, 400);

const snapshot = await post({
  operation: "commit_record",
  recordType: "snapshot_judgment",
  parentId: sourcingLead.id,
  title: "Verification Systems — Watch at 58%",
  payload: { ...snapshotPayload, company: "Verification Systems", discoverySource: "Referral or inbound · Technical ecosystem" },
});

const founderDimensions = ["insight", "speed", "integrity", "recruiting", "adaptability", "founder_market_fit"];

await post({
  operation: "commit_record",
  recordType: "founder_evidence_review",
  parentId: snapshot.id,
  title: "Invalid private Founder Evidence Review",
  payload: {
    linkedSnapshotId: snapshot.id,
    company: "Verification Co",
    founderName: "Synthetic Founder",
    sourceType: "Direct conversation",
    sourceUrlOrContext: "Private product conversation.",
    sourceDate: "2026-08-05",
    sourceLimitations: "One direct interaction with no independent references.",
    privacyBoundary: "Behavioral observations only.",
    dimensions: founderDimensions.map((dimension) => ({
      dimension,
      direction: "gap",
      observation: `No decisive ${dimension} behavior was observable.`,
      inference: `${dimension} remains unknown.`,
    })),
    charismaCheck: "No charisma inference used.",
    counterEvidence: "No independent evidence exists.",
    provisionalJudgment: "The evidence remains incomplete.",
    confidence: 25,
    nextQuestion: "What behavior would resolve the largest gap?",
    behavioralPrediction: "The next interaction will produce one observable decision process.",
    timezone: "America/Chicago",
  },
}, 400);

await post({
  operation: "commit_record",
  recordType: "founder_evidence_review",
  parentId: snapshot.id,
  title: "Invalid Founder Evidence Review",
  payload: {
    linkedSnapshotId: snapshot.id,
    company: "Verification Co",
    founderName: "Synthetic Founder",
    sourceType: "Public interview",
    sourceUrlOrContext: "https://example.com/founder-interview",
    sourceDate: "2026-08-05",
    sourceLimitations: "Synthetic verification source.",
    privacyBoundary: "Public source only.",
    dimensions: [],
    charismaCheck: "No charisma inference used.",
    counterEvidence: "No independent reference evidence exists.",
    provisionalJudgment: "The evidence remains incomplete.",
    confidence: 30,
    nextQuestion: "What evidence would change the current product decision?",
    behavioralPrediction: "The founder will name a falsifiable learning milestone.",
    timezone: "America/Chicago",
  },
}, 400);

const validFounderPayload = {
    linkedSnapshotId: snapshot.id,
    company: "Verification Systems",
    founderName: "Synthetic Founder",
    sourceType: "Public interview",
    sourceUrlOrContext: "https://example.com/founder-interview",
    sourceDate: "2026-08-05",
    sourceLimitations: "One edited public interview with no independent references.",
    privacyBoundary: "Public behavior evidence only; no private transcript.",
    dimensions: founderDimensions.map((dimension, index) => ({
      dimension,
      direction: index === 2 ? "weakens" : index === 3 ? "gap" : "supports",
      observation: index === 3 ? "No recruiting behavior was observable in the source." : `Observable ${dimension} behavior ${index + 1}.`,
      inference: index === 3 ? "Recruiting ability remains unknown." : `The behavior provides limited evidence about ${dimension} and does not prove overall founder quality.`,
    })),
    charismaCheck: "Presentation polish was excluded; only concrete choices and responses were retained.",
    counterEvidence: "The founder avoided one question about a failed experiment.",
    provisionalJudgment: "The source supports insight and adaptability but leaves recruiting ability unresolved.",
    confidence: 57,
    nextQuestion: "Who changed your mind most recently, and what did you do differently afterward?",
    behavioralPrediction: "The founder will name a specific changed decision and the evidence that caused it.",
    timezone: "America/Chicago",
};

await post({
  operation: "commit_record",
  recordType: "founder_evidence_review",
  parentId: snapshot.id,
  title: "Mismatched company Founder Evidence Review",
  payload: { ...validFounderPayload, company: "Different Company" },
}, 400);

await post({
  operation: "commit_record",
  recordType: "founder_evidence_review",
  parentId: snapshot.id,
  title: "Founder Evidence Review with undeclared material",
  payload: { ...validFounderPayload, rawTranscript: "This undeclared field must never be preserved." },
}, 400);

const founderReview = await post({
  operation: "commit_record",
  recordType: "founder_evidence_review",
  parentId: snapshot.id,
  title: "Verification Co — Founder Evidence Review",
  payload: validFounderPayload,
});

await post({
  operation: "append_event",
  recordId: founderReview.id,
  eventType: "reflection",
  eventData: {
    text: "A later observation belongs in the append-only record.",
    originalPreserved: true,
    privateEvidenceConfirmed: true,
    rawTranscript: "This undeclared field must be rejected.",
  },
}, 400);

await post({
  operation: "append_event",
  recordId: founderReview.id,
  eventType: "reflection",
  eventData: {
    text: "A later observation without privacy confirmation must be rejected.",
    originalPreserved: true,
  },
}, 400);

await post({
  operation: "append_event",
  recordId: founderReview.id,
  eventType: "reflection",
  eventData: {
    text: "A later public observation weakened the original adaptability inference.",
    originalPreserved: true,
    privateEvidenceConfirmed: true,
  },
});

const otherSnapshot = await post({
  operation: "commit_record",
  recordType: "snapshot_judgment",
  title: "Other Verification Co — Watch at 58%",
  payload: {
    ...snapshotPayload,
    sourcingLeadId: "",
    company: "Other Verification Co",
    discoverySource: "Synthetic standalone verification",
    thesis: "This second Snapshot verifies that Founder Evidence cannot cross identity boundaries.",
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
    resolutionDate: tomorrowInChicago,
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

await post({
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
}, 400);

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
    sourcingExperimentId: sourcingExperiment.id,
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

const underwritePayload = {
    snapshotId: snapshot.id,
    selectionReason: "Tests a load-bearing persistence uncertainty.",
    questions: ["Does the brief persist?", "Does the forecast remain unchanged?", "Do events append?"],
    evidenceLedger: [
      { loadBearingQuestion: "Does the brief persist?", observation: "Five linked rows were inserted.", sourceUrl: "https://example.com/one", direction: "supports", reliabilityLimits: "Local verification only.", inference: "Atomic persistence works." },
      { loadBearingQuestion: "Does the forecast remain unchanged?", observation: "No resolution has been read yet.", sourceUrl: "https://example.com/two", direction: "challenges", reliabilityLimits: "Pre-resolution evidence.", inference: "The final read must control." },
      { loadBearingQuestion: "Do events append?", observation: "The event endpoint accepts a linked record.", sourceUrl: "https://example.com/three", direction: "complicates", reliabilityLimits: "One event type tested.", inference: "Append behavior can be checked directly." },
    ],
    founderEvidence: "The linked review supports insight and adaptability while preserving a recruiting-evidence gap.",
    founderEvidenceSourceOrGap: "Linked public interview review; no independent recruiting reference yet.",
    founderReviewId: founderReview.id,
    countercase: "The API may accept writes but fail to preserve them on the owner-scoped read.",
    causalInvestmentCase: "A functioning append-only record makes judgment improvement inspectable.",
    disposition: "Watch",
    confidence: 67,
    decisionDelta: "Confidence increased after atomic brief insertion; the final read remains decisive.",
    nextEvidence: "Read the complete owner-scoped record and compare the locked probability.",
};

await post({
  operation: "commit_record",
  recordType: "weekly_underwrite",
  parentId: otherSnapshot.id,
  title: "Invalid cross-Snapshot Underwrite",
  payload: { ...underwritePayload, snapshotId: otherSnapshot.id },
}, 400);

const underwrite = await post({
  operation: "commit_record",
  recordType: "weekly_underwrite",
  parentId: snapshot.id,
  title: "Verification Co — Underwrite",
  payload: underwritePayload,
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

const recruitingOpportunityPayload = {
  firm: "Verification Ventures",
  roleTitle: "Summer Investor 2027",
  opportunityClass: "Qualifying Internship",
  funnelClass: "Qualified role",
  officialUrl: `https://example.com/recruiting/${suffix}`,
  location: "New York, NY",
  workMode: "On site",
  discoveredOn: todayInChicago,
  verifiedOn: todayInChicago,
  timezone: "America/Chicago",
  initialStatus: "Open",
  publishedDeadline: "",
  deadlineTimezone: "Not stated",
  compensationEvidence: "$1,000 per week in this synthetic verification role.",
  roleScope: "Sourcing, diligence, and direct investment-team exposure.",
  qualificationReason: "A paid direct-investing internship used to verify the qualified-role denominator.",
  immigrationState: "General eligibility",
  immigrationEvidence: "General eligibility is preserved; this exact role is not authorized.",
  authorizationClaim: false,
  nextAction: "Obtain role-specific DSO evidence before making an authorization claim.",
  dueDate: tomorrowInChicago,
};

await post({
  operation: "commit_record",
  recordType: "recruiting_opportunity",
  title: "Invalid authorization claim",
  payload: { ...recruitingOpportunityPayload, authorizationClaim: true },
}, 400);

const recruitingOpportunity = await post({
  operation: "commit_record",
  recordType: "recruiting_opportunity",
  title: "Verification Ventures — Summer Investor 2027",
  payload: recruitingOpportunityPayload,
});

await post({
  operation: "commit_record",
  recordType: "recruiting_opportunity",
  title: "Duplicate Recruiting Opportunity",
  payload: { ...recruitingOpportunityPayload, officialUrl: `${recruitingOpportunityPayload.officialUrl}/` },
}, 409);

const observationPayload = {
  opportunityId: recruitingOpportunity.id,
  observedOn: todayInChicago,
  timezone: "America/Chicago",
  status: "Offer",
  sourceType: "First-party page",
  sourceReference: `${recruitingOpportunityPayload.officialUrl}/offer-status`,
  materialChange: "A synthetic offer state verifies the typed current-status overlay.",
  opportunityClass: "Qualifying Internship",
  funnelClass: "Qualified role",
  immigrationState: "Employer-compatible",
  immigrationEvidence: "The employer-side synthetic constraints are compatible; authorization remains unclaimed.",
  authorizationClaim: false,
  nextAction: "Obtain the final role-specific authorization before work begins.",
  dueDate: tomorrowInChicago,
  privateEvidenceConfirmed: false,
};

await post({
  operation: "commit_record",
  recordType: "opportunity_observation",
  parentId: recruitingOpportunity.id,
  title: "Wrong-timezone Observation",
  payload: { ...observationPayload, timezone: "America/New_York" },
}, 400);

await post({
  operation: "commit_record",
  recordType: "opportunity_observation",
  parentId: recruitingOpportunity.id,
  title: "Prediscovery Observation",
  payload: { ...observationPayload, observedOn: yesterdayInChicago },
}, 400);

await post({
  operation: "commit_record",
  recordType: "opportunity_observation",
  parentId: recruitingOpportunity.id,
  title: "Relabeled Opportunity Observation",
  payload: { ...observationPayload, funnelClass: "Milestone" },
}, 400);

const recruitingObservation = await post({
  operation: "commit_record",
  recordType: "opportunity_observation",
  parentId: recruitingOpportunity.id,
  title: "Verification Ventures — Opportunity Observation",
  payload: observationPayload,
});

await post({
  operation: "commit_record",
  recordType: "opportunity_observation",
  parentId: recruitingOpportunity.id,
  title: "Duplicate Opportunity Observation",
  payload: observationPayload,
}, 409);

const outboundInteraction = {
  opportunityId: recruitingOpportunity.id,
  interactionKind: "Inquiry",
  direction: "Outbound",
  interactionState: "Sent",
  occurredOn: todayInChicago,
  timezone: "America/Chicago",
  counterpartyRole: "Recruiter",
  evidenceSummary: "A concise synthetic summary with no message or contact details.",
  outcome: "Waiting",
  nextAction: "Wait for a response.",
  dueDate: tomorrowInChicago,
  approvalConfirmed: false,
  privateEvidenceConfirmed: true,
};
await post({
  operation: "commit_record",
  recordType: "recruiting_interaction",
  parentId: recruitingOpportunity.id,
  title: "Unapproved outbound interaction",
  payload: outboundInteraction,
}, 400);
await post({
  operation: "commit_record",
  recordType: "recruiting_interaction",
  parentId: recruitingOpportunity.id,
  title: "Unapproved mutual sent interaction",
  payload: { ...outboundInteraction, direction: "Mutual" },
}, 400);

const recruitingReferral = await post({
  operation: "commit_record",
  recordType: "recruiting_interaction",
  parentId: recruitingOpportunity.id,
  title: "Verification Ventures — Referral",
  payload: {
    ...outboundInteraction,
    interactionKind: "Referral",
    direction: "Inbound",
    interactionState: "Received",
    counterpartyRole: "Alumnus",
    outcome: "Referral received and preserved.",
  },
});

const secondRecruitingReferral = await post({
  operation: "commit_record",
  recordType: "recruiting_interaction",
  parentId: recruitingOpportunity.id,
  title: "Verification Ventures — Second material Referral observation",
  payload: {
    ...outboundInteraction,
    interactionKind: "Referral",
    direction: "Inbound",
    interactionState: "Received",
    counterpartyRole: "Alumnus",
    evidenceSummary: "A second materially distinct same-day referral observation.",
    outcome: "A second material referral detail was preserved without a key collision.",
  },
});

const applicationPayload = {
  opportunityId: recruitingOpportunity.id,
  attemptedOn: todayInChicago,
  timezone: "America/Chicago",
  attemptState: "Submitted",
  artifactChecklist: "Resume and synthetic work sample checked.",
  claimLedger: "Every factual claim checked against preserved verification evidence.",
  authorizationStatement: "No role authorization claimed.",
  immigrationState: "Employer-compatible",
  authorizationClaim: false,
  confirmationReference: `synthetic-confirmation-${suffix}`,
  approvalConfirmed: false,
  nextAction: "Preserve the employer response.",
  dueDate: tomorrowInChicago,
};
await post({
  operation: "commit_record",
  recordType: "application_attempt",
  parentId: recruitingOpportunity.id,
  title: "Unapproved Application Attempt",
  payload: applicationPayload,
}, 400);
await post({
  operation: "commit_record",
  recordType: "application_attempt",
  parentId: recruitingOpportunity.id,
  title: "Application Attempt without confirmation",
  payload: { ...applicationPayload, approvalConfirmed: true, confirmationReference: "No confirmation" },
}, 400);

const recruitingApplication = await post({
  operation: "commit_record",
  recordType: "application_attempt",
  parentId: recruitingOpportunity.id,
  title: "Verification Ventures — Application Attempt",
  payload: { ...applicationPayload, approvalConfirmed: true },
});

const recruitingInterview = await post({
  operation: "commit_record",
  recordType: "recruiting_interaction",
  parentId: recruitingOpportunity.id,
  title: "Verification Ventures — Interview",
  payload: {
    ...outboundInteraction,
    interactionKind: "Interview",
    direction: "Mutual",
    interactionState: "Completed",
    counterpartyRole: "Investment partner",
    outcome: "Completed synthetic interview evidence.",
    approvalConfirmed: true,
  },
});

const recruitingPractice = await post({
  operation: "commit_record",
  recordType: "interview_practice",
  parentId: recruitingOpportunity.id,
  title: "Verification Ventures — Interview Practice",
  payload: {
    opportunityId: recruitingOpportunity.id,
    practicedOn: todayInChicago,
    timezone: "America/Chicago",
    practiceType: "Trend and company",
    prompt: "Which technical change creates a non-consensus investment opportunity?",
    independentAnswerSummary: "The synthetic first pass identifies a bottleneck and an investable response.",
    evidenceUsed: "A locked Snapshot and Forecast supply the evidence trail.",
    unsupportedClaim: "The market-size assertion still lacks a primary source.",
    durationMinutes: 30,
    nextRevision: "Replace the unsupported market-size assertion with first-party evidence.",
  },
});

const recruitingPortfolio = await post({
  operation: "commit_record",
  recordType: "portfolio_candidate",
  parentId: recruitingOpportunity.id,
  title: "Verification Ventures — Portfolio Candidate",
  payload: {
    opportunityId: recruitingOpportunity.id,
    sourceRecordId: snapshot.id,
    capturedOn: todayInChicago,
    timezone: "America/Chicago",
    artifactType: "Snapshot",
    title: "Verification Snapshot candidate",
    evidenceOfOwnership: "The learner-authored Snapshot is preserved in this owner-scoped record.",
    confidentialityReview: "Not cleared",
    redactionsNeeded: "Remove synthetic internal identifiers before any recruiting use.",
    publicationState: "Private candidate",
    approvalConfirmed: false,
    nextAction: "Conduct a separate confidentiality and recruiting-use review.",
  },
});

await post({
  operation: "commit_record",
  recordType: "portfolio_candidate",
  parentId: recruitingOpportunity.id,
  title: "Mismatched Portfolio Candidate",
  payload: {
    opportunityId: recruitingOpportunity.id,
    sourceRecordId: snapshot.id,
    capturedOn: todayInChicago,
    timezone: "America/Chicago",
    artifactType: "Forecast",
    title: "Mismatched artifact type",
    evidenceOfOwnership: "The source exists, but the declared artifact type is intentionally wrong.",
    confidentialityReview: "Not cleared",
    redactionsNeeded: "No external use.",
    publicationState: "Private candidate",
    approvalConfirmed: false,
    nextAction: "Reject the mismatched identity.",
  },
}, 400);

await post({
  operation: "append_event",
  recordId: recruitingOpportunity.id,
  eventType: "reflection",
  eventData: { text: "Generic append must be rejected.", originalPreserved: true },
}, 400);

const final = await fetch(`${baseUrl}/api/lab`, { headers }).then((response) => response.json());
assert.equal(final.records.length, 24);
assert.equal(final.events.length, 8);
const lockedSourcingLead = final.records.find((record) => record.id === sourcingLead.id);
assert.equal(lockedSourcingLead.payload.normalizedCompanyDomain, "verification.example.com");
assert.equal(lockedSourcingLead.payload.company, "Verification Co");
assert.equal(new Date(lockedSourcingLead.payload.discoveredAt).toISOString(), lockedSourcingLead.payload.discoveredAt);
assert.equal(final.events.filter((event) => event.recordId === sourcingLead.id && event.eventType === "sourcing_progress").length, 2);
assert.equal(final.events.filter((event) => event.recordId === sourcingLead.id && event.eventType === "sourcing_rediscovery").length, 1);
assert.equal(final.events.filter((event) => event.recordId === sourcingLead.id && event.eventType === "sourcing_metadata_correction").length, 2);
assert.equal(final.events.find((event) => event.recordId === sourcingLead.id && event.eventType === "sourcing_metadata_correction").eventData.correctedValue, "Verification Systems");
assert.equal(final.records.find((record) => record.id === snapshot.id).parentId, sourcingLead.id);
const lockedForecast = final.records.find((record) => record.id === forecast.id);
assert.equal(lockedForecast.payload.probability, 61);
assert.equal(final.events.filter((event) => event.recordId === forecast.id).length, 2);
const calibration = final.records.find((record) => record.recordType === "calibration_review");
assert.equal(calibration.payload.brierScore, 0.1521);
assert.equal(final.records.find((record) => record.id === recruitingOpportunity.id).payload.normalizedOfficialUrl, recruitingOpportunityPayload.officialUrl);
assert.equal(final.records.find((record) => record.id === recruitingObservation.id).parentId, recruitingOpportunity.id);
assert.equal(final.records.find((record) => record.id === recruitingReferral.id).payload.interactionState, "Received");
assert.equal(final.records.find((record) => record.id === secondRecruitingReferral.id).payload.evidenceSummary, "A second materially distinct same-day referral observation.");
assert.equal(final.records.find((record) => record.id === recruitingApplication.id).payload.approvalConfirmed, true);
assert.equal(final.records.find((record) => record.id === recruitingInterview.id).payload.interactionState, "Completed");
assert.equal(final.records.find((record) => record.id === recruitingPractice.id).payload.practiceType, "Trend and company");
assert.equal(final.records.find((record) => record.id === recruitingPortfolio.id).payload.publicationState, "Private candidate");
assert.equal(final.records.filter((record) => record.parentId === recruitingOpportunity.id).length, 7);

console.log("API smoke passed: 24 immutable records, 8 append-only events, prospective experiment and forecast boundaries, typed sourcing and recruiting evidence, external-action approval gates, Founder Evidence safeguards, calibration scoring, and owner isolation intact.");
