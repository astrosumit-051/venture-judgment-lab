import { currentLabOwnerId } from "@/app/labOwner";
import { routeConversationIntent } from "@/app/conversationRouting";
import { listConversations } from "@/app/conversationPersistence";
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
  if (source !== "today" && source !== "work" && source !== "more") {
    return Response.json({ error: "Choose a supported Lab starting point." }, { status: 400 });
  }
  const db = await ensureLabSchema();
  const [assignment, conversations] = await Promise.all([
    db.prepare("SELECT id FROM lab_assignments WHERE owner_id = ? AND state = 'ready' ORDER BY learner_date DESC LIMIT 1").bind(owner).first<{ id: string }>(),
    listConversations(db, owner),
  ]);
  const result = routeConversationIntent(message, {
    hasAssignment: Boolean(assignment),
    hasActiveConversation: conversations.some((item) => item.phase === "collecting" || item.phase === "review_ready"),
  });
  return Response.json(result);
}
