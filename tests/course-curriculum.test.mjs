import assert from "node:assert/strict";
import test from "node:test";

import {
  CALIBRATION_WEEK_MINUTES,
  COURSE_FIRST_BREADTH_ROTATIONS,
  COURSE_FIRST_CHECKPOINTS,
  NORMAL_WEEK_MINUTES,
  validateCurriculumEpoch,
  validatePracticeDay,
} from "../app/courseCurriculum.ts";

export function courseFirstEpoch(overrides = {}) {
  return {
    contractVersion: "course_first_v1",
    epochKey: "course-first|2026-08-24",
    startedLearnerDate: "2026-08-24",
    timezone: "America/Chicago",
    destination: "Summer 2027 early-stage investing role",
    breadthRotations: [...COURSE_FIRST_BREADTH_ROTATIONS],
    confirmationWeeksPerFinalist: 3,
    postCycleAllocation: { provisionalFocus: 70, runnerUpAndDisconfirmation: 30 },
    weekdayMinutes: 105,
    normalWeekMinutes: 720,
    calibrationWeekMinutes: 720,
    ...overrides,
  };
}

export function courseFirstPracticeDay(overrides = {}) {
  return {
    contractVersion: "course_first_v1",
    practiceDayKey: "course-first|2026-08-24|2026-08-24",
    learnerDate: "2026-08-24",
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
      hypothesis: "Early AI infrastructure products with observed workflow pull will show evidence beyond demo novelty.",
      companyNamesWithheld: true,
    },
    checkpoints: COURSE_FIRST_CHECKPOINTS.map((checkpoint) => ({ ...checkpoint })),
    totalMinutes: 105,
    ...overrides,
  };
}

test("course-first contracts preserve the accepted rotations and exact 720-minute weeks", () => {
  assert.deepEqual(COURSE_FIRST_BREADTH_ROTATIONS, [
    "AI and data systems",
    "Industrial and climate systems",
    "Fintech infrastructure",
    "Digital health and bio tools",
    "Enterprise software",
    "Cybersecurity and digital trust",
  ]);
  assert.equal(NORMAL_WEEK_MINUTES, 720);
  assert.equal(CALIBRATION_WEEK_MINUTES, 720);
  assert.equal(validateCurriculumEpoch(courseFirstEpoch()), null);
  assert.equal(validatePracticeDay(courseFirstPracticeDay(), courseFirstEpoch()), null);
});

test("practice days reject supplied companies and mutable checkpoint completion", () => {
  const suppliedCompany = courseFirstPracticeDay({
    sourcingPrompt: {
      surface: "Accelerator launches",
      hypothesis: "Test observed workflow pull.",
      companyNamesWithheld: false,
      companies: ["Example AI"],
    },
  });
  assert.match(validatePracticeDay(suppliedCompany, courseFirstEpoch()), /company names/i);

  const storedProgress = courseFirstPracticeDay({
    checkpoints: COURSE_FIRST_CHECKPOINTS.map((checkpoint, index) => ({
      ...checkpoint,
      ...(index === 0 ? { completed: true } : {}),
    })),
  });
  assert.match(validatePracticeDay(storedProgress, courseFirstEpoch()), /derived/i);
});
