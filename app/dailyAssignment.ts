import { isCanonicalDate, isValidTimeZone } from "./calibration.ts";
import {
  COURSE_FIRST_CONTRACT_VERSION,
  validateCourseFirstCurriculum,
  type CourseFirstCurriculumInput,
} from "./courseCurriculum.ts";
import { DAILY_OPERATOR_COMPLETION_GRACE_MS, scheduledAtWeekdaySevenEastern } from "./dailyOperator.ts";
import { canonicalJson, sha256Hex } from "./canonicalJson.ts";
export { canonicalJson, sha256Hex } from "./canonicalJson.ts";

export const DAILY_ASSIGNMENT_STATES = ["ready", "brief_unavailable", "intentionally_displaced"] as const;
export const DAILY_BRIEF_LANES = ["Current signal", "Durable investing insight", "Cross-domain input", "Career or freeflow"] as const;
export type DailyAssignmentState = typeof DAILY_ASSIGNMENT_STATES[number];
type JsonObject = Record<string, unknown>;
export type DailyRunInput = {
  contractVersion?: typeof COURSE_FIRST_CONTRACT_VERSION;
  curriculum?: CourseFirstCurriculumInput;
  scheduledFor: string;
  profileVersion: string;
  notificationIntent: "brief_ready" | "intervention_required" | "none";
  coachRequestIds: string[];
  coachFeedbackIds: string[];
  sourceStatusEventIds: string[];
  assignment: JsonObject & { state: DailyAssignmentState; learnerDate: string; timezone: string };
};

function isObject(value: unknown): value is JsonObject { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown, max = 10_000): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function hasText(value: unknown): boolean { return typeof value === "string" && value.trim().length > 0; }
function onlyKeys(value: JsonObject, allowed: readonly string[]): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
}
function privacySafeHttpsUrl(value: unknown): boolean {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const sensitive = /^(access_?token|api_?key|auth|authorization|credential|password|secret|signature|sig|token)$/i;
    return [...url.searchParams.keys()].every((key) => !sensitive.test(key));
  } catch { return false; }
}
function isoInstant(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
function sourceDate(value: unknown): boolean { return value === "not stated" || isCanonicalDate(value); }
function daysBetween(earlier: string, later: string): number {
  return Math.floor((Date.parse(`${later}T00:00:00.000Z`) - Date.parse(`${earlier}T00:00:00.000Z`)) / 86_400_000);
}
export async function dailyRunChecksum(input: DailyRunInput): Promise<string> { return sha256Hex(canonicalJson(input)); }

const requiredMetadata = [
  "readingId", "lane", "title", "subtitle", "authorOrOrganization", "publisher", "sourceType", "sourceRole",
  "claimRole", "issuerInterest", "canonicalUrl", "persistentIdentifier", "publishedDate", "sourceUpdatedDate",
  "accessedAt", "linkVerifiedAt", "assignedSection", "rightsOrLicense", "accessMode", "materialReviewed",
  "archiveUrl", "archivedAt", "versionStatus", "sectorContext", "viewpoint", "viewpointRole",
  "underlyingEventOrClaimFingerprint", "corroborationSourceRole", "corroborationUrl",
  "teachingPurpose", "carryQuestion", "downstreamTarget",
  "selectionRationale", "corroborationNotes", "deduplicationStatus",
] as const;
const reviewFields = ["sourceReview", "contextReview", "claimReview", "evidenceReview", "corroborationReview"] as const;
const forbiddenInitialFields = new Set(["learnerResponse", "coachInterpretation", "coachSummary", "completion"]);
const readingFields = [
  ...requiredMetadata, ...reviewFields, "linkResolves", "estimatedMinutes", "freshnessException", "relatedReadingId",
  "copyrightExcerpt", "independentFirstPassWithheld", "sourceStatus", "labSummary",
] as const;
const sourceRoles = ["Evidence owner", "Independent verification", "Interpretation", "Discovery lead"];
const sourceTypes = [
  "Official documentation", "Filing", "Dataset", "Law or regulation", "Source code", "Research output",
  "Earnings material", "Company announcement", "Direct principal statement", "Reputable reporting",
  "Institutional research", "Analytical essay", "Investor memo", "Market history", "Research paper",
  "Specialist reasoning", "Social post", "Newsletter", "Podcast", "Video", "Book", "Other bounded source",
];
const downstreamTargets = [
  "Snapshot Judgment", "Forecast", "Second-Order Map", "Weekly Underwrite", "Sector Discovery evidence",
  "Recruiting work", "Reflection",
];

function validateReading(reading: JsonObject, learnerDate: string): string | null {
  if ([...forbiddenInitialFields].some((field) => field in reading)) return "A learner response or coach interpretation must append only after immutable delivery.";
  if (!onlyKeys(reading, readingFields)) return "A Daily Brief reading contains an undeclared field.";
  if (requiredMetadata.some((field) => !hasText(reading[field]))) return "Every reading needs complete or explicitly unknown bibliographic, access, rights, version, purpose, and diversity metadata.";
  if (reviewFields.some((field) => !hasText(reading[field]))) return "Every reading must complete source, context, claim, evidence, and corroboration review.";
  if (!privacySafeHttpsUrl(reading.canonicalUrl)) return "Every canonical source must use a privacy-safe HTTPS URL without embedded credentials or token-like query parameters.";
  if (reading.archiveUrl !== "not stated" && !privacySafeHttpsUrl(reading.archiveUrl)) return "Every archive source must be not stated or a privacy-safe HTTPS URL without credentials.";
  if (reading.linkResolves !== true || !isoInstant(reading.linkVerifiedAt)) return "Every reading link must resolve to the intended version and have a dated access check.";
  if (!isoInstant(reading.accessedAt)) return "Every reading needs a valid access timestamp.";
  if (!sourceDate(reading.publishedDate) || !sourceDate(reading.sourceUpdatedDate)) return "Source publication and update dates must be canonical dates or explicitly not stated.";
  if (!["primary", "secondary", "mixed"].includes(text(reading.claimRole).toLowerCase())) return "Every reading needs a valid claim role.";
  if (!sourceRoles.includes(text(reading.sourceRole))) return "Every reading needs a valid evidence-relative source role.";
  if (!sourceTypes.includes(text(reading.sourceType))) return "Every reading needs a bounded source type.";
  if (!downstreamTargets.includes(text(reading.downstreamTarget))) return "Every reading needs a valid downstream target.";
  if (!["supporting", "contrary", "orthogonal"].includes(text(reading.viewpointRole))) return "Every reading needs a bounded viewpoint role.";
  if (reading.lane === "Current signal" && !["Evidence owner", "Independent verification"].includes(text(reading.sourceRole))) {
    if (!["Evidence owner", "Independent verification"].includes(text(reading.corroborationSourceRole))
      || !privacySafeHttpsUrl(reading.corroborationUrl)) {
      return "A material Current signal needs evidence-owner material or privacy-safe independent corroboration.";
    }
  }
  if (!["open_web", "subscription", "institutional_access", "public_domain"].includes(text(reading.accessMode))) return "Every reading needs a lawful access mode.";
  if (!["full_text", "excerpt", "abstract", "metadata_only"].includes(text(reading.materialReviewed))) return "Every reading must state the material actually reviewed.";
  const minutes = Number(reading.estimatedMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 55) return "Every reading needs a bounded positive time estimate.";
  const excerpt = text(reading.copyrightExcerpt);
  if (excerpt && excerpt.split(/\s+/).filter(Boolean).length > 25) return "A preserved copyright excerpt may contain at most 25 words.";
  if (reading.independentFirstPassWithheld !== true) return "Coach interpretation must be withheld until the learner's Independent First Pass.";
  if (reading.lane === "Current signal") {
    const newestDate = isCanonicalDate(reading.sourceUpdatedDate) ? String(reading.sourceUpdatedDate) : String(reading.publishedDate);
    if (!isCanonicalDate(newestDate)) return "A Current signal needs a stated publication or material update date.";
    const age = daysBetween(newestDate, learnerDate);
    if (age < 0) return "A Current signal cannot use a future source date.";
    if (age > 30) return "A Current signal may never be more than 30 days old.";
    if (age > 7 && !hasText(reading.freshnessException)) return "A Current signal older than 7 days needs a freshness exception.";
  }
  const deduplicationStatus = text(reading.deduplicationStatus);
  if (!["new", "continuation", "revisit"].includes(deduplicationStatus)) return "Every reading needs an explicit deduplication status.";
  if ((deduplicationStatus === "continuation" || deduplicationStatus === "revisit") && !hasText(reading.relatedReadingId)) return "A continuation or revisit must link the original Reading Record.";
  return null;
}

export function validateDailyRun(value: unknown, now?: Date): string | null {
  if (!isObject(value) || JSON.stringify(value).length > 200_000) return "The daily run must be a bounded structured request.";
  if (!onlyKeys(value, ["contractVersion", "curriculum", "scheduledFor", "profileVersion", "notificationIntent", "coachRequestIds", "coachFeedbackIds", "sourceStatusEventIds", "assignment"])) return "The daily run contains an undeclared field; the owner is derived only from the registered automation credential.";
  if (!scheduledAtWeekdaySevenEastern(text(value.scheduledFor))) return "The daily run must use a weekday 7:00 AM America/New_York slot.";
  const scheduledTime = new Date(text(value.scheduledFor)).getTime();
  if (now && scheduledTime > now.getTime()) return "The daily run cannot be committed before its scheduled slot.";
  if (now && now.getTime() - scheduledTime > DAILY_OPERATOR_COMPLETION_GRACE_MS) return "A new daily run cannot be committed after its six-hour completion grace; no catch-up assignment is created.";
  if (!hasText(value.profileVersion) || !isObject(value.assignment)) return "The daily run needs one profile version and assignment outcome.";
  if (!Array.isArray(value.coachRequestIds) || value.coachRequestIds.length > 20
    || !Array.isArray(value.coachFeedbackIds) || value.coachFeedbackIds.length > 20
    || value.coachRequestIds.length !== value.coachFeedbackIds.length
    || !Array.isArray(value.sourceStatusEventIds) || value.sourceStatusEventIds.length > 20) {
    return "The daily run references must be bounded arrays, and every processed Coach Request must name its appended Coach Feedback.";
  }
  const assignment = value.assignment;
  const state = text(assignment.state) as DailyAssignmentState;
  if (!(DAILY_ASSIGNMENT_STATES as readonly string[]).includes(state)) return "Choose a valid Daily Assignment state.";
  const hasCourseVersion = "contractVersion" in value;
  const hasCurriculum = "curriculum" in value;
  if (hasCourseVersion !== hasCurriculum) return "A course-first run must include both its contract version and curriculum evidence.";
  if (hasCourseVersion) {
    if (value.contractVersion !== COURSE_FIRST_CONTRACT_VERSION) return "Choose the supported course-first Daily Operator version.";
    if (state !== "ready") return "Course-first curriculum is committed only with a ready route; preserve unavailable outcomes without invented course work.";
    const invalidCurriculum = validateCourseFirstCurriculum(value.curriculum, text(assignment.learnerDate));
    if (invalidCurriculum) return invalidCurriculum;
  }
  if (state !== "ready" && "brief" in assignment) return "An unavailable or displaced assignment cannot contain invented Brief readings.";
  const assignmentKeys = state === "ready"
    ? ["state", "learnerDate", "timezone", "brief"]
    : ["state", "learnerDate", "timezone", "reason", "nextAction"];
  if (!onlyKeys(assignment, assignmentKeys)) return "The Daily Assignment contains an undeclared field.";
  if (!isCanonicalDate(assignment.learnerDate) || !isValidTimeZone(assignment.timezone)) return "The assignment needs a canonical learner date and IANA timezone.";
  if (state !== "ready") {
    if (!hasText(assignment.reason) || !hasText(assignment.nextAction)) return "An unavailable or displaced assignment needs a bounded reason and next action.";
    if (state === "brief_unavailable" && value.notificationIntent !== "intervention_required") return "A Brief Unavailable outcome must request intervention.";
    if (state === "intentionally_displaced" && value.notificationIntent !== "none") return "An intentional displacement must not send a ready alert.";
    return null;
  }
  if (value.notificationIntent !== "brief_ready") return "A ready Brief must declare the post-reconciliation ready notification intent.";
  if (!isObject(assignment.brief)) return "A ready assignment needs one complete Daily Brief.";
  const brief = assignment.brief;
  if (!onlyKeys(brief, ["briefVersion", "carryForward", "readings"])) return "The Daily Brief contains an undeclared field.";
  if (!hasText(brief.briefVersion) || !hasText(brief.carryForward) || !Array.isArray(brief.readings) || brief.readings.length !== 4) return "A ready Daily Brief needs a version, carry-forward judgment, and exactly four readings.";
  if (!brief.readings.every(isObject)) return "Every Daily Brief reading must be structured evidence.";
  const readings = brief.readings as JsonObject[];
  const actualLanes = readings.map((reading) => text(reading.lane));
  if (new Set(actualLanes).size !== 4 || DAILY_BRIEF_LANES.some((lane) => !actualLanes.includes(lane))) return "The Daily Brief must contain all four distinct lanes.";
  for (const reading of readings) { const invalid = validateReading(reading, String(assignment.learnerDate)); if (invalid) return invalid; }
  const totalMinutes = readings.reduce((sum, reading) => sum + Number(reading.estimatedMinutes), 0);
  if (totalMinutes > 55) return "The Daily Brief must fit within 55 minutes.";
  const normalizedUrls = readings.map((reading) => new URL(String(reading.canonicalUrl)).href.toLowerCase());
  const readingIds = readings.map((reading) => text(reading.readingId));
  if (new Set(normalizedUrls).size !== 4 || new Set(readingIds).size !== 4) return "The Daily Brief cannot contain an accidental duplicate.";
  const publishers = readings.map((reading) => text(reading.publisher).toLowerCase());
  if (new Set(publishers).size !== 4) return "The Daily Brief must pass publisher diversity.";
  const authors = readings.map((reading) => text(reading.authorOrOrganization).toLowerCase());
  if (new Set(authors).size !== 4) return "The Daily Brief must pass author diversity.";
  const sectors = readings.map((reading) => text(reading.sectorContext).toLowerCase());
  if (Math.max(...[...new Set(sectors)].map((sector) => sectors.filter((value) => value === sector).length)) > 2) return "The Daily Brief must pass sector diversity.";
  if (new Set(readings.map((reading) => text(reading.viewpoint).toLowerCase())).size < 3) return "The Daily Brief must pass viewpoint diversity.";
  const evidenceOwnerCount = readings.filter((reading) => (
    text(reading.sourceRole) === "Evidence owner"
    || (text(reading.corroborationSourceRole) === "Evidence owner" && privacySafeHttpsUrl(reading.corroborationUrl))
  )).length;
  if (evidenceOwnerCount < 2) return "At least two readings must be evidence-owner anchored.";
  return null;
}
