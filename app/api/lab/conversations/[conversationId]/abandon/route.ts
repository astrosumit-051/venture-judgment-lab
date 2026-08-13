import { currentLabOwnerId } from "@/app/labOwner";
import { insertConversationTurn, latestDraft, loadConversation } from "@/app/conversationPersistence";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ conversationId: string }> }) {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { conversationId } = await context.params;
  const db = await ensureLabSchema();
  const conversation = await loadConversation(db, owner, conversationId);
  if (!conversation) return Response.json({ error: "The private Learning Conversation was not found." }, { status: 404 });
  if (conversation.phase === "committed") return Response.json({ error: "A committed conversation cannot be abandoned." }, { status: 409 });
  if (conversation.phase === "abandoned") return Response.json({ conversation, idempotent: true });
  const now = new Date().toISOString();
  await insertConversationTurn(db, {
    id: crypto.randomUUID(), conversationId, owner,
    sequence: (conversation.turns.at(-1)?.sequence ?? 0) + 1,
    role: "system", visibleText: "Conversation closed without committing a Lab artifact.",
    draft: latestDraft(conversation), metadata: { kind: "abandoned", phase: "abandoned" }, now,
  }).run();
  return Response.json({ conversation: await loadConversation(db, owner, conversationId) });
}
