import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the complete Venture Judgment Lab learning surface", async () => {
  const [layout, app, api, brief, practice, runtime, calibration, founder] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LabApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/lab/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dailyBrief.ts", import.meta.url), "utf8"),
    readFile(new URL("../records/sustainable-weekly-practice-architecture-2026-08-05.md", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/calibration.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/founderEvidence.ts", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
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
  assert.match(app, /Observable behavior, not founder vibes/);
  assert.match(app, /only consented behavioral evidence/);
  assert.match(app, /Confirm that the Founder Evidence update contains only consented behavioral evidence/);
  assert.match(app, /sourceDate: dateInTimeZone/);
  assert.match(founder, /Insight/);
  assert.match(founder, /Integrity/);
  assert.match(founder, /Adaptability/);
  assert.match(founder, /Recruiting ability/);
  assert.match(founder, /Speed/);
  assert.match(founder, /Founder-market fit/);
  assert.match(app, /Compare investment judgments with later evidence/);
  assert.match(app, /Open resolution source/);
  assert.match(app, /Open original source/);
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
  assert.match(api, /Founder Evidence Review must cover all six behavior dimensions/);
  assert.match(api, /Private Founder Evidence requires confirmation/);
  assert.match(api, /Founder Evidence contains an undeclared field/);
  assert.match(api, /Founder Evidence updates require a concise behavioral note/);
  assert.match(api, /founderReview\.parent_id !== parentId/);
  assert.match(api, /resolvedForecasts/);
  assert.match(api, /cannot be resolved negatively until/);
  assert.match(api, /Commit Calibration Reviews through the scoring workflow/);
  assert.match(runtime, /CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_events_unique_forecast_resolution/);
  assert.match(calibration, /calculateBrierScore/);
  assert.match(calibration, /isCanonicalDate/);
  assert.match(calibration, /dateInTimeZone/);
  assert.match(api, /INSERT INTO lab_records/);
  assert.match(api, /INSERT INTO lab_events/);
  assert.doesNotMatch(api, /UPDATE lab_records|DELETE FROM lab_records/);
});
