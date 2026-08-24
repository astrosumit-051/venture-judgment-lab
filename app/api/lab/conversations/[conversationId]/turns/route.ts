import { currentLabOwnerId } from "@/app/labOwner";
import { type ConversationDraft } from "@/app/conversation";
import { generateTeacherTurn } from "@/app/conversationResponse";
import {
  insertConversationTurn,
  latestDraft,
  loadConversation,
} from "@/app/conversationPersistence";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
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

  const nextSequence = (conversation.turns.at(-1)?.sequence ?? 0) + 1;
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
  }
  try {
    return Response.json({ conversation: await generateTeacherTurn(db, owner, conversationId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The private AI teacher is temporarily unavailable.";
    return Response.json({
      error: /preserv/i.test(message) ? message : `${message} Your answer remains preserved.`,
      preserved: !retry,
      conversation: await loadConversation(db, owner, conversationId),
    }, { status: 503 });
  }
}
