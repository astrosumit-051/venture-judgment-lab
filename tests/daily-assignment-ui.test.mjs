import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const labApp = await readFile(new URL("../app/LabApp.tsx", import.meta.url), "utf8");
const labWorkspace = await readFile(new URL("../app/LabWorkspace.tsx", import.meta.url), "utf8");
const advancedForms = await readFile(new URL("../app/AdvancedFormsView.tsx", import.meta.url), "utf8");
const labSurface = `${labApp}\n${labWorkspace}\n${advancedForms}`;
const assignmentView = await readFile(new URL("../app/DailyAssignmentView.tsx", import.meta.url), "utf8");
const assignmentEventView = await readFile(new URL("../app/AssignmentEventView.tsx", import.meta.url), "utf8");

test("Today and Brief read the authenticated daily assignment without a static Brief fallback", () => {
  assert.doesNotMatch(labApp, /import\s+\{\s*dailyBrief\s*\}/);
  assert.match(labWorkspace, /fetch\("\/api\/lab\/assignment\/today"/);
  assert.match(labWorkspace, /<CourseTodayView/);
  assert.match(advancedForms, /onAppendEvent=\{appendAssignmentEvent\}/);
});

test("the assignment view names every learner-visible lifecycle state", () => {
  assert.match(assignmentView, /Opening today’s private assignment/);
  assert.match(assignmentView, /Today’s Brief is unavailable/);
  assert.match(assignmentView, /Practice intentionally displaced/);
  assert.match(assignmentView, /Today’s practice was missed/);
  assert.match(assignmentView, /Today’s Brief is complete/);
});

test("ready readings retain original evidence metadata and expose typed overlays", () => {
  assert.match(assignmentView, /Open original source/);
  assert.match(assignmentView, /Original assignment metadata/);
  const renderedAssignmentSurface = `${assignmentView}\n${assignmentEventView}`;
  for (const eventType of [
    "learner_response",
    "source_status",
    "replacement_link",
    "metadata_correction",
    "later_usefulness",
  ]) {
    assert.match(renderedAssignmentSurface, new RegExp(eventType));
  }
});

test("completion requires one learner response overlay for each of four current readings", () => {
  assert.match(assignmentView, /respondedReadingIds/);
  assert.match(assignmentView, /readingRecordIds\.size === 4 && responseCount === 4/);
  assert.match(assignmentView, /disabled=\{!canComplete\}/);
  assert.match(assignmentView, /Respond to every current reading before completing today’s Brief/);
  assert.match(assignmentView, /A response to one source cannot stand in for another/);
});

test("Evidence exposes the owner-scoped Daily Assignment and archive ledger", () => {
  assert.match(labSurface, /Recent route outcomes/);
  assert.match(labSurface, /assignmentHistory\.slice/);
  assert.match(labSurface, /item\.archive\.status/);
});
