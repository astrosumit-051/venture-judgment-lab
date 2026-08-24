import { applySourcingCorrections, type SourcingEventLike } from "./sourcing.ts";

type LeadRow = { id: string; payload_json: string };
type EventRow = { id: string; record_id: string; event_type: string; event_json: string; occurred_at: string };

function parseJson(value: string): Record<string, unknown> {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

export async function independentPracticeDayLeadIds(
  db: D1Database,
  owner: string,
  practiceDayId: string,
): Promise<string[]> {
  const leads = await db.prepare(
    `SELECT id, payload_json FROM lab_records
     WHERE owner_id = ? AND record_type = 'sourcing_lead'
       AND json_extract(payload_json, '$.practiceDayId') = ?`,
  ).bind(owner, practiceDayId).all<LeadRow>();
  const rows = leads.results ?? [];
  if (rows.length === 0) return [];
  const events = await db.prepare(
    `SELECT id, record_id, event_type, event_json, occurred_at FROM lab_events
     WHERE owner_id = ? AND event_type = 'sourcing_metadata_correction'
       AND record_id IN (${rows.map(() => "?").join(",")})
     ORDER BY occurred_at ASC, id ASC`,
  ).bind(owner, ...rows.map((row) => row.id)).all<EventRow>();
  const byLead = new Map<string, SourcingEventLike[]>();
  for (const event of events.results ?? []) {
    const bucket = byLead.get(event.record_id) ?? [];
    bucket.push({
      id: event.id,
      recordId: event.record_id,
      eventType: event.event_type,
      eventData: parseJson(event.event_json),
      occurredAt: event.occurred_at,
    });
    byLead.set(event.record_id, bucket);
  }
  return rows.filter((row) => (
    applySourcingCorrections(parseJson(row.payload_json), byLead.get(row.id) ?? []).attributionClass
      === "Independent discovery"
  )).map((row) => row.id);
}
