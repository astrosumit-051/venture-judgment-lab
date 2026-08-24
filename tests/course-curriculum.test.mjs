import assert from "node:assert/strict";
import test from "node:test";

import {
  CALIBRATION_WEEK_MINUTES,
  COURSE_FIRST_BREADTH_ROTATIONS,
  COURSE_FIRST_CHECKPOINTS,
  NORMAL_WEEK_MINUTES,
  validateCourseFirstCurriculum,
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

test("curriculum days advance in order and confirmation locks two qualified finalists for three weeks each", () => {
  assert.match(validatePracticeDay(courseFirstPracticeDay({
    learnerDate: "2026-08-31",
    practiceDayKey: "course-first|2026-08-24|2026-08-31",
    curriculumDay: 6,
    rotationWeek: 1,
  }), courseFirstEpoch()), /five ordered/i);
  assert.equal(validatePracticeDay(courseFirstPracticeDay({
    learnerDate: "2026-08-26",
    practiceDayKey: "course-first|2026-08-24|2026-08-26",
    curriculumDay: 3,
  }), courseFirstEpoch()), null);
  assert.match(validatePracticeDay(courseFirstPracticeDay({
    learnerDate: "2026-08-26",
    practiceDayKey: "course-first|2026-08-24|2026-08-26",
    curriculumDay: 2,
  }), courseFirstEpoch()) ?? "", /no catch-up debt/i);
  const confirmationSelection = {
    contractVersion: "course_first_v1",
    selectionKey: "course-first|2026-08-24|confirmation",
    selectedLearnerDate: "2026-10-05",
    finalists: ["AI and data systems", "Cybersecurity and digital trust"].map((sector) => ({
      sector,
      curiosityEvidence: `Curiosity evidence for ${sector}`,
      accessEvidence: `Access evidence for ${sector}`,
      analyticalAdvantageEvidence: `Analytical advantage evidence for ${sector}`,
      originalInsightEvidence: `Original insight evidence for ${sector}`,
      independentDealFlowEvidence: `Independent deal flow evidence for ${sector}`,
    })),
  };
  const weekSeven = courseFirstPracticeDay({
    learnerDate: "2026-10-05",
    practiceDayKey: "course-first|2026-08-24|2026-10-05",
    curriculumDay: 31,
    rotationWeek: 7,
    phase: "confirmation",
    sector: "AI and data systems",
    confirmationSelectionKey: confirmationSelection.selectionKey,
  });
  assert.equal(validateCourseFirstCurriculum({ epoch: courseFirstEpoch(), practiceDay: weekSeven, confirmationSelection }), null);
  assert.match(validateCourseFirstCurriculum({
    epoch: courseFirstEpoch(),
    practiceDay: weekSeven,
    confirmationSelection: { ...confirmationSelection, selectedLearnerDate: "2026-08-24" },
  }) ?? "", /after the six breadth rotations/i);
  assert.match(validateCourseFirstCurriculum({
    epoch: courseFirstEpoch(),
    practiceDay: { ...weekSeven, sector: "Cybersecurity and digital trust" },
    confirmationSelection,
  }) ?? "", /locked/i);
  const weekTen = {
    ...weekSeven,
    learnerDate: "2026-10-26",
    practiceDayKey: "course-first|2026-08-24|2026-10-26",
    curriculumDay: 46,
    rotationWeek: 10,
    sector: "Cybersecurity and digital trust",
  };
  assert.equal(validateCourseFirstCurriculum({ epoch: courseFirstEpoch(), practiceDay: weekTen, confirmationSelection }), null);
});
