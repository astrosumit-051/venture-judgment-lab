import { isCanonicalDate } from "./calibration.ts";

export const ASSIGNMENT_EVENT_TYPES = [
  "learner_response",
  "artifact_link",
  "source_status",
  "metadata_correction",
  "replacement_link",
  "revisit",
  "continuation",
  "later_usefulness",
  "completion",
  "missed_practice",
] as const;

type AssignmentEventType = typeof ASSIGNMENT_EVENT_TYPES[number];
type EventData = Record<string, unknown>;

export function completionReadiness(
  readingRecordIds: readonly string[],
  learnerResponseRecordIds: readonly string[],
): string | null {
  if (readingRecordIds.length !== 4 || new Set(readingRecordIds).size !== 4) {
    return "A completable Daily Brief must own exactly four Reading Records.";
  }
  const responseCounts = new Map<string, number>();
  for (const recordId of learnerResponseRecordIds) {
    responseCounts.set(recordId, (responseCounts.get(recordId) ?? 0) + 1);
  }
  if ([...responseCounts.values()].some((count) => count !== 1)) {
    return "Completion requires exactly one learner response for each Reading Record.";
  }
  if (learnerResponseRecordIds.length !== 4 || readingRecordIds.some((recordId) => !responseCounts.has(recordId))) {
    return "Completion requires learner responses for all four distinct Reading Records.";
  }
  return null;
}

function hasText(value: unknown, max = 5000): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function httpsUrl(value: unknown): boolean {
  try {
    return new URL(String(value)).protocol === "https:";
  } catch {
    return false;
  }
}

function only(data: EventData, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(data).every((key) => allowed.has(key));
}

export function validateAssignmentEvent(
  recordType: string,
  eventType: string,
  data: EventData,
): string | null {
  if (!(ASSIGNMENT_EVENT_TYPES as readonly string[]).includes(eventType)) {
    return "Choose a supported typed assignment event.";
  }
  if (JSON.stringify(data).length > 20_000 || data.originalPreserved !== true) {
    return "Typed assignment evidence must be bounded and preserve the original.";
  }
  const readingOnly: AssignmentEventType[] = [
    "learner_response", "artifact_link", "source_status", "metadata_correction",
    "replacement_link", "revisit", "continuation", "later_usefulness",
  ];
  if (readingOnly.includes(eventType as AssignmentEventType) && recordType !== "reading_record") {
    return "This event can append only to an immutable Reading Record.";
  }
  if (["completion", "missed_practice"].includes(eventType) && recordType !== "daily_brief") {
    return "Completion or missed-practice evidence can append only to a Daily Brief.";
  }
  if (eventType === "learner_response") {
    if (!only(data, ["independentFirstPass", "takeaway", "uncertainty", "originalPreserved", "privateEvidenceConfirmed"])
      || !hasText(data.independentFirstPass) || !hasText(data.takeaway) || !hasText(data.uncertainty)
      || data.privateEvidenceConfirmed !== true) {
      return "A learner response needs a bounded Independent First Pass, takeaway, uncertainty, preservation marker, and privacy confirmation.";
    }
  } else if (eventType === "artifact_link") {
    if (!only(data, ["artifactRecordId", "artifactType", "use", "originalPreserved"])
      || !hasText(data.artifactRecordId, 80) || !hasText(data.artifactType, 80) || !hasText(data.use)) {
      return "An artifact link needs a bounded private record identity, type, and demonstrated use.";
    }
  } else if (eventType === "source_status") {
    const states = ["available", "moved", "paywalled", "unavailable", "corrected", "retracted", "withdrawn", "superseded"];
    if (!only(data, ["status", "evidence", "sourceUrl", "originalPreserved"])
      || !states.includes(String(data.status)) || !hasText(data.evidence)
      || (data.sourceUrl !== undefined && !httpsUrl(data.sourceUrl))) {
      return "Source status needs a bounded allowed state, evidence, and optional HTTPS source.";
    }
  } else if (eventType === "metadata_correction") {
    if (!only(data, ["field", "originalValue", "correctedValue", "evidence", "originalPreserved"])
      || !hasText(data.field, 100) || !hasText(data.originalValue) || !hasText(data.correctedValue) || !hasText(data.evidence)) {
      return "A metadata correction needs the field, original value, corrected value, and evidence.";
    }
  } else if (eventType === "replacement_link") {
    if (!only(data, ["replacementUrl", "reason", "originalPreserved"])
      || !httpsUrl(data.replacementUrl) || !hasText(data.reason)) {
      return "A replacement link needs a lawful HTTPS source, reason, and preserved original.";
    }
  } else if (eventType === "revisit") {
    if (!only(data, ["reason", "changedQuestion", "originalPreserved"])
      || !hasText(data.reason) || !hasText(data.changedQuestion)) {
      return "A revisit needs a reason and the changed reading question.";
    }
  } else if (eventType === "continuation") {
    if (!only(data, ["assignedSection", "reason", "originalPreserved"])
      || !hasText(data.assignedSection) || !hasText(data.reason)) {
      return "A continuation needs the newly assigned section and reason.";
    }
  } else if (eventType === "later_usefulness") {
    const state = Number(data.state);
    if (!only(data, ["state", "outcome", "misleading", "superseded", "unresolved", "originalPreserved"])
      || !Number.isInteger(state) || state < 0 || state > 3 || !hasText(data.outcome)
      || typeof data.misleading !== "boolean" || typeof data.superseded !== "boolean" || typeof data.unresolved !== "boolean") {
      return "Later usefulness needs state 0–3, an outcome, and separate misleading, superseded, and unresolved flags.";
    }
  } else if (eventType === "completion") {
    if (!only(data, ["completedLearnerDate", "originalPreserved"])
      || !isCanonicalDate(data.completedLearnerDate)) {
      return "Completion needs the canonical completed learner date.";
    }
  } else if (eventType === "missed_practice") {
    if (!only(data, ["learnerDate", "reason", "noCatchUpDebt", "originalPreserved"])
      || !isCanonicalDate(data.learnerDate) || !hasText(data.reason) || data.noCatchUpDebt !== true) {
      return "Missed practice needs its learner date, bounded reason, and no-catch-up-debt marker.";
    }
  }
  return null;
}
