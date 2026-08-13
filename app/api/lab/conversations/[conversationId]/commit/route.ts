import { POST as commitLabOperation } from "@/app/api/lab/route";
import { currentLabOwnerId } from "@/app/labOwner";
import { WORKFLOW_CONTRACTS } from "@/app/conversation";
import { insertConversationTurn, latestDraft, loadConversation } from "@/app/conversationPersistence";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

const recruitingChildren = new Set(["opportunity_observation", "recruiting_interaction", "application_attempt", "interview_practice", "portfolio_candidate"]);

function allowedCommit(workflow: keyof typeof WORKFLOW_CONTRACTS, body: Record<string, unknown>): boolean {
  const contract = WORKFLOW_CONTRACTS[workflow];
  if (body.operation !== contract.operation) return false;
  if (workflow === "recruiting_evidence") return recruitingChildren.has(String(body.recordType));
  if (contract.recordType && body.recordType !== contract.recordType) return false;
  if (workflow === "reading_response") return body.eventType === "learner_response";
  if (workflow === "history_update") return new Set(["reflection", "later_usefulness", "source_status", "metadata_correction"]).has(String(body.eventType));
  return true;
}

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  const owner = await currentLabOwnerId();
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { conversationId } = await context.params;
  const db = await ensureLabSchema();
  let conversation = await loadConversation(db, owner, conversationId);
  if (!conversation) return Response.json({ error: "The private Learning Conversation was not found." }, { status: 404 });
  if (conversation.phase === "committed") {
    return Response.json({ id: conversation.committedRecordId, conversation, idempotent: true });
  }
  if (conversation.phase === "abandoned") return Response.json({ error: "An abandoned conversation cannot commit a record." }, { status: 409 });
  if (conversation.phase !== "review_ready") return Response.json({ error: "Review the complete draft with the teacher before preserving it." }, { status: 409 });
  const draft = latestDraft(conversation);
  if (draft.missingRequirements.length || draft.contradictions.length) {
    return Response.json({ error: "Resolve every missing requirement and contradiction before preserving this record." }, { status: 409 });
  }
  if (!allowedCommit(conversation.workflow, draft.commitBody)) {
    return Response.json({ error: "The conversation draft does not match its declared Lab workflow." }, { status: 400 });
  }
  const delegatedRequest = new Request(request.url.replace(/\/conversations\/[^/]+\/commit$/, ""), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft.commitBody),
  });
  const resultResponse = await commitLabOperation(delegatedRequest);
  const result = await resultResponse.json() as { id?: string; error?: string };
  if (!resultResponse.ok || !result.id) {
    return Response.json({ error: result.error ?? "The confirmed draft did not pass the Lab's evidence rules." }, { status: resultResponse.status });
  }
  conversation = (await loadConversation(db, owner, conversationId))!;
  const now = new Date().toISOString();
  await insertConversationTurn(db, {
    id: crypto.randomUUID(), conversationId, owner,
    sequence: (conversation.turns.at(-1)?.sequence ?? 0) + 1,
    role: "system", visibleText: "Confirmed by the learner and preserved as an immutable Lab artifact.",
    draft, metadata: { kind: "committed", phase: "committed", recordId: result.id }, now,
  }).run();
  return Response.json({ id: result.id, conversation: await loadConversation(db, owner, conversationId) }, { status: 201 });
}
