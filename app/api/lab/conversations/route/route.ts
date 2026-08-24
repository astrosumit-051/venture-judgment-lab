import { currentLabOwnerId } from "@/app/labOwner";
import { isConversationWorkflow } from "@/app/conversation";
import { routeConversationIntent } from "@/app/conversationRouting";
import { dateInTimeZone } from "@/app/calibration";
import { classifyConversationIntent } from "@/app/teacherProvider";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Tell Luna what you are working through." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 10_000) : "";
  if (!message) return Response.json({ error: "Tell Luna what you are working through." }, { status: 400 });
  const source = body.source;
  if (source !== "today" && source !== "work" && source !== "record" && source !== "more") {
    return Response.json({ error: "Choose a supported Lab starting point." }, { status: 400 });
  }
  const db = await ensureLabSchema();
  const profile = await db.prepare(
    "SELECT timezone FROM lab_profiles WHERE owner_id = ? ORDER BY effective_learner_date DESC LIMIT 1",
  ).bind(owner).first<{ timezone: string }>();
  const learnerDate = dateInTimeZone(new Date(), profile?.timezone ?? "America/Chicago");
  const [assignment, unfinishedRows, recentRecords] = await Promise.all([
    db.prepare("SELECT id FROM lab_assignments WHERE owner_id = ? AND learner_date = ? AND state = 'ready' LIMIT 1").bind(owner, learnerDate).first<{ id: string }>(),
    db.prepare(`SELECT conversation.workflow
      FROM lab_conversations conversation
      JOIN lab_conversation_turns turn ON turn.id = (
        SELECT latest.id FROM lab_conversation_turns latest
        WHERE latest.conversation_id = conversation.id AND latest.owner_id = conversation.owner_id
        ORDER BY latest.sequence DESC LIMIT 1
      )
      WHERE conversation.owner_id = ?
        AND NOT (turn.role = 'system' AND json_extract(turn.metadata_json, '$.kind') IN ('committed', 'abandoned'))
      ORDER BY conversation.created_at DESC LIMIT 5`).bind(owner).all<{ workflow: string }>(),
    db.prepare("SELECT record_type, title FROM lab_records WHERE owner_id = ? ORDER BY committed_at DESC LIMIT 8").bind(owner).all<{ record_type: string; title: string }>(),
  ]);
  const unfinishedWorkflows = (unfinishedRows.results ?? []).map((item) => item.workflow).filter(isConversationWorkflow);
  const context = {
    learnerDate,
    hasAssignment: Boolean(assignment),
    hasActiveConversation: unfinishedWorkflows.length > 0,
    unfinishedWorkflows,
    recentRecords: (recentRecords.results ?? []).map((item) => ({ recordType: item.record_type, title: item.title })),
  };
  const deterministic = routeConversationIntent(message, context);
  const result = deterministic.kind === "clarify"
    ? await classifyConversationIntent({ message, context }) ?? deterministic
    : deterministic;
  return Response.json(result);
}
