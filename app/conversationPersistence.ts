import {
  conversationPhase,
  latestConversationDraft,
  type ConversationDraft,
  type ConversationRole,
  type ConversationTurn,
  type ConversationWorkflow,
  type LearningConversation,
} from "./conversation";

type ConversationRow = { id: string; workflow: string; title: string; created_at: string };
type TurnRow = {
  id: string;
  sequence: number;
  role: string;
  visible_text: string;
  draft_json: string;
  metadata_json: string;
  created_at: string;
};

function object(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 100) : [];
}

function draft(value: string): ConversationDraft {
  const parsed = object(value);
  return {
    commitBody: parsed.commitBody && typeof parsed.commitBody === "object" && !Array.isArray(parsed.commitBody)
      ? parsed.commitBody as Record<string, unknown>
      : {},
    missingRequirements: stringArray(parsed.missingRequirements),
    contradictions: stringArray(parsed.contradictions),
  };
}

function mapTurn(row: TurnRow): ConversationTurn {
  return {
    id: row.id,
    sequence: Number(row.sequence),
    role: row.role as ConversationRole,
    visibleText: row.visible_text,
    draft: draft(row.draft_json),
    metadata: object(row.metadata_json),
    createdAt: row.created_at,
  };
}

export async function loadConversation(
  db: D1Database,
  owner: string,
  conversationId: string,
): Promise<LearningConversation | null> {
  const row = await db.prepare(
    "SELECT id, workflow, title, created_at FROM lab_conversations WHERE id = ? AND owner_id = ? LIMIT 1",
  ).bind(conversationId, owner).first<ConversationRow>();
  if (!row) return null;
  const turnsResult = await db.prepare(
    `SELECT id, sequence, role, visible_text, draft_json, metadata_json, created_at
     FROM lab_conversation_turns WHERE conversation_id = ? AND owner_id = ? ORDER BY sequence ASC`,
  ).bind(conversationId, owner).all<TurnRow>();
  const turns = (turnsResult.results ?? []).map(mapTurn);
  const committed = [...turns].reverse().find((turn) => turn.role === "system" && turn.metadata.kind === "committed");
  return {
    id: row.id,
    workflow: row.workflow as ConversationWorkflow,
    title: row.title,
    phase: conversationPhase(turns),
    createdAt: row.created_at,
    turns,
    committedRecordId: typeof committed?.metadata.recordId === "string" ? committed.metadata.recordId : null,
  };
}

export async function listConversations(db: D1Database, owner: string): Promise<LearningConversation[]> {
  const rows = await db.prepare(
    "SELECT id FROM lab_conversations WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100",
  ).bind(owner).all<{ id: string }>();
  const conversations = await Promise.all((rows.results ?? []).map((row) => loadConversation(db, owner, row.id)));
  return conversations.filter((item): item is LearningConversation => Boolean(item));
}

export function insertConversation(
  db: D1Database,
  values: { id: string; owner: string; workflow: ConversationWorkflow; title: string; now: string },
) {
  return db.prepare(
    "INSERT INTO lab_conversations (id, owner_id, workflow, title, created_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(values.id, values.owner, values.workflow, values.title, values.now);
}

export function insertConversationTurn(
  db: D1Database,
  values: {
    id: string;
    conversationId: string;
    owner: string;
    sequence: number;
    role: ConversationRole;
    visibleText: string;
    draft: ConversationDraft;
    metadata: Record<string, unknown>;
    now: string;
  },
) {
  return db.prepare(
    `INSERT INTO lab_conversation_turns
     (id, conversation_id, owner_id, sequence, role, visible_text, draft_json, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    values.id,
    values.conversationId,
    values.owner,
    values.sequence,
    values.role,
    values.visibleText,
    JSON.stringify(values.draft),
    JSON.stringify(values.metadata),
    values.now,
  );
}

export function latestDraft(conversation: LearningConversation): ConversationDraft {
  return latestConversationDraft(conversation);
}

export async function reserveConversationCommit(db: D1Database, conversationId: string, owner: string, now: string) {
  const result = await db.prepare(
    `INSERT OR IGNORE INTO lab_conversation_commits (conversation_id, owner_id, artifact_id, created_at, committed_at)
     VALUES (?, ?, NULL, ?, NULL)`,
  ).bind(conversationId, owner, now).run();
  if ((result.meta?.changes ?? 0) === 1) return { acquired: true, artifactId: null };
  const existing = await db.prepare(
    "SELECT artifact_id FROM lab_conversation_commits WHERE conversation_id = ? AND owner_id = ? LIMIT 1",
  ).bind(conversationId, owner).first<{ artifact_id: string | null }>();
  return { acquired: false, artifactId: existing?.artifact_id ?? null };
}

export function completeConversationCommit(db: D1Database, conversationId: string, owner: string, artifactId: string, now: string) {
  return db.prepare(
    `UPDATE lab_conversation_commits SET artifact_id = ?, committed_at = ?
     WHERE conversation_id = ? AND owner_id = ? AND artifact_id IS NULL`,
  ).bind(artifactId, now, conversationId, owner);
}

export function releaseConversationCommit(db: D1Database, conversationId: string, owner: string) {
  return db.prepare(
    "DELETE FROM lab_conversation_commits WHERE conversation_id = ? AND owner_id = ? AND artifact_id IS NULL",
  ).bind(conversationId, owner);
}
