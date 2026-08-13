export const DAILY_OPERATOR_TIMEZONE = "America/New_York";
export const DAILY_OPERATOR_COMPLETION_GRACE_MS = 6 * 3_600_000;

function validIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function easternScheduleParts(value: string): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_OPERATOR_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
}

export function scheduledAtWeekdaySevenEastern(value: unknown): boolean {
  if (!validIso(value)) return false;
  const parts = easternScheduleParts(value);
  return (
    !new Set(["Sat", "Sun"]).has(parts.weekday)
    && parts.hour === "07"
    && parts.minute === "00"
    && parts.second === "00"
  );
}

export function dailyOperatorRunKey(scheduledFor: string): string {
  if (!validIso(scheduledFor)) return "";
  const parts = easternScheduleParts(scheduledFor);
  return `daily-operator|${parts.year}-${parts.month}-${parts.day}`;
}

export function latestExpectedDailyOperatorRun(now = new Date()): string | null {
  const cursor = new Date(now.getTime() - DAILY_OPERATOR_COMPLETION_GRACE_MS);
  cursor.setUTCMinutes(0, 0, 0);
  for (let hours = 0; hours <= 8 * 24; hours += 1) {
    if (scheduledAtWeekdaySevenEastern(cursor.toISOString())) {
      return cursor.toISOString();
    }
    cursor.setTime(cursor.getTime() - 3_600_000);
  }
  return null;
}

export type DailyOperatorNotificationInput = {
  assignmentState: "ready" | "brief_unavailable" | "intentionally_displaced";
  assignmentAccepted: boolean;
  archivePreserved: boolean;
  exactReplay: boolean;
  interventionReason: string;
};

export type DailyOperatorNotification = {
  decision: "NOTIFY" | "DONT_NOTIFY";
  reason:
    | "brief_ready"
    | "learner_intervention"
    | "archive_intervention"
    | "assignment_intervention"
    | "intentional_displacement"
    | "exact_replay";
};

export function dailyOperatorNotification(
  input: DailyOperatorNotificationInput,
): DailyOperatorNotification {
  if (input.exactReplay) {
    return { decision: "DONT_NOTIFY", reason: "exact_replay" };
  }
  if (!input.assignmentAccepted) {
    return { decision: "NOTIFY", reason: "assignment_intervention" };
  }
  if (!input.archivePreserved) {
    return { decision: "NOTIFY", reason: "archive_intervention" };
  }
  if (input.assignmentState === "brief_unavailable" || input.interventionReason.trim()) {
    return { decision: "NOTIFY", reason: "learner_intervention" };
  }
  if (input.assignmentState === "intentionally_displaced") {
    return { decision: "DONT_NOTIFY", reason: "intentional_displacement" };
  }
  return { decision: "NOTIFY", reason: "brief_ready" };
}
