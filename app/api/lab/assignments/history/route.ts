import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

async function ownerId(): Promise<string | null> {
  const user = await getChatGPTUser();
  if (user) return user.userId;
  return process.env.NODE_ENV === "development" ? "local-learner" : null;
}

type AssignmentHealthRow = {
  id: string;
  learner_date: string;
  state: string;
  created_at: string;
  evidence_record_id: string;
  evidence_title: string;
  profile_version: string;
  timezone: string;
  practice_mode: string;
  run_id: string;
  scheduled_for: string;
  notification_intent: string;
  run_evidence_record_id: string;
  archive_preserved_at: string | null;
};

export async function GET() {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  const db = await ensureLabSchema();
  const rows = await db.prepare(
    `SELECT assignment.id, assignment.learner_date, assignment.state, assignment.created_at,
            assignment.evidence_record_id, evidence.title AS evidence_title,
            profile.profile_version, profile.timezone, profile.practice_mode,
            run.id AS run_id, run.scheduled_for, run.notification_intent,
            run.evidence_record_id AS run_evidence_record_id,
            (SELECT event.occurred_at FROM lab_events event
             WHERE event.owner_id = assignment.owner_id
               AND event.record_id = run.evidence_record_id
               AND event.event_type = 'archive_preserved'
             ORDER BY event.occurred_at DESC LIMIT 1) AS archive_preserved_at
     FROM lab_assignments assignment
     JOIN lab_profiles profile ON profile.id = assignment.profile_id AND profile.owner_id = assignment.owner_id
     JOIN lab_automation_runs run ON run.id = assignment.automation_run_id AND run.owner_id = assignment.owner_id
     JOIN lab_records evidence ON evidence.id = assignment.evidence_record_id AND evidence.owner_id = assignment.owner_id
     WHERE assignment.owner_id = ?
     ORDER BY assignment.learner_date DESC, assignment.created_at DESC
     LIMIT 100`,
  ).bind(owner).all<AssignmentHealthRow>();

  return Response.json({
    assignments: (rows.results ?? []).map((row) => ({
      id: row.id,
      learnerDate: row.learner_date,
      state: row.state,
      createdAt: row.created_at,
      evidence: { id: row.evidence_record_id, title: row.evidence_title },
      profile: {
        version: row.profile_version,
        timezone: row.timezone,
        practiceMode: row.practice_mode,
      },
      run: {
        id: row.run_id,
        scheduledFor: row.scheduled_for,
        notificationIntent: row.notification_intent,
        evidenceRecordId: row.run_evidence_record_id,
      },
      archive: {
        status: row.archive_preserved_at ? "preserved" : "pending",
        preservedAt: row.archive_preserved_at,
      },
    })),
  });
}
