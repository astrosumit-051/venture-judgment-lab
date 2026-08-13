import { currentLabOwnerId, isLocalLabRuntime } from "@/app/labOwner";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

type CountRow = { count: number };
type ConversationRow = { id: string; workflow: string; title: string; created_at: string };
type ProfileRow = { profile_version: string; timezone: string; practice_mode: string; effective_learner_date: string };

export async function GET() {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  const db = await ensureLabSchema();
  const [recordCount, eventCount, conversationCount, conversations, profile] = await Promise.all([
    db.prepare("SELECT count(*) AS count FROM lab_records WHERE owner_id = ?").bind(owner).first<CountRow>(),
    db.prepare("SELECT count(*) AS count FROM lab_events WHERE owner_id = ?").bind(owner).first<CountRow>(),
    db.prepare("SELECT count(*) AS count FROM lab_conversations WHERE owner_id = ?").bind(owner).first<CountRow>(),
    db.prepare(
      "SELECT id, workflow, title, created_at FROM lab_conversations WHERE owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 5",
    ).bind(owner).all<ConversationRow>(),
    db.prepare(
      `SELECT profile_version, timezone, practice_mode, effective_learner_date
       FROM lab_profiles WHERE owner_id = ? ORDER BY effective_learner_date DESC, created_at DESC LIMIT 1`,
    ).bind(owner).first<ProfileRow>(),
  ]);
  return Response.json({
    runtime: { mode: isLocalLabRuntime() ? "local" : "hosted" },
    counts: {
      records: Number(recordCount?.count ?? 0),
      events: Number(eventCount?.count ?? 0),
      conversations: Number(conversationCount?.count ?? 0),
    },
    profile: profile ? {
      version: profile.profile_version,
      timezone: profile.timezone,
      practiceMode: profile.practice_mode,
      effectiveLearnerDate: profile.effective_learner_date,
    } : null,
    recentConversations: (conversations.results ?? []).map((conversation) => ({
      id: conversation.id,
      workflow: conversation.workflow,
      title: conversation.title,
      createdAt: conversation.created_at,
    })),
  });
}
