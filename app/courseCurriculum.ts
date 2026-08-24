import { isCanonicalDate, isValidTimeZone } from "./calibration.ts";

export const COURSE_FIRST_CONTRACT_VERSION = "course_first_v1" as const;

export const COURSE_FIRST_BREADTH_ROTATIONS = [
  "AI and data systems",
  "Industrial and climate systems",
  "Fintech infrastructure",
  "Digital health and bio tools",
  "Enterprise software",
  "Cybersecurity and digital trust",
] as const;

export const COURSE_FIRST_CHECKPOINTS = [
  { id: "readings", label: "Read four curated readings", minutes: 55 },
  { id: "scan_and_judge", label: "Scan three early-stage companies, then choose and judge one", minutes: 25 },
  { id: "forecast", label: "Commit one falsifiable forecast", minutes: 10 },
  { id: "recruiting", label: "Complete one small recruiting action", minutes: 10 },
  { id: "preserve", label: "Review and preserve", minutes: 5 },
] as const;

export const COURSE_FIRST_WEEKDAY_MINUTES = COURSE_FIRST_CHECKPOINTS.reduce(
  (sum, checkpoint) => sum + checkpoint.minutes,
  0,
);

export const NORMAL_WEEKEND_MINUTES = {
  underwrite: 135,
  secondOrderMap: 30,
  recruitingOrField: 30,
} as const;

export const CALIBRATION_WEEKEND_MINUTES = {
  underwrite: 90,
  calibration: 60,
  secondOrderMap: 30,
  review: 15,
} as const;

export const NORMAL_WEEK_MINUTES = COURSE_FIRST_WEEKDAY_MINUTES * 5
  + Object.values(NORMAL_WEEKEND_MINUTES).reduce((sum, minutes) => sum + minutes, 0);
export const CALIBRATION_WEEK_MINUTES = COURSE_FIRST_WEEKDAY_MINUTES * 5
  + Object.values(CALIBRATION_WEEKEND_MINUTES).reduce((sum, minutes) => sum + minutes, 0);

type JsonObject = Record<string, unknown>;

export type CurriculumEpochInput = {
  contractVersion: typeof COURSE_FIRST_CONTRACT_VERSION;
  epochKey: string;
  startedLearnerDate: string;
  timezone: string;
  destination: "Summer 2027 early-stage investing role";
  breadthRotations: string[];
  confirmationWeeksPerFinalist: 3;
  postCycleAllocation: { provisionalFocus: 70; runnerUpAndDisconfirmation: 30 };
  weekdayMinutes: 105;
  normalWeekMinutes: 720;
  calibrationWeekMinutes: 720;
};

export type PracticeDayInput = {
  contractVersion: typeof COURSE_FIRST_CONTRACT_VERSION;
  practiceDayKey: string;
  learnerDate: string;
  curriculumDay: number;
  rotationWeek: number;
  phase: "breadth" | "confirmation";
  sector: string;
  rotationTitle: string;
  teachingPurpose: string;
  whyToday: string[];
  sourcingPrompt: {
    surface: string;
    hypothesis: string;
    companyNamesWithheld: true;
  };
  checkpoints: Array<{ id: string; label: string; minutes: number }>;
  totalMinutes: 105;
};

export type CourseFirstCurriculumInput = {
  epoch: CurriculumEpochInput;
  practiceDay: PracticeDayInput;
};

function object(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function onlyKeys(value: JsonObject, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function boundedText(value: unknown, maximum = 5_000): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

function equalStringArray(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((item, index) => item === expected[index]);
}

export function validateCurriculumEpoch(value: unknown): string | null {
  if (!object(value) || JSON.stringify(value).length > 20_000) {
    return "The Curriculum Epoch must be a bounded structured record.";
  }
  const keys = [
    "contractVersion", "epochKey", "startedLearnerDate", "timezone", "destination",
    "breadthRotations", "confirmationWeeksPerFinalist", "postCycleAllocation",
    "weekdayMinutes", "normalWeekMinutes", "calibrationWeekMinutes",
  ];
  if (!onlyKeys(value, keys)) return "The Curriculum Epoch contains an undeclared field.";
  if (value.contractVersion !== COURSE_FIRST_CONTRACT_VERSION) return "Choose the supported course-first contract version.";
  if (!isCanonicalDate(value.startedLearnerDate) || !isValidTimeZone(value.timezone)) {
    return "The Curriculum Epoch needs a canonical start date and IANA timezone.";
  }
  if (value.epochKey !== `course-first|${value.startedLearnerDate}`) {
    return "The Curriculum Epoch key must be derived from its immutable start date.";
  }
  if (value.destination !== "Summer 2027 early-stage investing role") {
    return "The course-first epoch must preserve the accepted Summer 2027 destination.";
  }
  if (!equalStringArray(value.breadthRotations, COURSE_FIRST_BREADTH_ROTATIONS)) {
    return "The Curriculum Epoch must preserve all six accepted breadth rotations in order.";
  }
  if (value.confirmationWeeksPerFinalist !== 3) {
    return "Each of the two evidence-qualified finalist sectors needs a three-week confirmation sprint.";
  }
  if (!object(value.postCycleAllocation)
    || !onlyKeys(value.postCycleAllocation, ["provisionalFocus", "runnerUpAndDisconfirmation"])
    || value.postCycleAllocation.provisionalFocus !== 70
    || value.postCycleAllocation.runnerUpAndDisconfirmation !== 30) {
    return "The post-cycle allocation must remain 70/30 between the provisional focus and deliberate breadth.";
  }
  if (value.weekdayMinutes !== COURSE_FIRST_WEEKDAY_MINUTES
    || value.normalWeekMinutes !== NORMAL_WEEK_MINUTES
    || value.calibrationWeekMinutes !== CALIBRATION_WEEK_MINUTES) {
    return "The Curriculum Epoch must preserve the accepted 105-minute days and exact 720-minute weeks.";
  }
  return null;
}

export function validatePracticeDay(value: unknown, epoch: unknown): string | null {
  const invalidEpoch = validateCurriculumEpoch(epoch);
  if (invalidEpoch) return invalidEpoch;
  if (!object(value) || JSON.stringify(value).length > 30_000) {
    return "The Practice Day must be a bounded structured record.";
  }
  const keys = [
    "contractVersion", "practiceDayKey", "learnerDate", "curriculumDay", "rotationWeek",
    "phase", "sector", "rotationTitle", "teachingPurpose", "whyToday", "sourcingPrompt",
    "checkpoints", "totalMinutes",
  ];
  if (!onlyKeys(value, keys)) return "The Practice Day contains an undeclared field.";
  if (value.contractVersion !== COURSE_FIRST_CONTRACT_VERSION) return "Choose the supported course-first Practice Day version.";
  const typedEpoch = epoch as CurriculumEpochInput;
  if (!isCanonicalDate(value.learnerDate) || value.learnerDate < typedEpoch.startedLearnerDate) {
    return "The Practice Day must use a canonical date on or after Day 1.";
  }
  if (value.practiceDayKey !== `${typedEpoch.epochKey}|${value.learnerDate}`) {
    return "The Practice Day key must link the epoch and learner date.";
  }
  if (!Number.isInteger(value.curriculumDay) || Number(value.curriculumDay) < 1) {
    return "The Practice Day needs a positive curriculum day number.";
  }
  if (!Number.isInteger(value.rotationWeek) || Number(value.rotationWeek) < 1 || Number(value.rotationWeek) > 12) {
    return "The first Sector Discovery Cycle contains twelve completed rotation weeks.";
  }
  if (!new Set(["breadth", "confirmation"]).has(String(value.phase))) return "Choose breadth or confirmation as the Practice Day phase.";
  if (!(COURSE_FIRST_BREADTH_ROTATIONS as readonly string[]).includes(String(value.sector))) {
    return "The Practice Day sector must belong to the accepted technology rotation set.";
  }
  if (value.phase === "breadth") {
    if (Number(value.rotationWeek) > COURSE_FIRST_BREADTH_ROTATIONS.length
      || value.sector !== COURSE_FIRST_BREADTH_ROTATIONS[Number(value.rotationWeek) - 1]) {
      return "Breadth Practice Days must follow the six accepted rotations in order.";
    }
  } else if (Number(value.rotationWeek) <= COURSE_FIRST_BREADTH_ROTATIONS.length) {
    return "Confirmation sprints begin only after all six breadth rotations are complete.";
  }
  if (!boundedText(value.rotationTitle, 180) || !boundedText(value.teachingPurpose)) {
    return "The Practice Day needs a bounded rotation title and teaching purpose.";
  }
  if (!Array.isArray(value.whyToday) || value.whyToday.length !== 3
    || value.whyToday.some((reason) => !boundedText(reason, 1_000))) {
    return "The Practice Day needs exactly three concise reasons for today's route.";
  }
  if (!object(value.sourcingPrompt)
    || !onlyKeys(value.sourcingPrompt, ["surface", "hypothesis", "companyNamesWithheld"])
    || !boundedText(value.sourcingPrompt.surface, 2_000)
    || !boundedText(value.sourcingPrompt.hypothesis, 2_000)
    || value.sourcingPrompt.companyNamesWithheld !== true) {
    return "The sourcing prompt must name a surface and falsifiable hypothesis while withholding company names.";
  }
  if (!Array.isArray(value.checkpoints) || value.checkpoints.length !== COURSE_FIRST_CHECKPOINTS.length) {
    return "The Practice Day must contain the five accepted checkpoints.";
  }
  for (let index = 0; index < COURSE_FIRST_CHECKPOINTS.length; index += 1) {
    const actual = value.checkpoints[index];
    const expected = COURSE_FIRST_CHECKPOINTS[index];
    if (!object(actual) || !onlyKeys(actual, ["id", "label", "minutes"])) {
      return "Checkpoint completion is derived from immutable evidence and cannot be stored on the Practice Day.";
    }
    if (actual.id !== expected.id || actual.label !== expected.label || actual.minutes !== expected.minutes) {
      return "The Practice Day must preserve the accepted checkpoint order and timeboxes.";
    }
  }
  if (value.totalMinutes !== COURSE_FIRST_WEEKDAY_MINUTES) {
    return "The Practice Day must total exactly 105 minutes.";
  }
  return null;
}

export function validateCourseFirstCurriculum(value: unknown, learnerDate?: string): string | null {
  if (!object(value) || !onlyKeys(value, ["epoch", "practiceDay"])) {
    return "A course-first run needs one Curriculum Epoch and one Practice Day.";
  }
  const invalidEpoch = validateCurriculumEpoch(value.epoch);
  if (invalidEpoch) return invalidEpoch;
  const invalidDay = validatePracticeDay(value.practiceDay, value.epoch);
  if (invalidDay) return invalidDay;
  if (learnerDate && (value.practiceDay as PracticeDayInput).learnerDate !== learnerDate) {
    return "The Practice Day date must match the immutable Daily Assignment date.";
  }
  return null;
}
