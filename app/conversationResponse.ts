import { WORKFLOW_CONTRACTS } from "./conversation";
import {
  insertConversationTurn,
  latestDraft,
  loadConversation,
} from "./conversationPersistence";
import { askConversationalTeacher } from "./teacherProvider";

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

export async function generateTeacherTurn(
  db: D1Database,
  owner: string,
  conversationId: string,
) {
  const conversation = await loadConversation(db, owner, conversationId);
  if (!conversation) throw new Error("The private Learning Conversation was not found.");
  const contract = WORKFLOW_CONTRACTS[conversation.workflow];
  const result = await askConversationalTeacher({
    contract,
    transcript: conversation.turns,
    currentDraft: latestDraft(conversation),
    relevantRecords: await relevantRecordChoices(db, owner, contract.contextRecordTypes),
  });
  await insertConversationTurn(db, {
    id: crypto.randomUUID(),
    conversationId,
    owner,
    sequence: (conversation.turns.at(-1)?.sequence ?? 0) + 1,
    role: "teacher",
    visibleText: result.reply.message,
    draft: result.draft,
    metadata: {
      kind: "teacher_reply",
      phase: result.reply.phase,
      missingRequirements: result.reply.missingRequirements,
      contradictions: result.reply.contradictions,
    },
    now: new Date().toISOString(),
  }).run();
  return loadConversation(db, owner, conversationId);
}
