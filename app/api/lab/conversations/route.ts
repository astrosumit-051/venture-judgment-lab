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
import {
  PRACTICE_CONTEXT_WORKFLOWS,
  parseConversationPracticeContext,
} from "@/app/conversationPracticeContext";
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
  const practiceContext = body.practiceContext === undefined ? null : parseConversationPracticeContext(body.practiceContext);
  if (body.practiceContext !== undefined && !practiceContext) {
    return Response.json({ error: "The Practice Day conversation context is not valid." }, { status: 400 });
  }
  if (practiceContext && !PRACTICE_CONTEXT_WORKFLOWS.has(body.workflow)) {
    return Response.json({ error: "This conversation cannot contribute to a Practice Day checkpoint." }, { status: 400 });
  }
  if (practiceContext?.selectedSourcingLeadId && body.workflow !== "snapshot_judgment") {
    return Response.json({ error: "Only a Snapshot conversation can carry a selected daily company." }, { status: 400 });
  }
  const openingMessage = typeof body.openingMessage === "string" ? body.openingMessage.trim().slice(0, 10_000) : "";
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const title = `${contract.label} conversation · ${now.slice(0, 10)}`;
  const draft = emptyConversationDraft(body.workflow);
  const db = await ensureLabSchema();
  if (practiceContext) {
    const practiceDay = await db.prepare(
      "SELECT id FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = 'practice_day' LIMIT 1",
    ).bind(practiceContext.practiceDayId, owner).first<{ id: string }>();
    if (!practiceDay) return Response.json({ error: "The linked Practice Day was not found in your private curriculum epoch." }, { status: 404 });
    if (practiceContext.selectedSourcingLeadId) {
      const selectedLead = await db.prepare(
        `SELECT id FROM lab_records WHERE id = ? AND owner_id = ? AND record_type = 'sourcing_lead'
         AND json_extract(payload_json, '$.practiceDayId') = ? LIMIT 1`,
      ).bind(practiceContext.selectedSourcingLeadId, owner, practiceContext.practiceDayId).first<{ id: string }>();
      if (!selectedLead) return Response.json({ error: "The selected company is not one of this Practice Day’s independently preserved leads." }, { status: 404 });
    }
  }
  const practiceMetadata = practiceContext ? { practiceContext } : {};
  const firstTurn = openingMessage
    ? { role: "learner" as const, visibleText: openingMessage, metadata: { kind: "opening_intent", ...practiceMetadata } }
    : { role: "teacher" as const, visibleText: contract.initialQuestion, metadata: { kind: "started", phase: "collecting", ...practiceMetadata } };
  await db.batch([
    insertConversation(db, { id, owner, workflow: body.workflow, title, now }),
    insertConversationTurn(db, {
      id: crypto.randomUUID(), conversationId: id, owner, sequence: 1,
      role: firstTurn.role, visibleText: firstTurn.visibleText, draft, metadata: firstTurn.metadata, now,
    }),
  ]);
  if (!openingMessage) {
    return Response.json({ conversation: await loadConversation(db, owner, id) }, { status: 201 });
  }
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
