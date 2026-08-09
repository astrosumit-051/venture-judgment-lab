import { dateInTimeZone, isCanonicalDate, isValidTimeZone } from "./calibration.ts";
import {
  normalizeRecruitingUrl,
  recruitingPayloadFingerprint,
  validateRecruitingPayload,
} from "./recruiting.ts";

export const MONITOR_TARGETS = [
  {
    key: "bessemer-analyst-program",
    label: "Bessemer Analyst Program openings",
    sourceUrl: "https://job-boards.greenhouse.io/bvpanalyst",
    allowedHosts: ["job-boards.greenhouse.io"],
    purpose: "Discover and reverify paid Bessemer investment-team analyst roles.",
  },
  {
    key: "pear-fellows",
    label: "Pear Fellows",
    sourceUrl: "https://pear.vc/programs/dorm/fellows/",
    allowedHosts: ["pear.vc"],
    purpose: "Reverify the Investing Milestone application state and deadline.",
  },
  {
    key: "dorm-room-fund",
    label: "Dorm Room Fund investment partners",
    sourceUrl: "https://join.dormroomfund.com/",
    allowedHosts: ["join.dormroomfund.com"],
    purpose: "Reverify regional applications, deadlines, eligibility, and workload.",
  },
  {
    key: "keyhorse-careers",
    label: "Keyhorse Capital careers",
    sourceUrl: "https://www.keyhorse.vc/careers",
    allowedHosts: ["www.keyhorse.vc", "keyhorse.vc"],
    purpose: "Detect a public opening without assuming one exists.",
  },
  {
    key: "contrary-venture-partner",
    label: "Contrary Venture Partner Program",
    sourceUrl: "https://applications.contrary.com/?program=Venture+Partner+Program",
    allowedHosts: ["applications.contrary.com"],
    purpose: "Reverify milestone availability, requirements, and deadline evidence.",
  },
  {
    key: "insight-summer-analyst",
    label: "Insight Partners Summer Analyst Program",
    sourceUrl: "https://info.insightpartners.com/Summer-Analyst-Program.html",
    allowedHosts: ["info.insightpartners.com"],
    purpose: "Preserve closure or detect a newly published future analyst cycle.",
  },
  {
    key: "yc-careers",
    label: "Y Combinator careers",
    sourceUrl: "https://www.ycombinator.com/careers",
    allowedHosts: ["www.ycombinator.com", "ycombinator.com"],
    purpose: "Detect actual YC investment-team openings without conflating portfolio jobs.",
  },
] as const;

export const MONITOR_CHECK_OUTCOMES = ["reachable", "failure"] as const;
export const MONITOR_RUN_COMPLETION_GRACE_MS = 6 * 3_600_000;
export const MONITOR_FAILURE_CODES = [
  "unreachable", "blocked", "parse_failure", "authentication_required", "rate_limited", "unexpected",
] as const;

export const MATERIAL_OPPORTUNITY_FIELDS = [
  "status", "opportunityClass", "funnelClass", "publishedDeadline", "deadlineTimezone",
  "compensationEvidence", "roleScope", "qualificationReason", "immigrationState",
  "immigrationEvidence", "location", "workMode", "nextAction", "dueDate",
] as const;

export type OpportunityMonitorSnapshot = {
  targetKey: string;
  firm: string;
  roleTitle: string;
  cycleKey: string;
  officialUrl: string;
  location: string;
  workMode: string;
  status: string;
  opportunityClass: string;
  funnelClass: string;
  publishedDeadline: string;
  deadlineTimezone: string;
  compensationEvidence: string;
  roleScope: string;
  qualificationReason: string;
  immigrationState: string;
  immigrationEvidence: string;
  authorizationClaim: boolean;
  nextAction: string;
  dueDate: string;
  observedOn: string;
  timezone: string;
  decisionRequired: boolean;
  decisionReason: string;
};

export type OpportunityMonitorCheck = {
  targetKey: string;
  checkedAt: string;
  outcome: string;
  failureCode: string;
  failureSummary: string;
  snapshots: OpportunityMonitorSnapshot[];
};

export type OpportunityMonitorRunInput = {
  scheduledFor: string;
  checks: OpportunityMonitorCheck[];
};

const snapshotKeys = new Set([
  "targetKey", "firm", "roleTitle", "cycleKey", "officialUrl", "location", "workMode", "status",
  "opportunityClass", "funnelClass", "publishedDeadline", "deadlineTimezone",
  "compensationEvidence", "roleScope", "qualificationReason", "immigrationState",
  "immigrationEvidence", "authorizationClaim", "nextAction", "dueDate", "observedOn",
  "timezone", "decisionRequired", "decisionReason",
]);

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function targetByKey(key: string) {
  return MONITOR_TARGETS.find((target) => target.key === key);
}

function validIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function easternScheduleParts(value: string): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
}

export function scheduledAtMondayEightEastern(value: unknown): boolean {
  if (!validIso(value)) return false;
  const parts = easternScheduleParts(value);
  return parts.weekday === "Mon" && parts.hour === "08" && parts.minute === "00";
}

export function monitorRunKey(scheduledFor: string): string {
  if (!validIso(scheduledFor)) return "";
  const parts = easternScheduleParts(scheduledFor);
  return `opportunity-monitor|${parts.year}-${parts.month}-${parts.day}`;
}

export function latestExpectedMonitorRun(now = new Date()): string | null {
  const cursor = new Date(now.getTime() - MONITOR_RUN_COMPLETION_GRACE_MS);
  cursor.setUTCMinutes(0, 0, 0);
  for (let hours = 0; hours <= 8 * 24; hours += 1) {
    if (scheduledAtMondayEightEastern(cursor.toISOString())) return cursor.toISOString();
    cursor.setTime(cursor.getTime() - 3_600_000);
  }
  return null;
}

export function monitorInputFingerprint(input: OpportunityMonitorRunInput): string {
  return recruitingPayloadFingerprint(input as unknown as Record<string, unknown>);
}

export function materialOpportunityChanges(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): string[] {
  return MATERIAL_OPPORTUNITY_FIELDS.filter((field) => {
    const left = typeof previous[field] === "string" ? previous[field].trim() : previous[field];
    const right = typeof next[field] === "string" ? next[field].trim() : next[field];
    return left !== right;
  });
}

export function snapshotToOpportunityPayload(snapshot: OpportunityMonitorSnapshot): Record<string, unknown> {
  return {
    firm: snapshot.firm,
    roleTitle: snapshot.roleTitle,
    cycleKey: snapshot.cycleKey,
    opportunityClass: snapshot.opportunityClass,
    funnelClass: snapshot.funnelClass,
    officialUrl: snapshot.officialUrl,
    normalizedOfficialUrl: normalizeRecruitingUrl(snapshot.officialUrl),
    location: snapshot.location,
    workMode: snapshot.workMode,
    discoveredOn: snapshot.observedOn,
    verifiedOn: snapshot.observedOn,
    timezone: snapshot.timezone,
    initialStatus: snapshot.status,
    publishedDeadline: snapshot.publishedDeadline,
    deadlineTimezone: snapshot.deadlineTimezone,
    compensationEvidence: snapshot.compensationEvidence,
    roleScope: snapshot.roleScope,
    qualificationReason: snapshot.qualificationReason,
    immigrationState: snapshot.immigrationState,
    immigrationEvidence: snapshot.immigrationEvidence,
    authorizationClaim: snapshot.authorizationClaim,
    nextAction: snapshot.nextAction,
    dueDate: snapshot.dueDate,
  };
}

export function snapshotToObservationPayload(
  opportunityId: string,
  sourceUrl: string,
  snapshot: OpportunityMonitorSnapshot,
  changedFields: string[],
): Record<string, unknown> {
  return {
    opportunityId,
    observedOn: snapshot.observedOn,
    timezone: snapshot.timezone,
    status: snapshot.status,
    sourceType: "First-party page",
    sourceReference: sourceUrl,
    materialChange: changedFields.map((field) => `${field}: updated from prior effective evidence`).join("; "),
    opportunityClass: snapshot.opportunityClass,
    funnelClass: snapshot.funnelClass,
    publishedDeadline: snapshot.publishedDeadline,
    deadlineTimezone: snapshot.deadlineTimezone,
    compensationEvidence: snapshot.compensationEvidence,
    location: snapshot.location,
    workMode: snapshot.workMode,
    roleScope: snapshot.roleScope,
    qualificationReason: snapshot.qualificationReason,
    immigrationState: snapshot.immigrationState,
    immigrationEvidence: snapshot.immigrationEvidence,
    authorizationClaim: snapshot.authorizationClaim,
    nextAction: snapshot.nextAction,
    dueDate: snapshot.dueDate,
    privateEvidenceConfirmed: false,
  };
}

export function effectiveOpportunityPayload(
  opportunity: Record<string, unknown>,
  observations: Array<{ payload: Record<string, unknown>; committedAt: string }>,
): Record<string, unknown> {
  const latest = [...observations].sort((left, right) => (
    text(right.payload.observedOn).localeCompare(text(left.payload.observedOn))
    || right.committedAt.localeCompare(left.committedAt)
  ))[0];
  if (!latest) return { ...opportunity, status: opportunity.initialStatus };
  const overlayFields = [
    "status", "opportunityClass", "funnelClass", "publishedDeadline", "deadlineTimezone",
    "compensationEvidence", "location", "workMode", "roleScope", "qualificationReason",
    "immigrationState", "immigrationEvidence", "authorizationClaim", "nextAction", "dueDate",
  ];
  return {
    ...opportunity,
    ...Object.fromEntries(overlayFields.map((field) => [field, latest.payload[field] ?? opportunity[field]])),
  };
}

export function validateOpportunityMonitorRun(input: unknown, now = new Date()): string | null {
  if (!object(input) || Object.keys(input).some((key) => !new Set(["scheduledFor", "checks"]).has(key))) {
    return "An Opportunity Monitor Run accepts only its scheduled time and registered checks.";
  }
  if (JSON.stringify(input).length > 100_000) return "The bounded Opportunity Monitor Run is too large.";
  if (!scheduledAtMondayEightEastern(input.scheduledFor)) {
    return "The Opportunity Monitor Run must be scheduled for Monday at 8:00 AM Eastern.";
  }
  if (!Array.isArray(input.checks)) return "The Opportunity Monitor Run needs every registered first-party target exactly once.";
  const checks = input.checks;
  const targetKeys = checks.map((check) => object(check) ? text(check.targetKey) : "");
  if (
    checks.length !== MONITOR_TARGETS.length
    || new Set(targetKeys).size !== MONITOR_TARGETS.length
    || MONITOR_TARGETS.some((target) => !targetKeys.includes(target.key))
  ) return "The Opportunity Monitor Run needs every registered first-party target exactly once.";

  const scheduledAt = new Date(text(input.scheduledFor));
  if (scheduledAt.getTime() > now.getTime()) return "The Opportunity Monitor Run cannot be committed before its scheduled time.";
  const allOpportunityIdentities = new Set<string>();
  for (const rawCheck of checks) {
    if (!object(rawCheck) || Object.keys(rawCheck).some((key) => !new Set(["targetKey", "checkedAt", "outcome", "failureCode", "failureSummary", "snapshots"]).has(key))) {
      return "Each monitor check accepts only bounded source status and opportunity snapshots.";
    }
    const target = targetByKey(text(rawCheck.targetKey));
    if (!target) return "Every monitor check must identify a registered first-party target.";
    if (!validIso(rawCheck.checkedAt)) return "Every monitor check needs an exact ISO check time.";
    const checkedAt = new Date(rawCheck.checkedAt);
    if (checkedAt.getTime() > now.getTime()) return "Opportunity Monitor evidence cannot be dated in the future.";
    if (checkedAt.getTime() < scheduledAt.getTime() || checkedAt.getTime() - scheduledAt.getTime() > 7 * 86_400_000) {
      return "Opportunity Monitor checks must belong to their scheduled weekly run.";
    }
    const outcome = text(rawCheck.outcome);
    if (!(MONITOR_CHECK_OUTCOMES as readonly string[]).includes(outcome)) return "Choose reachable or failure for every first-party monitor check.";
    if (!Array.isArray(rawCheck.snapshots)) return "Every reachable monitor check needs an opportunity snapshot list, which may be empty.";
    if (outcome === "failure") {
      if (rawCheck.snapshots.length) return "A first-party monitor failure cannot include opportunity snapshots.";
      if (!(MONITOR_FAILURE_CODES as readonly string[]).includes(text(rawCheck.failureCode)) || !text(rawCheck.failureSummary) || text(rawCheck.failureSummary).length > 1000) {
        return "A monitor failure needs a bounded failure code and summary.";
      }
      continue;
    }
    if (text(rawCheck.failureCode) || text(rawCheck.failureSummary)) return "A reachable first-party check cannot preserve failure evidence.";
    for (const rawSnapshot of rawCheck.snapshots) {
      if (!object(rawSnapshot) || Object.keys(rawSnapshot).some((key) => !snapshotKeys.has(key))) {
        return "Opportunity snapshots reject raw page content, contact details, and undeclared fields.";
      }
      const snapshot = rawSnapshot as unknown as OpportunityMonitorSnapshot;
      if (snapshot.targetKey !== target.key) return "An opportunity snapshot must match its registered first-party target.";
      if (snapshot.authorizationClaim !== false || snapshot.immigrationState === "Authorized") {
        return "A first-party monitor snapshot cannot claim role authorization.";
      }
      let officialUrl: URL;
      try {
        officialUrl = new URL(snapshot.officialUrl);
      } catch {
        return "Every monitored opportunity needs a valid first-party URL.";
      }
      if (officialUrl.protocol !== "https:" || !target.allowedHosts.includes(officialUrl.hostname as never)) {
        return "Every monitored opportunity must remain on its registered first-party host.";
      }
      const normalized = normalizeRecruitingUrl(snapshot.officialUrl);
      const opportunityIdentity = `${normalized}|${snapshot.cycleKey}`;
      if (!normalized || allOpportunityIdentities.has(opportunityIdentity)) return "A monitor run cannot duplicate one opportunity cycle across target checks.";
      allOpportunityIdentities.add(opportunityIdentity);
      if (!isValidTimeZone(snapshot.timezone) || !isCanonicalDate(snapshot.observedOn) || snapshot.observedOn !== dateInTimeZone(checkedAt, snapshot.timezone)) {
        return "A monitored opportunity must preserve the check's real local observation date and timezone.";
      }
      if (typeof snapshot.decisionRequired !== "boolean" || (snapshot.decisionRequired ? !text(snapshot.decisionReason) : Boolean(text(snapshot.decisionReason)))) {
        return "A required learner decision needs a bounded reason, and no-decision snapshots must leave it empty.";
      }
      if (text(snapshot.decisionReason).length > 1000) return "A monitor decision reason is too large.";
      if (
        isCanonicalDate(snapshot.publishedDeadline)
        && snapshot.publishedDeadline < snapshot.observedOn
        && snapshot.status === "Open"
        && !snapshot.decisionRequired
      ) return "An opportunity still marked Open after its published deadline requires a learner decision.";
      const opportunityPayload = snapshotToOpportunityPayload(snapshot);
      const invalid = validateRecruitingPayload("recruiting_opportunity", opportunityPayload, dateInTimeZone(now, snapshot.timezone));
      if (invalid) return invalid;
    }
  }
  return null;
}
