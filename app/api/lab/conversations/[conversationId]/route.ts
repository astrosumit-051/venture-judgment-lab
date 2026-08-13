import { currentLabOwnerId } from "@/app/labOwner";
import { loadConversation } from "@/app/conversationPersistence";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ conversationId: string }> }) {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { conversationId } = await context.params;
  const conversation = await loadConversation(await ensureLabSchema(), owner, conversationId);
  if (!conversation) return Response.json({ error: "The private Learning Conversation was not found." }, { status: 404 });
  return Response.json({ conversation });
}
