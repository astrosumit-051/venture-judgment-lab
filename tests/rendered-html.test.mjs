import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the complete Venture Judgment Lab learning surface", async () => {
  const [layout, app, api, brief, practice] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LabApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/lab/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dailyBrief.ts", import.meta.url), "utf8"),
    readFile(new URL("../records/sustainable-weekly-practice-architecture-2026-08-05.md", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);

  assert.match(layout, /Venture Judgment Lab/);
  assert.match(layout, /Evidence before narrative\./);
  assert.match(app, /Daily Brief/);
  assert.match(app, /Snapshot Judgment/);
  assert.match(app, /Weekly Underwrite/);
  assert.match(app, /Decision Delta/);
  assert.match(app, /Second-Order Map/);
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
  assert.match(api, /INSERT INTO lab_records/);
  assert.match(api, /INSERT INTO lab_events/);
  assert.doesNotMatch(api, /UPDATE lab_records|DELETE FROM lab_records/);
});
