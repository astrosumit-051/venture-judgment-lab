import { currentLabOwnerId } from "@/app/labOwner";
import { dateInTimeZone } from "@/app/calibration";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  profile_version: string;
  timezone: string;
  practice_mode: string;
  effective_learner_date: string;
};

type AssignmentRow = {
  id: string;
  state: string;
  evidence_record_id: string;
  automation_run_id: string;
  created_at: string;
  record_type: string;
  parent_id: string | null;
  payload_json: string;
};

type RecordRow = { id: string; parent_id?: string | null; payload_json: string };

function parseJson(value: string): Record<string, unknown> {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

function cleanText(value: unknown, max = 10_000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function progressState(completed: number, required: number): "not_started" | "in_progress" | "complete" {
  if (completed >= required) return "complete";
  return completed > 0 ? "in_progress" : "not_started";
}

export async function GET() {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  const db = await ensureLabSchema();
  const profiles = await db.prepare(
    `SELECT id, profile_version, timezone, practice_mode, effective_learner_date
     FROM lab_profiles WHERE owner_id = ? ORDER BY effective_learner_date DESC LIMIT 20`,
  ).bind(owner).all<ProfileRow>();
  const profile = (profiles.results ?? []).find((candidate) => candidate.effective_learner_date <= dateInTimeZone(new Date(), candidate.timezone));
  if (!profile) return Response.json({ error: "No active Lab Profile exists for this private owner." }, { status: 404 });
  const learnerDate = dateInTimeZone(new Date(), profile.timezone);
  const assignment = await db.prepare(
    `SELECT assignment.id, assignment.state, assignment.evidence_record_id, assignment.automation_run_id,
            assignment.created_at, record.record_type, record.parent_id, record.payload_json
     FROM lab_assignments assignment
     JOIN lab_records record ON record.id = assignment.evidence_record_id AND record.owner_id = assignment.owner_id
     WHERE assignment.owner_id = ? AND assignment.learner_date = ? LIMIT 1`,
  ).bind(owner, learnerDate).first<AssignmentRow>();
  if (!assignment) {
    return Response.json({
      learnerDate,
      timezone: profile.timezone,
      profile: { version: profile.profile_version, practiceMode: profile.practice_mode },
      epoch: null,
      practiceDay: null,
      assignment: null,
      progress: null,
    });
  }

  const assignmentEvidencePayload = parseJson(assignment.payload_json);
  const isCourseFirst = assignment.record_type === "practice_day";
  const practiceDayId = isCourseFirst ? assignment.evidence_record_id : null;
  const dailyBriefId = isCourseFirst
    ? cleanText(assignmentEvidencePayload.dailyBriefId, 80)
    : assignment.state === "ready" ? assignment.evidence_record_id : null;
  const dailyBrief = dailyBriefId
    ? await db.prepare(
      `SELECT id, parent_id, payload_json FROM lab_records
       WHERE id = ? AND owner_id = ? AND record_type = 'daily_brief' LIMIT 1`,
    ).bind(dailyBriefId, owner).first<RecordRow>()
    : null;
  if (assignment.state === "ready" && !dailyBrief) {
    return Response.json({ error: "The immutable Daily Brief linked to this assignment was not found." }, { status: 409 });
  }
  const briefPayload = dailyBrief ? parseJson(dailyBrief.payload_json) : assignmentEvidencePayload;
  const epochId = isCourseFirst
    ? cleanText(assignmentEvidencePayload.curriculumEpochId, 80) || assignment.parent_id
    : null;
  const epochRecord = epochId
    ? await db.prepare(
      `SELECT id, payload_json FROM lab_records
       WHERE id = ? AND owner_id = ? AND record_type = 'curriculum_epoch' LIMIT 1`,
    ).bind(epochId, owner).first<RecordRow>()
    : null;
  if (isCourseFirst && !epochRecord) {
    return Response.json({ error: "The immutable Curriculum Epoch linked to this Practice Day was not found." }, { status: 409 });
  }

  const readings = assignment.state === "ready" && dailyBriefId
    ? await db.prepare(
      `SELECT id, payload_json FROM lab_records WHERE owner_id = ? AND parent_id = ?
       AND record_type = 'reading_record' ORDER BY committed_at ASC, id ASC`,
    ).bind(owner, dailyBriefId).all<RecordRow>()
    : { results: [] as RecordRow[] };
  const readingRows = readings.results ?? [];
  const recordIds = [
    assignment.evidence_record_id,
    ...(dailyBriefId && dailyBriefId !== assignment.evidence_record_id ? [dailyBriefId] : []),
    ...readingRows.map((row) => row.id),
  ];
  const events = await db.prepare(
    `SELECT id, record_id, event_type, event_json, occurred_at FROM lab_events
     WHERE owner_id = ? AND record_id IN (${recordIds.map(() => "?").join(",")})
     ORDER BY occurred_at ASC, id ASC`,
  ).bind(owner, ...recordIds).all<{
    id: string; record_id: string; event_type: string; event_json: string; occurred_at: string;
  }>();
  const publicEvents = (events.results ?? []).map((event) => ({
    id: event.id,
    recordId: event.record_id,
    eventType: event.event_type,
    eventData: parseJson(event.event_json),
    occurredAt: event.occurred_at,
  }));
  const completed = publicEvents.findLast((event) => ["completion", "assignment_completed"].includes(event.eventType));
  const missed = publicEvents.findLast((event) => event.eventType === "missed_practice");
  const responseAssignment: Record<string, unknown> = {
    id: assignment.id,
    state: assignment.state,
    reason: briefPayload.reason,
    nextAction: briefPayload.nextAction,
    completedAt: completed?.occurredAt,
    missedAt: missed?.occurredAt,
    events: publicEvents,
  };
  if (assignment.state === "ready" && dailyBrief) {
    responseAssignment.brief = {
      id: dailyBrief.id,
      version: briefPayload.briefVersion,
      carryForward: briefPayload.carryForward,
      totalMinutes: briefPayload.totalMinutes,
      readings: readingRows.map((row) => ({ recordId: row.id, ...parseJson(row.payload_json) })),
    };
  }

  let progress: Record<string, unknown> | null = null;
  if (practiceDayId) {
    const linked = await db.prepare(
      `SELECT record_type, COUNT(*) AS count FROM lab_records
       WHERE owner_id = ? AND json_extract(payload_json, '$.practiceDayId') = ?
       GROUP BY record_type`,
    ).bind(owner, practiceDayId).all<{ record_type: string; count: number }>();
    const counts = new Map((linked.results ?? []).map((row) => [row.record_type, Number(row.count)]));
    const completedReadings = new Set(publicEvents
      .filter((event) => event.eventType === "learner_response" && readingRows.some((reading) => reading.id === event.recordId))
      .map((event) => event.recordId)).size;
    const sourcingCount = counts.get("sourcing_lead") ?? 0;
    const snapshotCount = counts.get("snapshot_judgment") ?? 0;
    const scanUnits = Math.min(sourcingCount, 3) + (snapshotCount > 0 ? 1 : 0);
    const recruitingCount = [
      "recruiting_opportunity", "opportunity_observation", "recruiting_interaction",
      "application_attempt", "interview_practice", "portfolio_candidate",
    ].reduce((sum, type) => sum + (counts.get(type) ?? 0), 0);
    progress = {
      readings: { required: 4, completed: completedReadings, state: progressState(completedReadings, 4) },
      scanAndJudge: {
        requiredCompanies: 3,
        discoveredCompanies: sourcingCount,
        snapshotLocked: snapshotCount > 0,
        state: sourcingCount >= 3 && snapshotCount > 0 ? "complete" : progressState(scanUnits, 4),
      },
      forecast: { required: 1, completed: counts.get("forecast") ?? 0, state: progressState(counts.get("forecast") ?? 0, 1) },
      recruiting: { required: 1, completed: recruitingCount, state: progressState(recruitingCount, 1) },
      preserve: { required: 1, completed: completed ? 1 : 0, state: completed ? "complete" : "not_started" },
    };
  }

  return Response.json({
    learnerDate,
    timezone: profile.timezone,
    profile: { version: profile.profile_version, practiceMode: profile.practice_mode },
    epoch: epochRecord ? { id: epochRecord.id, ...parseJson(epochRecord.payload_json) } : null,
    practiceDay: practiceDayId ? { id: practiceDayId, ...assignmentEvidencePayload } : null,
    assignment: responseAssignment,
    progress,
  });
}
