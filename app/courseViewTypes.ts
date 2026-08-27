import type { TodayAssignment } from "./DailyAssignmentView";

export type CheckpointState = "not_started" | "in_progress" | "complete";

export type PracticeProgress = {
  readings: { required: number; completed: number; state: CheckpointState };
  scanAndJudge: { requiredCompanies: number; discoveredCompanies: number; snapshotLocked: boolean; state: CheckpointState };
  forecast: { required: number; completed: number; state: CheckpointState };
  recruiting: { required: number; completed: number; state: CheckpointState };
  preserve: { required: number; completed: number; state: CheckpointState };
};

export type CurriculumEpoch = {
  id: string;
  startedLearnerDate: string;
  destination: string;
  breadthRotations: string[];
  confirmationWeeksPerFinalist: number;
  postCycleAllocation: { provisionalFocus: number; runnerUpAndDisconfirmation: number };
};

export type PracticeDay = {
  id: string;
  learnerDate: string;
  curriculumDay: number;
  rotationWeek: number;
  phase: "breadth" | "confirmation";
  sector: string;
  rotationTitle: string;
  teachingPurpose: string;
  whyToday: string[];
  sourcingPrompt: { surface: string; hypothesis: string; companyNamesWithheld: true };
  checkpoints: Array<{ id: string; label: string; minutes: number }>;
  totalMinutes: number;
};

export type CourseRecord = {
  id: string;
  recordType: string;
  parentId?: string | null;
  title: string;
  payload: Record<string, unknown>;
  committedAt: string;
};

export type CourseTodayState = {
  epoch: CurriculumEpoch | null;
  practiceDay: PracticeDay | null;
  assignment: TodayAssignment | null;
  progress: PracticeProgress | null;
};
