import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the complete Venture Judgment Lab learning surface", async () => {
  const [layout, appShell, appWorkspace, advancedForms, historyView, assignmentView, assignmentEventView, api, brief, practice, runtime, calibration, founder, sourcing, sourcingView, recruiting, recruitingView, recruitingRecord] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LabApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LabWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/AdvancedFormsView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HistoryView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/DailyAssignmentView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/AssignmentEventView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/lab/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dailyBrief.ts", import.meta.url), "utf8"),
    readFile(new URL("../records/sustainable-weekly-practice-architecture-2026-08-05.md", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/calibration.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/founderEvidence.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sourcing.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/SourcingView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/recruiting.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/RecruitingView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../records/seven-month-internship-recruiting-sprint-2026-08-08.md", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);
  const app = `${appShell}\n${appWorkspace}\n${advancedForms}\n${historyView}`;
  const [monitor, automationRoute, monitorRecord, diligence, diligenceView, diligenceRecord, diligenceMigration] = await Promise.all([
    readFile(new URL("../app/opportunityMonitor.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/automation/opportunities/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../records/official-opportunity-monitor-2026-08-08.md", import.meta.url), "utf8"),
    readFile(new URL("../app/diligence.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/DiligenceView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../records/diligence-development-ladder-2026-08-08.md", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0006_oval_rocket_racer.sql", import.meta.url), "utf8"),
  ]);
  const [coach, coachPersistence, coachView, coachRoute, coachRecord, coachMigration] = await Promise.all([
    readFile(new URL("../app/coach.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/coachPersistence.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/CoachView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/automation/coach/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../records/judgment-coach-and-mastery-evidence-2026-08-08.md", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0007_keen_retro_girl.sql", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Venture Judgment Lab/);
  assert.match(layout, /Evidence before narrative\./);
  assert.match(app, /Daily Brief/);
  assert.match(app, /Snapshot Judgment/);
  assert.match(app, /Weekly Underwrite/);
  assert.match(app, /Decision Delta/);
  assert.match(app, /Second-Order Map/);
  assert.match(app, /Third-order consequence/);
  assert.match(app, /Calibration Review/);
  assert.match(app, /Brier score/);
  assert.match(app, /Analytical mistakes/);
  assert.match(app, /Founder Evidence Review/);
  assert.match(app, /SourcingView/);
  assert.match(app, /Observable behavior, not founder vibes/);
  assert.match(app, /only consented behavioral evidence/);
  assert.match(app, /Append, never overwrite/);
  assert.match(app, /sourceDate: dateInTimeZone/);
  assert.match(founder, /Insight/);
  assert.match(founder, /Integrity/);
  assert.match(founder, /Adaptability/);
  assert.match(founder, /Recruiting ability/);
  assert.match(founder, /Speed/);
  assert.match(founder, /Founder-market fit/);
  assert.match(sourcing, /Independent discovery/);
  assert.match(sourcing, /Database screening/);
  assert.match(sourcing, /Licensed database/);
  assert.match(sourcing, /Relationship active/);
  assert.match(sourcing, /SOURCING_UPDATE_KINDS/);
  assert.match(sourcing, /applySourcingCorrections/);
  assert.match(sourcing, /Discovery provenance/);
  assert.match(sourcing, /computeSourcingMetrics/);
  assert.match(sourcingView, /Sourcing Experiment/);
  assert.match(sourcingView, /Sourcing Lead/);
  assert.match(sourcingView, /Sourcing Progress/);
  assert.match(sourcingView, /Judge the hypothesis by its own funnel/);
  assert.match(sourcingView, /raw messages/);
  assert.match(app, /RecruitingView/);
  assert.match(app, /DiligenceView/);
  assert.match(app, /CoachView/);
  assert.match(recruiting, /recruiting_opportunity/);
  assert.match(recruiting, /opportunity_observation/);
  assert.match(recruiting, /recruiting_interaction/);
  assert.match(recruiting, /application_attempt/);
  assert.match(recruiting, /interview_practice/);
  assert.match(recruiting, /portfolio_candidate/);
  assert.match(recruiting, /Only the Authorized state may claim role authorization/);
  assert.match(recruitingView, /Qualified roles/);
  assert.match(recruitingView, /No prestige score\. No activity points\./);
  assert.match(recruitingView, /It cannot contact a firm, submit an application, or publish an artifact/);
  assert.match(recruitingView, /Official Opportunity Monitor/);
  assert.match(recruitingView, /Register private monitor/);
  assert.match(recruitingRecord, /August 2026–February 2027 sequence/);
  assert.match(recruitingRecord, /Unknown → General eligibility → DSO-confirmed role fit → Employer-compatible → Authorized/);
  assert.match(app, /Compare investment judgments with later evidence/);
  assert.match(assignmentEventView, /Open appended source/);
  assert.match(assignmentView, /Open original source/);
  assert.match(assignmentView, /Commit your Independent First Pass/);
  assert.match(assignmentView, /Mark today’s Brief complete/);
  assert.doesNotMatch(app, /Forecast reserved · not yet active/);
  assert.match(brief, /https:\/\/www\.bls\.gov\/news\.release\/jolts\.nr0\.htm/);
  assert.match(brief, /https:\/\/www\.sec\.gov\/about\/reports-publications\/beginners-guide-financial-statements/);
  assert.match(brief, /https:\/\/www\.gao\.gov\/products\/gao-25-107130/);
  assert.match(brief, /https:\/\/paulgraham\.com\/startupideas\.html/);
  assert.match(brief, /totalMinutes: 51/);
  assert.match(practice, /Normal Week — 690 minutes \/ 11\.5 hours/);
  assert.match(practice, /Exam Mode — 180 minutes \/ 3 hours/);
  assert.match(api, /commit_daily_brief/);
  assert.match(api, /reading_record/);
  assert.match(api, /forecast_resolution/);
  assert.match(api, /commit_calibration_review/);
  assert.match(api, /founder_evidence_review/);
  assert.match(api, /sourcing_experiment/);
  assert.match(api, /sourcing_lead/);
  assert.match(api, /advance_sourcing_lead/);
  assert.match(api, /Sourcing Progress cannot skip or reverse funnel stages/);
  assert.match(api, /must reach Qualified through preserved funnel evidence/);
  assert.match(api, /correctedValue/);
  assert.match(api, /applySourcingCorrections/);
  assert.match(api, /Sourcing Attribution Class, channel, and source visibility contradict/);
  assert.match(api, /Sourcing Progress rejects raw messages/);
  assert.match(api, /Founder Evidence Review must cover all six behavior dimensions/);
  assert.match(api, /Private Founder Evidence requires confirmation/);
  assert.match(api, /Founder Evidence contains an undeclared field/);
  assert.match(api, /Founder Evidence updates require a concise behavioral note/);
  assert.match(api, /founderReview\.parent_id !== parentId/);
  assert.match(api, /resolvedForecasts/);
  assert.match(api, /cannot be resolved negatively until/);
  assert.match(api, /Commit Calibration Reviews through the scoring workflow/);
  assert.match(api, /register_opportunity_monitor/);
  assert.match(api, /Opportunity Monitor evidence is immutable/);
  assert.match(runtime, /CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_events_unique_forecast_resolution/);
  assert.match(runtime, /idx_lab_records_unique_sourcing_domain/);
  assert.match(runtime, /idx_lab_records_unique_recruiting_opportunity_cycle/);
  assert.match(runtime, /idx_lab_records_unique_recruiting_child/);
  assert.match(runtime, /idx_lab_records_unique_opportunity_monitor_run/);
  assert.match(runtime, /idx_lab_records_unique_automation_registration/);
  assert.match(monitor, /America\/New_York/);
  assert.match(monitor, /MONITOR_TARGETS/);
  assert.match(monitor, /materialOpportunityChanges/);
  assert.match(automationRoute, /registeredAutomationOwner/);
  assert.match(automationRoute, /inputFingerprint/);
  assert.match(automationRoute, /db\.batch/);
  assert.doesNotMatch(automationRoute, /UPDATE lab_records|DELETE FROM lab_records/);
  assert.match(monitorRecord, /all seven registered first-party targets exactly once/);
  assert.match(monitorRecord, /cannot send outreach, submit an application, claim work authorization, or publish/);
  assert.match(diligence, /foundation/);
  assert.match(diligence, /anti_memo/);
  assert.match(diligence, /oral_defense/);
  assert.match(diligence, /validPrefix/);
  assert.match(diligenceView, /Diligence Case · seven immutable stages/);
  assert.match(diligenceView, /No stage can skip, overwrite, or collapse into a score/);
  assert.match(diligenceView, /raw transcripts, contact details, secrets/);
  assert.match(diligenceRecord, /Snapshot and Underwrite foundation/);
  assert.match(diligenceRecord, /The terminal harness was deleted/);
  assert.match(diligenceRecord, /one private\s+deployment for Phase 2/);
  assert.match(diligenceMigration, /idx_lab_records_unique_diligence_case/);
  assert.match(diligenceMigration, /idx_lab_records_unique_diligence_stage/);
  assert.match(runtime, /idx_lab_records_unique_diligence_case/);
  assert.match(runtime, /idx_lab_records_unique_diligence_stage/);
  assert.match(api, /Commit .* before any later Diligence stage/);
  assert.match(api, /Diligence updates require a bounded note/);
  assert.match(app, /contains only bounded, approved evidence/);
  assert.match(coach, /repeated_or_corroborated/);
  assert.match(coach, /attempts\.length >= 3 && companyIdentities\.length >= 2 && latestTwoClear && hasRevisionOrDisconfirmingCase/);
  assert.match(coach, /normalizedCoachCompanyIdentity/);
  assert.match(coach, /COACH_ERROR_KINDS/);
  assert.match(coach, /grades, scores, and model answers are rejected/);
  assert.match(coachView, /Reveal the gap, not a grade or answer/);
  assert.match(coachView, /Queued — interpretations withheld/);
  assert.match(coachView, /Original remains immutable/);
  assert.match(coachRoute, /registeredAutomationOwner/);
  assert.match(coachRoute, /boundedCoachSource/);
  assert.match(coachRoute, /recurringErrorCount/);
  assert.match(coachRoute, /recurringPatterns/);
  assert.match(coachRoute, /db\.batch/);
  assert.match(coachPersistence, /insertCoachRecordWhenHistoryCurrent/);
  assert.match(coachPersistence, /triggerRecordType/);
  assert.match(api, /Judgment Coach corrections and hindsight require a bounded note/);
  assert.doesNotMatch(coachRoute, /UPDATE lab_records|DELETE FROM lab_records/);
  assert.match(coachRecord, /at least three distinct committed Independent First Pass attempts/);
  assert.match(coachRecord, /no Foundational Error in the latest two attempts/);
  assert.match(coachRecord, /one private\s+deployment for Phase 2/);
  assert.match(coachMigration, /idx_lab_records_unique_coach_request/);
  assert.match(coachMigration, /idx_lab_records_unique_coach_feedback/);
  assert.match(coachMigration, /idx_lab_records_unique_revision_attempt/);
  assert.match(coachMigration, /idx_lab_records_unique_mastery_evidence/);
  assert.match(runtime, /idx_lab_records_unique_coach_request/);
  assert.match(runtime, /idx_lab_records_unique_coach_feedback/);
  assert.match(runtime, /idx_lab_records_unique_revision_attempt/);
  assert.match(runtime, /idx_lab_records_unique_mastery_evidence/);
  assert.match(calibration, /calculateBrierScore/);
  assert.match(calibration, /isCanonicalDate/);
  assert.match(calibration, /dateInTimeZone/);
  assert.match(api, /INSERT INTO lab_records/);
  assert.match(api, /INSERT INTO lab_events/);
  assert.doesNotMatch(api, /UPDATE lab_records|DELETE FROM lab_records/);
});
