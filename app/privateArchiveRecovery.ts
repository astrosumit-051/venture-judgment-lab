import {
  PRIVATE_ARCHIVE_SECTIONS,
  buildPrivateArchiveExport,
  canonicalizeJson,
  sha256Hex,
  type PrivateArchiveBundle,
} from "./privateArchive.ts";

type ArchiveRow = Record<string, unknown>;

async function verifyManifest(owner: string, bundle: PrivateArchiveBundle): Promise<void> {
  if (await sha256Hex(owner) !== bundle.payload.ownerFingerprint) throw new Error("The recovery owner does not match the archive manifest.");
  if (await sha256Hex(canonicalizeJson(bundle.payload)) !== bundle.payloadDigest) throw new Error("The recovery manifest digest does not verify.");
  for (const section of PRIVATE_ARCHIVE_SECTIONS) {
    const rows = bundle.payload.sections[section];
    if (bundle.payload.counts[section] !== rows.length) throw new Error(`The recovery ${section} count does not verify.`);
    if (await sha256Hex(canonicalizeJson(rows)) !== bundle.payload.sectionChecksums[section]) {
      throw new Error(`The recovery ${section} checksum does not verify.`);
    }
  }
}

function value(row: ArchiveRow, key: string): unknown { return row[key] ?? null; }

function recoveryStatements(db: D1Database, owner: string, bundle: PrivateArchiveBundle): D1PreparedStatement[] {
  const sections = bundle.payload.sections;
  const credentialBindings = new Map(sections.records.flatMap((row) => {
    if (!new Set(["lab_automation_registration", "opportunity_monitor_registration"]).has(String(value(row, "recordType")))) return [];
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(String(value(row, "payloadJson"))) as Record<string, unknown>; } catch { return []; }
    const fingerprint = typeof payload.tokenFingerprint === "string" ? payload.tokenFingerprint : "";
    return fingerprint ? [[fingerprint, { fingerprint, createdAt: String(value(row, "createdAt")) }] as const] : [];
  })).values();
  return [
    ...[...credentialBindings].map(({ fingerprint, createdAt }) => db.prepare(
      `INSERT INTO lab_automation_credentials (token_fingerprint, owner_id, created_at) VALUES (?, ?, ?)`,
    ).bind(fingerprint, owner, createdAt)),
    ...sections.profiles.map((row) => db.prepare(
      `INSERT INTO lab_profiles (id, owner_id, profile_version, timezone, practice_mode,
       expected_weekdays_json, notification_preference, effective_learner_date, automation_binding, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(value(row, "id"), owner, value(row, "profileVersion"), value(row, "timezone"), value(row, "practiceMode"),
      value(row, "expectedWeekdaysJson"), value(row, "notificationPreference"), value(row, "effectiveLearnerDate"),
      value(row, "automationBinding"), value(row, "createdAt"))),
    ...sections.records.map((row) => db.prepare(
      `INSERT INTO lab_records (id, owner_id, record_type, parent_id, title, payload_json, committed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(value(row, "id"), owner, value(row, "recordType"), value(row, "parentId"), value(row, "title"),
      value(row, "payloadJson"), value(row, "committedAt"), value(row, "createdAt"))),
    ...sections.automationRuns.map((row) => db.prepare(
      `INSERT INTO lab_automation_runs (id, owner_id, operator_kind, scheduled_for, profile_id,
       input_checksum, evidence_record_id, notification_intent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(value(row, "id"), owner, value(row, "operatorKind"), value(row, "scheduledFor"), value(row, "profileId"),
      value(row, "inputChecksum"), value(row, "evidenceRecordId"), value(row, "notificationIntent"), value(row, "createdAt"))),
    ...sections.assignments.map((row) => db.prepare(
      `INSERT INTO lab_assignments (id, owner_id, learner_date, profile_id, automation_run_id,
       evidence_record_id, state, payload_checksum, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(value(row, "id"), owner, value(row, "learnerDate"), value(row, "profileId"), value(row, "automationRunId"),
      value(row, "evidenceRecordId"), value(row, "state"), value(row, "payloadChecksum"), value(row, "createdAt"))),
    ...sections.events.map((row) => db.prepare(
      `INSERT INTO lab_events (id, owner_id, record_id, event_type, event_json, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(value(row, "id"), owner, value(row, "recordId"), value(row, "eventType"), value(row, "eventJson"),
      value(row, "occurredAt"), value(row, "createdAt"))),
  ];
}

export async function recoverPrivateArchive(db: D1Database, owner: string, bundle: PrivateArchiveBundle): Promise<{ counts: PrivateArchiveBundle["payload"]["counts"]; digest: string }> {
  await verifyManifest(owner, bundle);
  const existing = await db.batch([
    db.prepare("SELECT COUNT(*) AS count FROM lab_records"),
    db.prepare("SELECT COUNT(*) AS count FROM lab_events"),
    db.prepare("SELECT COUNT(*) AS count FROM lab_profiles"),
    db.prepare("SELECT COUNT(*) AS count FROM lab_assignments"),
    db.prepare("SELECT COUNT(*) AS count FROM lab_automation_runs"),
    db.prepare("SELECT COUNT(*) AS count FROM lab_automation_credentials"),
  ]) as Array<{ results?: Array<{ count: number }> }>;
  if (existing.some((result) => Number(result.results?.[0]?.count ?? 0) !== 0)) {
    throw new Error("Private archive recovery requires a fresh D1 environment.");
  }
  await db.batch(recoveryStatements(db, owner, bundle));
  const recovered = await buildPrivateArchiveExport(db, owner, bundle.payload.cursor.runKey, bundle.payload.cursor);
  if (!recovered
    || canonicalizeJson(recovered.payload.counts) !== canonicalizeJson(bundle.payload.counts)
    || canonicalizeJson(recovered.payload.sectionChecksums) !== canonicalizeJson(bundle.payload.sectionChecksums)
    || recovered.payloadDigest !== bundle.payloadDigest) {
    throw new Error("Recovered D1 counts or checksums do not reconcile through the archive cursor.");
  }
  return { counts: recovered.payload.counts, digest: recovered.payloadDigest };
}
