import { getChatGPTUser } from "@/app/chatgpt-auth";
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

function parseJson(value: string): Record<string, unknown> {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

async function ownerId(): Promise<string | null> {
  const user = await getChatGPTUser();
  if (user) return user.userId;
  return process.env.NODE_ENV === "development" ? "local-learner" : null;
}

export async function GET() {
  const owner = await ownerId();
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
            assignment.created_at, record.payload_json
     FROM lab_assignments assignment
     JOIN lab_records record ON record.id = assignment.evidence_record_id AND record.owner_id = assignment.owner_id
     WHERE assignment.owner_id = ? AND assignment.learner_date = ? LIMIT 1`,
  ).bind(owner, learnerDate).first<{
    id: string; state: string; evidence_record_id: string; automation_run_id: string;
    created_at: string; payload_json: string;
  }>();
  if (!assignment) {
    return Response.json({
      learnerDate,
      timezone: profile.timezone,
      profile: { version: profile.profile_version, practiceMode: profile.practice_mode },
      assignment: null,
    });
  }
  const payload = parseJson(assignment.payload_json);
  const readings = assignment.state === "ready"
    ? await db.prepare(
      `SELECT id, payload_json FROM lab_records WHERE owner_id = ? AND parent_id = ?
       AND record_type = 'reading_record' ORDER BY committed_at ASC, id ASC`,
    ).bind(owner, assignment.evidence_record_id).all<{ id: string; payload_json: string }>()
    : { results: [] as Array<{ id: string; payload_json: string }> };
  const readingRows = readings.results ?? [];
  const recordIds = [assignment.evidence_record_id, ...readingRows.map((row) => row.id)];
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
    reason: payload.reason,
    nextAction: payload.nextAction,
    completedAt: completed?.occurredAt,
    missedAt: missed?.occurredAt,
    events: publicEvents,
  };
  if (assignment.state === "ready") {
    responseAssignment.brief = {
      id: assignment.evidence_record_id,
      version: payload.briefVersion,
      carryForward: payload.carryForward,
      totalMinutes: payload.totalMinutes,
      readings: readingRows.map((row) => ({ recordId: row.id, ...parseJson(row.payload_json) })),
    };
  }
  return Response.json({
    learnerDate,
    timezone: profile.timezone,
    profile: { version: profile.profile_version, practiceMode: profile.practice_mode },
    assignment: responseAssignment,
  });
}
