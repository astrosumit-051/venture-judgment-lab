"use client";

import type { AssignmentEvent } from "./DailyAssignmentView";

const EVENT_LABELS: Record<string, string> = {
  assignment_committed: "Assignment committed",
  learner_response: "Independent First Pass",
  artifact_link: "Artifact link",
  source_status: "Source status",
  metadata_correction: "Metadata correction",
  replacement_link: "Replacement source",
  revisit: "Revisit",
  continuation: "Continuation",
  later_usefulness: "Later usefulness",
  completion: "Completion",
  assignment_completed: "Completion",
  missed_practice: "Missed practice",
  archive_preserved: "Archive preserved",
  failed: "Operator failure",
};

function stringValue(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value : "";
}

function sentence(label: string, value: string): string | null {
  return value ? `${label}: ${value}` : null;
}

function eventDetails(event: AssignmentEvent): string[] {
  const data = event.eventData;
  switch (event.eventType) {
    case "assignment_committed":
      return [
        sentence("Learner date", stringValue(data, "learnerDate")),
        sentence("Outcome", stringValue(data, "assignmentState").replaceAll("_", " ")),
      ].filter((value): value is string => Boolean(value));
    case "learner_response":
      return [
        sentence("First pass", stringValue(data, "independentFirstPass")),
        sentence("Takeaway", stringValue(data, "takeaway")),
        sentence("Uncertainty", stringValue(data, "uncertainty")),
      ].filter((value): value is string => Boolean(value));
    case "artifact_link":
      return [
        sentence("Artifact", [stringValue(data, "artifactType"), stringValue(data, "artifactRecordId")].filter(Boolean).join(" · ")),
        sentence("Use", stringValue(data, "use")),
      ].filter((value): value is string => Boolean(value));
    case "source_status":
      return [sentence("Status", stringValue(data, "status")), sentence("Evidence", stringValue(data, "evidence"))].filter((value): value is string => Boolean(value));
    case "metadata_correction":
      return [
        sentence("Field", stringValue(data, "field")),
        sentence("Original", stringValue(data, "originalValue")),
        sentence("Corrected", stringValue(data, "correctedValue")),
        sentence("Evidence", stringValue(data, "evidence")),
      ].filter((value): value is string => Boolean(value));
    case "replacement_link":
      return [sentence("Reason", stringValue(data, "reason"))].filter((value): value is string => Boolean(value));
    case "revisit":
      return [sentence("Reason", stringValue(data, "reason")), sentence("Changed question", stringValue(data, "changedQuestion"))].filter((value): value is string => Boolean(value));
    case "continuation":
      return [sentence("Assigned section", stringValue(data, "assignedSection")), sentence("Reason", stringValue(data, "reason"))].filter((value): value is string => Boolean(value));
    case "later_usefulness": {
      const state = typeof data.state === "number" ? String(data.state) : stringValue(data, "state");
      const flags = ["misleading", "superseded", "unresolved"].filter((key) => data[key] === true).join(", ");
      return [sentence("Usefulness state", state), sentence("Outcome", stringValue(data, "outcome")), sentence("Flags", flags || "none")].filter((value): value is string => Boolean(value));
    }
    case "completion":
    case "assignment_completed":
      return [sentence("Learner date", stringValue(data, "completedLearnerDate"))].filter((value): value is string => Boolean(value));
    case "missed_practice":
      return [sentence("Learner date", stringValue(data, "learnerDate")), sentence("Reason", stringValue(data, "reason")), data.noCatchUpDebt === true ? "No catch-up debt" : null].filter((value): value is string => Boolean(value));
    case "failed":
      return [
        sentence("Stage", stringValue(data, "stage")),
        sentence("Failure", stringValue(data, "summary")),
        sentence("Next action", stringValue(data, "nextAction")),
      ].filter((value): value is string => Boolean(value));
    default: {
      const copy = ["text", "summary", "response", "reason", "status", "evidence", "outcome"]
        .map((key) => stringValue(data, key))
        .find(Boolean);
      return copy ? [copy] : ["Typed event preserved; no public detail was supplied."];
    }
  }
}

function eventHref(event: AssignmentEvent): string {
  const keys = event.eventType === "replacement_link" ? ["replacementUrl"] : ["sourceUrl", "url"];
  return keys.map((key) => stringValue(event.eventData, key)).find((value) => value.startsWith("https://")) ?? "";
}

export function AssignmentEventView({ event, formatTimestamp }: { event: AssignmentEvent; formatTimestamp: (value: string) => string }) {
  const label = EVENT_LABELS[event.eventType] ?? event.eventType.replaceAll("_", " ");
  const details = eventDetails(event);
  const href = eventHref(event);
  return (
    <article className={`assignment-overlay overlay-${event.eventType}`}>
      <div><strong>{label}</strong><time>{formatTimestamp(event.occurredAt)}</time></div>
      {details.map((detail, index) => <p key={`${event.id}-${index}`}>{detail}</p>)}
      {href && <a href={href} target="_blank" rel="noreferrer">Open appended source ↗</a>}
    </article>
  );
}
