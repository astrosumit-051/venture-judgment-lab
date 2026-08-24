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
import { generateTeacherTurn } from "@/app/conversationResponse";
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
  const openingMessage = typeof body.openingMessage === "string" ? body.openingMessage.trim().slice(0, 10_000) : "";
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const title = `${contract.label} conversation · ${now.slice(0, 10)}`;
  const draft = emptyConversationDraft(body.workflow);
  const db = await ensureLabSchema();
  await insertConversation(db, { id, owner, workflow: body.workflow, title, now }).run();
  if (!openingMessage) {
    await insertConversationTurn(db, {
      id: crypto.randomUUID(), conversationId: id, owner, sequence: 1, role: "teacher",
      visibleText: contract.initialQuestion, draft, metadata: { kind: "started", phase: "collecting" }, now,
    }).run();
    return Response.json({ conversation: await loadConversation(db, owner, id) }, { status: 201 });
  }
  await insertConversationTurn(db, {
    id: crypto.randomUUID(), conversationId: id, owner, sequence: 1, role: "learner",
    visibleText: openingMessage, draft, metadata: { kind: "opening_intent" }, now,
  }).run();
  try {
    return Response.json({ conversation: await generateTeacherTurn(db, owner, id) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Luna is temporarily unavailable.";
    return Response.json({
      error: /preserv/i.test(message) ? message : `${message} Your opening thought remains preserved.`,
      preserved: true,
      conversation: await loadConversation(db, owner, id),
    }, { status: 503 });
  }
}
