import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [workspace, today, practice, evidence, styles, curriculum] = await Promise.all([
  readFile(new URL("../app/LabWorkspace.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/CourseTodayView.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/PracticeView.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/EvidenceView.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/courseCurriculum.ts", import.meta.url), "utf8"),
]);

test("the primary shell is course-first and keeps four permanent destinations", () => {
  assert.match(workspace, /"today" \| "practice" \| "evidence" \| "more"/);
  for (const destination of ["Today", "Practice", "Evidence", "More"]) {
    assert.match(workspace, new RegExp(`label: "${destination}"`));
  }
  assert.match(workspace, /CourseTodayView/);
  assert.match(workspace, /PracticeView/);
  assert.match(workspace, /EvidenceView/);
});

test("Today is an ordered route with judgment-first company comparison", () => {
  for (const checkpoint of ["Readings", "Scan companies", "Forecast", "Recruiting", "Review & preserve"]) {
    assert.match(today, new RegExp(checkpoint));
  }
  for (const field of ["Observed product", "Why now", "Strongest signal", "Key unknown"]) {
    assert.match(today, new RegExp(field));
  }
  assert.match(today, /Save draft/);
  assert.match(today, /Lock judgment/);
  assert.match(today, /Ask Luna \(after lock\)/);
  assert.match(today, /disabled={!snapshotLocked}/);
  assert.doesNotMatch(today, /score|rating/i);
});

test("Practice and Evidence teach course structure and judgment development", () => {
  assert.match(practice, /Twelve-week course map/);
  assert.match(curriculum, /AI and data systems/);
  assert.match(curriculum, /Cybersecurity and digital trust/);
  assert.match(practice, /720 minutes/);
  assert.match(evidence, /Decision Delta/);
  assert.match(evidence, /Brier/);
  assert.match(evidence, /Reasoning revisions/);
  assert.match(evidence, /Founder evidence/);
  assert.match(evidence, /Sector advantage/);
});

test("the course layout has desktop, tablet, and mobile reflow boundaries", () => {
  assert.match(styles, /\.course-today-layout/);
  assert.match(styles, /\.company-comparison/);
  assert.match(styles, /@media \(max-width: 1100px\)/);
  assert.match(styles, /@media \(max-width: 760px\)/);
});
