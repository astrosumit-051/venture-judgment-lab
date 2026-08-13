import { currentLabOwnerId } from "@/app/labOwner";
import { WORKFLOW_CONTRACTS, type ConversationDraft } from "@/app/conversation";
import {
  insertConversationTurn,
  latestDraft,
  loadConversation,
} from "@/app/conversationPersistence";
import { askConversationalTeacher } from "@/app/teacherProvider";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function relevantRecordChoices(db: D1Database, owner: string, recordTypes: string[]) {
  if (!recordTypes.length) return [];
  const rows = await db.prepare(
    `SELECT id, record_type, title, parent_id, committed_at FROM lab_records
     WHERE owner_id = ? AND record_type IN (${recordTypes.map(() => "?").join(",")})
     ORDER BY committed_at DESC LIMIT 80`,
  ).bind(owner, ...recordTypes).all<{ id: string; record_type: string; title: string; parent_id: string | null; committed_at: string }>();
  return (rows.results ?? []).map((row) => ({
    id: row.id, recordType: row.record_type, title: row.title, parentId: row.parent_id, committedAt: row.committed_at,
  }));
}

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Write one answer for the teacher." }, { status: 400 });
  }
  const { conversationId } = await context.params;
  const db = await ensureLabSchema();
  let conversation = await loadConversation(db, owner, conversationId);
  if (!conversation) return Response.json({ error: "The private Learning Conversation was not found." }, { status: 404 });
  if (conversation.phase === "committed" || conversation.phase === "abandoned") {
    return Response.json({ error: `This conversation is already ${conversation.phase}.` }, { status: 409 });
  }
  const retry = body.retry === true;
  const content = typeof body.content === "string" ? body.content.trim().slice(0, 10_000) : "";
  const draftOverride = object(body.draftOverride);
  if (!retry && !content) return Response.json({ error: "Write one answer for the teacher." }, { status: 400 });

  let nextSequence = (conversation.turns.at(-1)?.sequence ?? 0) + 1;
  if (!retry) {
    const now = new Date().toISOString();
    const current = latestDraft(conversation);
    const learnerDraft: ConversationDraft = draftOverride
      ? { commitBody: draftOverride, missingRequirements: current.missingRequirements, contradictions: current.contradictions }
      : current;
    try {
      await insertConversationTurn(db, {
        id: crypto.randomUUID(), conversationId, owner, sequence: nextSequence, role: "learner",
        visibleText: content, draft: learnerDraft,
        metadata: { kind: draftOverride ? "structured_edit" : "answer" }, now,
      }).run();
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        return Response.json({ error: "Another turn was preserved first. Reload the conversation before answering again." }, { status: 409 });
      }
      throw error;
    }
    conversation = (await loadConversation(db, owner, conversationId))!;
    nextSequence += 1;
  }

  const contract = WORKFLOW_CONTRACTS[conversation.workflow];
  const currentDraft = draftOverride
    ? { ...latestDraft(conversation), commitBody: draftOverride }
    : latestDraft(conversation);
  try {
    const result = await askConversationalTeacher({
      contract,
      transcript: conversation.turns,
      currentDraft,
      relevantRecords: await relevantRecordChoices(db, owner, contract.contextRecordTypes),
    });
    const now = new Date().toISOString();
    await insertConversationTurn(db, {
      id: crypto.randomUUID(), conversationId, owner, sequence: nextSequence, role: "teacher",
      visibleText: result.reply.message, draft: result.draft,
      metadata: {
        kind: "teacher_reply",
        phase: result.reply.phase,
        missingRequirements: result.reply.missingRequirements,
        contradictions: result.reply.contradictions,
      }, now,
    }).run();
    return Response.json({ conversation: await loadConversation(db, owner, conversationId) });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "The private AI teacher is temporarily unavailable. Your answer remains preserved.",
      preserved: !retry,
      conversation: await loadConversation(db, owner, conversationId),
    }, { status: 503 });
  }
}
