import { verifyAutomationBearer } from "./automationAuth";

export const LAB_AUTOMATION_CAPABILITIES = [
  "daily_operator",
  "private_export",
  "coach",
  "opportunity_monitor",
] as const;

export type LabAutomationCapability = typeof LAB_AUTOMATION_CAPABILITIES[number];

export async function registeredAutomationOwner(
  db: D1Database,
  request: Request,
  capability: LabAutomationCapability,
): Promise<string | null> {
  const identity = await verifyAutomationBearer(request);
  if (!identity) return null;
  const registration = await db.prepare(
    `SELECT owner_id FROM lab_records
     WHERE record_type = 'lab_automation_registration'
     AND json_extract(payload_json, '$.tokenFingerprint') = ?
     AND json_extract(payload_json, '$.status') = 'active'
     AND EXISTS (
       SELECT 1 FROM json_each(lab_records.payload_json, '$.capabilities') capability
       WHERE capability.value = ?
     )
     LIMIT 1`,
  ).bind(identity.fingerprint, capability).first<{ owner_id: string }>();
  if (registration) return registration.owner_id;
  if (capability !== "coach" && capability !== "opportunity_monitor") return null;
  const legacy = await db.prepare(
    `SELECT owner_id FROM lab_records
     WHERE record_type = 'opportunity_monitor_registration'
       AND json_extract(payload_json, '$.tokenFingerprint') = ?
       AND json_extract(payload_json, '$.status') = 'active'
     LIMIT 1`,
  ).bind(identity.fingerprint).first<{ owner_id: string }>();
  return legacy?.owner_id ?? null;
}
