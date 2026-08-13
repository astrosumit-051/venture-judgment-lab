import { currentLabOwnerId } from "@/app/labOwner";
import {
  emptyConversationDraft,
  isConversationWorkflow,
  WORKFLOW_CONTRACTS,
} from "@/app/conversation";
import {
  insertConversation,
  insertConversationTurn,
  listConversations,
  loadConversation,
} from "@/app/conversationPersistence";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  const db = await ensureLabSchema();
  return Response.json({ conversations: await listConversations(db, owner) });
}

export async function POST(request: Request) {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Choose the work you want to talk through." }, { status: 400 });
  }
  if (!isConversationWorkflow(body.workflow)) {
    return Response.json({ error: "Choose a supported Lab conversation." }, { status: 400 });
  }
  const contract = WORKFLOW_CONTRACTS[body.workflow];
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const title = `${contract.label} conversation · ${now.slice(0, 10)}`;
  const draft = emptyConversationDraft(body.workflow);
  const db = await ensureLabSchema();
  await db.batch([
    insertConversation(db, { id, owner, workflow: body.workflow, title, now }),
    insertConversationTurn(db, {
      id: crypto.randomUUID(), conversationId: id, owner, sequence: 1, role: "teacher",
      visibleText: contract.initialQuestion, draft, metadata: { kind: "started", phase: "collecting" }, now,
    }),
  ]);
  return Response.json({ conversation: await loadConversation(db, owner, id) }, { status: 201 });
}
