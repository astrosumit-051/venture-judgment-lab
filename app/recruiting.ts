import { isCanonicalDate, isValidTimeZone } from "./calibration.ts";

export const RECRUITING_RECORD_TYPES = [
  "recruiting_opportunity",
  "opportunity_observation",
  "recruiting_interaction",
  "application_attempt",
  "interview_practice",
  "portfolio_candidate",
] as const;

export const RECRUITING_CHILD_RECORD_TYPES = RECRUITING_RECORD_TYPES.slice(1);

export const OPPORTUNITY_CLASSES = [
  "Qualifying Internship",
  "Investing Milestone",
  "Relationship-led target",
  "Fallback",
] as const;

export const RECRUITING_FUNNEL_CLASSES = [
  "Qualified role",
  "Milestone",
  "Relationship target",
  "Fallback",
  "Archived",
] as const;

export const IMMIGRATION_EVIDENCE_STATES = [
  "Unknown",
  "General eligibility",
  "DSO-confirmed role fit",
  "Employer-compatible",
  "Authorized",
] as const;

export const OPPORTUNITY_STATUSES = [
  "Open",
  "No public opening",
  "Waiting",
  "Interviewing",
  "Offer",
  "Accepted milestone",
  "Closed",
  "Rejected",
  "Withdrawn",
] as const;

export const OPPORTUNITY_SOURCE_TYPES = ["First-party page", "Private recruiting evidence"] as const;
export const INTERACTION_KINDS = ["Relationship development", "Referral request", "Referral", "Inquiry", "Interview", "Follow-up"] as const;
export const INTERACTION_DIRECTIONS = ["Outbound", "Inbound", "Mutual"] as const;
export const INTERACTION_STATES = ["Draft", "Approved", "Sent", "Received", "Completed"] as const;
export const APPLICATION_ATTEMPT_STATES = ["Draft", "Ready for approval", "Submitted", "Verified closed", "Blocked", "Withdrawn"] as const;
export const INTERVIEW_PRACTICE_TYPES = ["Fit", "Lived experience", "Trend and company", "Case", "Mock interview", "Video"] as const;
export const PORTFOLIO_ARTIFACT_TYPES = ["Snapshot", "Underwrite", "Forecast", "Second-Order Map", "Founder Evidence", "Sourcing evidence"] as const;
export const PORTFOLIO_PUBLICATION_STATES = ["Private candidate", "Approved for recruiting use", "Rejected"] as const;
export const PORTFOLIO_SOURCE_RECORD_TYPES = [
  "snapshot_judgment", "weekly_underwrite", "forecast", "second_order_map",
  "founder_evidence_review", "sourcing_lead",
] as const;

export type ImmigrationEvidenceState = typeof IMMIGRATION_EVIDENCE_STATES[number];
export type RecruitingRecordType = typeof RECRUITING_RECORD_TYPES[number];

export type RecruitingRecordLike = {
  id: string;
  recordType: string;
  parentId: string | null;
  title: string;
  payload: Record<string, unknown>;
  committedAt: string;
};

export type RecruitingTargetSeed = {
  firm: string;
  roleTitle: string;
  cycleKey: string;
  opportunityClass: typeof OPPORTUNITY_CLASSES[number];
  funnelClass: typeof RECRUITING_FUNNEL_CLASSES[number];
  officialUrl: string;
  normalizedOfficialUrl: string;
  location: string;
  workMode: string;
  discoveredOn: string;
  verifiedOn: string;
  timezone: string;
  initialStatus: typeof OPPORTUNITY_STATUSES[number];
  publishedDeadline: string;
  deadlineTimezone: string;
  compensationEvidence: string;
  roleScope: string;
  qualificationReason: string;
  immigrationState: ImmigrationEvidenceState;
  immigrationEvidence: string;
  authorizationClaim: boolean;
  nextAction: string;
  dueDate: string;
};

export const RECRUITING_TARGET_SEEDS: RecruitingTargetSeed[] = [
  {
    firm: "Bessemer Venture Partners",
    roleTitle: "Summer Analyst 2027",
    cycleKey: "summer-analyst-2027",
    opportunityClass: "Qualifying Internship",
    funnelClass: "Qualified role",
    officialUrl: "https://job-boards.greenhouse.io/bvpanalyst/jobs/4633431005",
    normalizedOfficialUrl: "https://job-boards.greenhouse.io/bvpanalyst/jobs/4633431005",
    location: "New York, NY",
    workMode: "On site",
    discoveredOn: "2026-08-08",
    verifiedOn: "2026-08-08",
    timezone: "America/Chicago",
    initialStatus: "Open",
    publishedDeadline: "",
    deadlineTimezone: "Not stated",
    compensationEvidence: "$2,200 per week plus a $5,000 relocation and housing payment in the official posting.",
    roleScope: "Ten-week full-time investment role with sourcing, CEO interaction, diligence, roadmaps, deal work, and direct partner exposure.",
    qualificationReason: "Paid Summer 2027 investment-team work with direct early-stage sourcing and diligence exposure; the May 2028 graduation date is eligible.",
    immigrationState: "General eligibility",
    immigrationEvidence: "The application accepts a Student Visa or Work Visa response, but Centre has not confirmed this exact role and no authorization is claimed.",
    authorizationClaim: false,
    nextAction: "Complete the truthful application evidence and obtain role-specific DSO guidance before making an authorization statement.",
    dueDate: "2026-08-10",
  },
  {
    firm: "Pear VC",
    roleTitle: "Pear Fellows 2026–2027",
    cycleKey: "pear-fellows-2026-2027",
    opportunityClass: "Investing Milestone",
    funnelClass: "Milestone",
    officialUrl: "https://pear.vc/programs/dorm/fellows/",
    normalizedOfficialUrl: "https://pear.vc/programs/dorm/fellows",
    location: "Campus-based and virtual",
    workMode: "Program",
    discoveredOn: "2026-08-08",
    verifiedOn: "2026-08-08",
    timezone: "America/Chicago",
    initialStatus: "Open",
    publishedDeadline: "2026-08-09",
    deadlineTimezone: "Not stated",
    compensationEvidence: "No paid-employment evidence is stated on the official Fellows page.",
    roleScope: "Deal-flow access, partner mentorship, curriculum, campus programming, company diligence, and sector-thesis work.",
    qualificationReason: "High-value investing apprenticeship, but not a paid Qualifying Internship.",
    immigrationState: "Unknown",
    immigrationEvidence: "The public program page does not establish employment or work-authorization requirements.",
    authorizationClaim: false,
    nextAction: "Complete the learner-owned Independent First Pass and submit only after explicit approval if the official form accepts it.",
    dueDate: "2026-08-09",
  },
  {
    firm: "Dorm Room Fund",
    roleTitle: "Philadelphia & Southeast Investment Partner",
    cycleKey: "investment-partner-2026-2027",
    opportunityClass: "Investing Milestone",
    funnelClass: "Milestone",
    officialUrl: "https://join.dormroomfund.com/",
    normalizedOfficialUrl: "https://join.dormroomfund.com",
    location: "Kentucky / Philadelphia & Southeast team",
    workMode: "Remote under the published distance rule; applicant-specific placement unconfirmed",
    discoveredOn: "2026-08-13",
    verifiedOn: "2026-08-13",
    timezone: "America/Chicago",
    initialStatus: "Open",
    publishedDeadline: "2026-09-17",
    deadlineTimezone: "America/New_York",
    compensationEvidence: "The official page establishes travel-expense coverage but publishes no wage, salary, stipend, equity, or employment classification.",
    roleScope: "A 10–15-hour weekly commitment through graduation to find founders, evaluate companies, meet with a regional team, invest capital, and exercise student investment decision-making responsibility.",
    qualificationReason: "A high-value Investing Milestone with substantive sourcing, diligence, and investment ownership; it is not a paid Qualifying Internship on current evidence.",
    immigrationState: "Unknown",
    immigrationEvidence: "DRF says international students at U.S. or Canadian colleges may apply, but its public material does not establish compensation, legal classification, or role-specific work authorization.",
    authorizationClaim: false,
    nextAction: "When the learner is available, inspect the live form and prepare truthful answers; obtain written classification and DSO guidance, and submit only after explicit approval.",
    dueDate: "2026-09-17",
  },
  {
    firm: "Keyhorse Capital",
    roleTitle: "Summer 2027 investment inquiry",
    cycleKey: "summer-2027-inquiry",
    opportunityClass: "Relationship-led target",
    funnelClass: "Relationship target",
    officialUrl: "https://www.keyhorse.vc/careers",
    normalizedOfficialUrl: "https://www.keyhorse.vc/careers",
    location: "Kentucky",
    workMode: "Unknown",
    discoveredOn: "2026-08-08",
    verifiedOn: "2026-08-08",
    timezone: "America/Chicago",
    initialStatus: "No public opening",
    publishedDeadline: "",
    deadlineTimezone: "Not stated",
    compensationEvidence: "No Summer 2027 role or compensation is published on the careers page.",
    roleScope: "Potential relationship-led process discovery at a Kentucky pre-seed and seed investor; no role is assumed.",
    qualificationReason: "A strong existing relationship makes a truthful timeline inquiry more useful than waiting for an unlisted role.",
    immigrationState: "Unknown",
    immigrationEvidence: "No role exists to assess for employer compatibility or CPT fit.",
    authorizationClaim: false,
    nextAction: "Review the relationship-aware inquiry and send it only after explicit learner approval.",
    dueDate: "2026-08-12",
  },
];

const LEGACY_RECRUITING_CYCLE_KEYS: Record<string, string> = {
  "https://join.dormroomfund.com|Philly & Southeast Investment Partner": "investment-partner-2026-2027",
};

export function legacyRecruitingCycleKey(payload: Record<string, unknown>): string {
  const normalizedUrl = text(payload, "normalizedOfficialUrl") || normalizeRecruitingUrl(payload.officialUrl);
  const roleTitle = text(payload, "roleTitle");
  return RECRUITING_TARGET_SEEDS.find((seed) => (
    seed.normalizedOfficialUrl === normalizedUrl && seed.roleTitle === roleTitle
  ))?.cycleKey ?? LEGACY_RECRUITING_CYCLE_KEYS[`${normalizedUrl}|${roleTitle}`] ?? "";
}

const requiredKeys: Record<RecruitingRecordType, readonly string[]> = {
  recruiting_opportunity: [
    "firm", "roleTitle", "cycleKey", "opportunityClass", "funnelClass", "officialUrl", "normalizedOfficialUrl",
    "location", "workMode", "discoveredOn", "verifiedOn", "timezone", "initialStatus",
    "deadlineTimezone", "compensationEvidence", "roleScope", "qualificationReason",
    "immigrationState", "immigrationEvidence", "authorizationClaim", "nextAction", "dueDate",
  ],
  opportunity_observation: [
    "opportunityId", "observedOn", "timezone", "status", "sourceType", "sourceReference",
    "materialChange", "opportunityClass", "funnelClass", "immigrationState", "immigrationEvidence",
    "authorizationClaim", "deadlineTimezone", "compensationEvidence", "location", "workMode",
    "roleScope", "qualificationReason", "nextAction", "dueDate",
    "privateEvidenceConfirmed",
  ],
  recruiting_interaction: [
    "opportunityId", "interactionKind", "direction", "interactionState", "occurredOn", "timezone",
    "counterpartyRole", "evidenceSummary", "outcome", "nextAction", "dueDate",
    "approvalConfirmed", "privateEvidenceConfirmed",
  ],
  application_attempt: [
    "opportunityId", "attemptedOn", "timezone", "attemptState", "artifactChecklist", "claimLedger",
    "authorizationStatement", "immigrationState", "authorizationClaim", "approvalConfirmed", "nextAction", "dueDate",
  ],
  interview_practice: [
    "opportunityId", "practicedOn", "timezone", "practiceType", "prompt", "independentAnswerSummary",
    "evidenceUsed", "unsupportedClaim", "durationMinutes", "nextRevision",
  ],
  portfolio_candidate: [
    "opportunityId", "sourceRecordId", "capturedOn", "timezone", "artifactType", "title",
    "evidenceOfOwnership", "confidentialityReview", "redactionsNeeded", "publicationState",
    "approvalConfirmed", "nextAction",
  ],
};

function text(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === "string" ? payload[key].trim() : "";
}

function hasValue(value: unknown): boolean {
  if (typeof value === "string") return Boolean(value.trim());
  return value !== null && value !== undefined;
}

function safeHttpUrl(value: unknown): boolean {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeRecruitingUrl(value: unknown): string {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.hash = "";
    url.searchParams.sort();
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function boundedText(payload: Record<string, unknown>, keys: readonly string[], max = 5000): boolean {
  return keys.every((key) => (
    typeof payload[key] === "string"
    && String(payload[key]).trim().length > 0
    && String(payload[key]).trim().length <= max
  ));
}

function validRecordedDate(value: unknown, today: string): value is string {
  return isCanonicalDate(value) && value <= today;
}

export function validateRecruitingPayload(
  recordType: string,
  payload: Record<string, unknown>,
  today: string,
): string | null {
  if (!(RECRUITING_RECORD_TYPES as readonly string[]).includes(recordType)) return "Unsupported Recruiting record type.";
  const type = recordType as RecruitingRecordType;
  const required = requiredKeys[type];
  const allowed = new Set([...required, "recordKey", "publishedDeadline", "officialSourceUrl", "confirmationReference"]);
  if (Object.keys(payload).some((key) => !allowed.has(key))) {
    return "Recruiting records reject undeclared fields, raw correspondence, contact details, prestige scores, and private attachments.";
  }
  const missing = required.filter((key) => !hasValue(payload[key]));
  if (missing.length) return `Complete the required Recruiting evidence: ${missing.join(", ")}.`;
  if (JSON.stringify(payload).length > 50_000) return "This Recruiting record is too large.";
  if (!isValidTimeZone(payload.timezone)) return "Recruiting evidence needs a valid preserved timezone.";

  if (type === "recruiting_opportunity") {
    if (!boundedText(payload, ["firm", "roleTitle", "cycleKey", "location", "workMode", "compensationEvidence", "roleScope", "qualificationReason", "immigrationEvidence", "nextAction"])) {
      return "A Recruiting Opportunity needs bounded identity, classification, evidence, and next-action fields.";
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text(payload, "cycleKey")) || text(payload, "cycleKey").length > 120) {
      return "A Recruiting Opportunity needs a stable lowercase role-or-cycle identity.";
    }
    if (!(OPPORTUNITY_CLASSES as readonly string[]).includes(text(payload, "opportunityClass"))) return "Choose a valid Recruiting Opportunity class.";
    if (!(RECRUITING_FUNNEL_CLASSES as readonly string[]).includes(text(payload, "funnelClass"))) return "Choose a truthful Recruiting funnel class.";
    if (text(payload, "funnelClass") !== expectedRecruitingFunnelClass(text(payload, "opportunityClass"))) {
      return "A Recruiting Opportunity's funnel class must match its actual opportunity class.";
    }
    if (!(OPPORTUNITY_STATUSES as readonly string[]).includes(text(payload, "initialStatus"))) return "Choose a valid observed opportunity status.";
    if (!safeHttpUrl(payload.officialUrl) || normalizeRecruitingUrl(payload.officialUrl) !== text(payload, "normalizedOfficialUrl")) {
      return "A Recruiting Opportunity needs one normalized first-party URL.";
    }
    if (!validRecordedDate(payload.discoveredOn, today) || !validRecordedDate(payload.verifiedOn, today)) return "Opportunity discovery and verification dates cannot be future or malformed.";
    if (payload.verifiedOn < payload.discoveredOn) return "Opportunity verification cannot predate discovery.";
    if (hasValue(payload.publishedDeadline) && !isCanonicalDate(payload.publishedDeadline)) return "A published deadline must be a real YYYY-MM-DD date.";
    if (!isCanonicalDate(payload.dueDate) || payload.dueDate < payload.discoveredOn) return "The Recruiting next action needs a valid due date on or after discovery.";
  }

  if (type === "opportunity_observation") {
    if (!validRecordedDate(payload.observedOn, today) || !isCanonicalDate(payload.dueDate) || payload.dueDate < payload.observedOn) return "An Opportunity Observation needs valid observation and next-action dates.";
    if (!(OPPORTUNITY_STATUSES as readonly string[]).includes(text(payload, "status"))) return "Choose a valid observed opportunity status.";
    if (!(OPPORTUNITY_SOURCE_TYPES as readonly string[]).includes(text(payload, "sourceType"))) return "Choose a valid Opportunity Observation source type.";
    if (!(OPPORTUNITY_CLASSES as readonly string[]).includes(text(payload, "opportunityClass"))) return "Choose the evidence-backed current Recruiting Opportunity class.";
    if (!(RECRUITING_FUNNEL_CLASSES as readonly string[]).includes(text(payload, "funnelClass"))) return "Choose the current truthful Recruiting funnel class.";
    if (text(payload, "funnelClass") !== "Archived" && text(payload, "funnelClass") !== expectedRecruitingFunnelClass(text(payload, "opportunityClass"))) {
      return "An Opportunity Observation's funnel class must match its evidence-backed opportunity class or be Archived.";
    }
    if (!boundedText(payload, ["sourceReference", "materialChange", "immigrationEvidence", "location", "workMode", "roleScope", "qualificationReason", "nextAction"])) return "An Opportunity Observation needs bounded source, change, qualification, and next-action evidence.";
    if (!boundedText(payload, ["deadlineTimezone", "compensationEvidence"])) return "An Opportunity Observation needs bounded deadline-timezone and compensation evidence.";
    if (hasValue(payload.publishedDeadline) && !isCanonicalDate(payload.publishedDeadline)) return "An observed opportunity deadline must be a real YYYY-MM-DD date.";
    if (payload.sourceType === "First-party page" && !safeHttpUrl(payload.sourceReference)) return "A first-party Opportunity Observation needs its official source URL.";
    if (payload.sourceType === "Private recruiting evidence" && payload.privateEvidenceConfirmed !== true) return "Private recruiting evidence requires confirmation that raw correspondence and contact details were omitted.";
  }

  if (type === "recruiting_interaction") {
    if (!validRecordedDate(payload.occurredOn, today) || !isCanonicalDate(payload.dueDate) || payload.dueDate < payload.occurredOn) return "A Recruiting Interaction needs valid interaction and next-action dates.";
    if (!(INTERACTION_KINDS as readonly string[]).includes(text(payload, "interactionKind"))) return "Choose a valid Recruiting Interaction kind.";
    if (!(INTERACTION_DIRECTIONS as readonly string[]).includes(text(payload, "direction"))) return "Choose a valid Recruiting Interaction direction.";
    if (!(INTERACTION_STATES as readonly string[]).includes(text(payload, "interactionState"))) return "Choose a valid Recruiting Interaction state.";
    if (!boundedText(payload, ["counterpartyRole", "evidenceSummary", "outcome", "nextAction"])) return "A Recruiting Interaction needs bounded behavioral evidence and a next action.";
    if (payload.privateEvidenceConfirmed !== true) return "Recruiting Interactions require confirmation that raw messages, contact details, and confidential material were omitted.";
    const interactionState = text(payload, "interactionState");
    const direction = text(payload, "direction");
    if ((new Set(["Approved", "Sent"]).has(interactionState) || (interactionState === "Completed" && direction !== "Inbound")) && payload.approvalConfirmed !== true) {
      return "Approved, sent, or learner-participated Recruiting Interactions require explicit learner approval.";
    }
  }

  if (type === "application_attempt") {
    if (!validRecordedDate(payload.attemptedOn, today) || !isCanonicalDate(payload.dueDate) || payload.dueDate < payload.attemptedOn) return "An Application Attempt needs valid attempt and next-action dates.";
    if (!(APPLICATION_ATTEMPT_STATES as readonly string[]).includes(text(payload, "attemptState"))) return "Choose a valid Application Attempt state.";
    if (!boundedText(payload, ["artifactChecklist", "claimLedger", "authorizationStatement", "nextAction"])) return "An Application Attempt needs bounded artifact, claim, authorization, and next-action evidence.";
    const confirmationReference = text(payload, "confirmationReference");
    if (payload.attemptState === "Submitted" && (
      payload.approvalConfirmed !== true
      || confirmationReference.length < 6
      || /not submitted|no confirmation/i.test(confirmationReference)
    )) {
      return "A submitted Application Attempt requires explicit learner approval and preserved confirmation evidence.";
    }
    if (payload.attemptState === "Verified closed" && !safeHttpUrl(payload.officialSourceUrl)) return "A verified-closed Application Attempt requires a first-party closure source.";
  }

  if (type === "interview_practice") {
    if (!validRecordedDate(payload.practicedOn, today)) return "Interview Practice needs a valid non-future practice date.";
    if (!(INTERVIEW_PRACTICE_TYPES as readonly string[]).includes(text(payload, "practiceType"))) return "Choose a valid Interview Practice type.";
    if (!boundedText(payload, ["prompt", "independentAnswerSummary", "evidenceUsed", "unsupportedClaim", "nextRevision"])) return "Interview Practice needs the original answer, supporting evidence, unsupported claim or gap, and next revision.";
    const minutes = Number(payload.durationMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) return "Interview Practice duration must be between 1 and 120 minutes.";
  }

  if (type === "portfolio_candidate") {
    if (!validRecordedDate(payload.capturedOn, today)) return "A Portfolio Candidate needs a valid non-future capture date.";
    if (!(PORTFOLIO_ARTIFACT_TYPES as readonly string[]).includes(text(payload, "artifactType"))) return "Choose a valid Portfolio Candidate artifact type.";
    if (!(PORTFOLIO_PUBLICATION_STATES as readonly string[]).includes(text(payload, "publicationState"))) return "Choose a private Portfolio Candidate state.";
    if (!boundedText(payload, ["title", "evidenceOfOwnership", "confidentialityReview", "redactionsNeeded", "nextAction"])) return "A Portfolio Candidate needs bounded ownership, confidentiality, redaction, and next-action evidence.";
    if (payload.publicationState === "Approved for recruiting use" && (payload.approvalConfirmed !== true || text(payload, "confidentialityReview") !== "Cleared")) {
      return "Recruiting-use approval requires explicit learner approval and a cleared confidentiality review; this does not publish the artifact.";
    }
  }

  const immigrationState = text(payload, "immigrationState");
  if (type === "recruiting_opportunity" || type === "opportunity_observation" || type === "application_attempt") {
    if (!(IMMIGRATION_EVIDENCE_STATES as readonly string[]).includes(immigrationState)) return "Choose a valid Immigration Evidence State.";
    if (payload.authorizationClaim === true && immigrationState !== "Authorized") return "Only the Authorized state may claim role authorization.";
    if (immigrationState === "Authorized" && payload.authorizationClaim !== true) return "An Authorized state must explicitly preserve the authorization claim and its evidence.";
    if (type === "application_attempt") {
      const statement = text(payload, "authorizationStatement");
      const requiredMarker = payload.authorizationClaim === true
        ? "Role authorization documented."
        : "No role authorization claimed.";
      if (statement !== requiredMarker) {
        return `The Application Attempt authorization statement must equal “${requiredMarker}”`;
      }
    }
  }

  return null;
}

export function recruitingRecordKey(recordType: string, payload: Record<string, unknown>): string {
  if (recordType === "recruiting_opportunity") {
    const cycleKey = text(payload, "cycleKey") || legacyRecruitingCycleKey(payload);
    return `${text(payload, "normalizedOfficialUrl")}|${cycleKey}`;
  }
  if ((RECRUITING_CHILD_RECORD_TYPES as readonly string[]).includes(recordType)) {
    return `${recordType}|${recruitingPayloadFingerprint(payload)}`;
  }
  return "";
}

function canonicalRecruitingValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalRecruitingValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "recordKey")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalRecruitingValue(item)]));
  }
  return typeof value === "string" ? value.trim() : value;
}

export function recruitingPayloadFingerprint(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(canonicalRecruitingValue(payload));
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < canonical.length; index += 1) {
    const code = canonical.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
  }
  return `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
}

export function expectedRecruitingFunnelClass(opportunityClass: string): string {
  const mapping: Record<string, string> = {
    "Qualifying Internship": "Qualified role",
    "Investing Milestone": "Milestone",
    "Relationship-led target": "Relationship target",
    Fallback: "Fallback",
  };
  return mapping[opportunityClass] ?? "";
}

export function portfolioArtifactTypeForRecord(recordType: string): string {
  const mapping: Record<string, string> = {
    snapshot_judgment: "Snapshot",
    weekly_underwrite: "Underwrite",
    forecast: "Forecast",
    second_order_map: "Second-Order Map",
    founder_evidence_review: "Founder Evidence",
    sourcing_lead: "Sourcing evidence",
  };
  return mapping[recordType] ?? "";
}

export type RecruitingMetrics = {
  qualifiedRoles: number;
  referrals: number;
  applications: number;
  interviews: number;
  offers: number;
  milestones: number;
  rows: Array<{
    id: string;
    firm: string;
    roleTitle: string;
    opportunityClass: string;
    funnelClass: string;
    currentStatus: string;
    publishedDeadline: string;
    deadlineTimezone: string;
    compensationEvidence: string;
    location: string;
    workMode: string;
    roleScope: string;
    qualificationReason: string;
    immigrationState: string;
    immigrationEvidence: string;
    nextAction: string;
    dueDate: string;
  }>;
};

export function computeRecruitingMetrics(records: RecruitingRecordLike[]): RecruitingMetrics {
  const opportunities = records.filter((record) => record.recordType === "recruiting_opportunity");
  const observations = records.filter((record) => record.recordType === "opportunity_observation");
  const interactions = records.filter((record) => record.recordType === "recruiting_interaction");
  const applications = records.filter((record) => record.recordType === "application_attempt");

  const rows = opportunities.map((opportunity) => {
    const latest = observations
      .filter((observation) => observation.parentId === opportunity.id)
      .sort((left, right) => (
        text(right.payload, "observedOn").localeCompare(text(left.payload, "observedOn"))
        || right.committedAt.localeCompare(left.committedAt)
      ))[0];
    return {
      id: opportunity.id,
      firm: text(opportunity.payload, "firm"),
      roleTitle: text(opportunity.payload, "roleTitle"),
      opportunityClass: (latest && text(latest.payload, "opportunityClass")) || text(opportunity.payload, "opportunityClass"),
      funnelClass: (latest && text(latest.payload, "funnelClass")) || text(opportunity.payload, "funnelClass"),
      currentStatus: latest ? text(latest.payload, "status") : text(opportunity.payload, "initialStatus"),
      publishedDeadline: latest ? text(latest.payload, "publishedDeadline") : text(opportunity.payload, "publishedDeadline"),
      deadlineTimezone: (latest && text(latest.payload, "deadlineTimezone")) || text(opportunity.payload, "deadlineTimezone"),
      compensationEvidence: (latest && text(latest.payload, "compensationEvidence")) || text(opportunity.payload, "compensationEvidence"),
      location: (latest && text(latest.payload, "location")) || text(opportunity.payload, "location"),
      workMode: (latest && text(latest.payload, "workMode")) || text(opportunity.payload, "workMode"),
      roleScope: (latest && text(latest.payload, "roleScope")) || text(opportunity.payload, "roleScope"),
      qualificationReason: (latest && text(latest.payload, "qualificationReason")) || text(opportunity.payload, "qualificationReason"),
      immigrationState: (latest && text(latest.payload, "immigrationState")) || text(opportunity.payload, "immigrationState"),
      immigrationEvidence: (latest && text(latest.payload, "immigrationEvidence")) || text(opportunity.payload, "immigrationEvidence"),
      nextAction: (latest && text(latest.payload, "nextAction")) || text(opportunity.payload, "nextAction"),
      dueDate: (latest && text(latest.payload, "dueDate")) || text(opportunity.payload, "dueDate"),
    };
  });
  const qualifiedIds = new Set(rows.filter((row) => (
    row.opportunityClass === "Qualifying Internship"
    && new Set(["Qualified role", "Archived"]).has(row.funnelClass)
  )).map((row) => row.id));
  const countUniqueQualifiedParents = (items: RecruitingRecordLike[], predicate: (item: RecruitingRecordLike) => boolean) => (
    new Set(items.filter((item) => item.parentId && qualifiedIds.has(item.parentId) && predicate(item)).map((item) => item.parentId)).size
  );

  return {
    qualifiedRoles: qualifiedIds.size,
    referrals: countUniqueQualifiedParents(interactions, (item) => (
      text(item.payload, "interactionKind") === "Referral"
      && new Set(["Received", "Completed"]).has(text(item.payload, "interactionState"))
    )),
    applications: countUniqueQualifiedParents(applications, (item) => text(item.payload, "attemptState") === "Submitted"),
    interviews: countUniqueQualifiedParents(interactions, (item) => (
      text(item.payload, "interactionKind") === "Interview"
      && text(item.payload, "interactionState") === "Completed"
    )),
    offers: countUniqueQualifiedParents(observations, (item) => text(item.payload, "status") === "Offer"),
    milestones: rows.filter((row) => row.opportunityClass === "Investing Milestone" && row.funnelClass !== "Archived").length,
    rows,
  };
}
