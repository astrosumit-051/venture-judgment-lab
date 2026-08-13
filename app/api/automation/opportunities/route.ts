import { registeredAutomationOwner } from "@/app/automationRegistration";
import { dateInTimeZone } from "@/app/calibration";
import {
  effectiveOpportunityPayload,
  latestExpectedMonitorRun,
  materialOpportunityChanges,
  MONITOR_TARGETS,
  monitorInputFingerprint,
  monitorRunKey,
  snapshotToObservationPayload,
  snapshotToOpportunityPayload,
  type OpportunityMonitorRunInput,
  type OpportunityMonitorSnapshot,
  validateOpportunityMonitorRun,
} from "@/app/opportunityMonitor";
import {
  normalizeRecruitingUrl,
  recruitingRecordKey,
  validateRecruitingPayload,
} from "@/app/recruiting";
import { ensureLabSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

type DbRecord = {
  id: string;
  owner_id: string;
  record_type: string;
  parent_id: string | null;
  title: string;
  payload_json: string;
  committed_at: string;
};

function parseJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function insertRecord(
  db: D1Database,
  values: {
    id: string;
    owner: string;
    recordType: string;
    parentId: string | null;
    title: string;
    payload: Record<string, unknown>;
    now: string;
  },
) {
  return db.prepare(
    `INSERT INTO lab_records
     (id, owner_id, record_type, parent_id, title, payload_json, committed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    values.id,
    values.owner,
    values.recordType,
    values.parentId,
    values.title,
    JSON.stringify(values.payload),
    values.now,
    values.now,
  );
}

async function recruitingRows(db: D1Database, owner: string): Promise<DbRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, owner_id, record_type, parent_id, title, payload_json, committed_at
       FROM lab_records WHERE owner_id = ?
       AND record_type IN ('recruiting_opportunity', 'opportunity_observation')
       ORDER BY committed_at ASC`,
    )
    .bind(owner)
    .all<DbRecord>();
  return result.results ?? [];
}

function publicEffectiveRows(rows: DbRecord[]) {
  const opportunities = rows.filter((row) => row.record_type === "recruiting_opportunity");
  const observations = rows.filter((row) => row.record_type === "opportunity_observation");
  return opportunities.map((opportunity) => {
    const payload = parseJson(opportunity.payload_json);
    const effective = effectiveOpportunityPayload(payload, observations
      .filter((observation) => observation.parent_id === opportunity.id)
      .map((observation) => ({ payload: parseJson(observation.payload_json), committedAt: observation.committed_at })));
    return {
      id: opportunity.id,
      firm: text(effective.firm),
      roleTitle: text(effective.roleTitle),
      cycleKey: text(effective.cycleKey),
      officialUrl: text(effective.officialUrl),
      normalizedOfficialUrl: text(effective.normalizedOfficialUrl),
      status: text(effective.status),
      opportunityClass: text(effective.opportunityClass),
      funnelClass: text(effective.funnelClass),
      publishedDeadline: text(effective.publishedDeadline),
      deadlineTimezone: text(effective.deadlineTimezone),
      compensationEvidence: text(effective.compensationEvidence),
      location: text(effective.location),
      workMode: text(effective.workMode),
      roleScope: text(effective.roleScope),
      qualificationReason: text(effective.qualificationReason),
      immigrationState: text(effective.immigrationState),
      immigrationEvidence: text(effective.immigrationEvidence),
      nextAction: text(effective.nextAction),
      dueDate: text(effective.dueDate),
    };
  });
}

export async function GET(request: Request) {
  const db = await ensureLabSchema();
  const owner = await registeredAutomationOwner(db, request, "opportunity_monitor");
  if (!owner) return Response.json({ error: "Valid registered automation authorization is required." }, { status: 401 });
  const [rows, lastRun] = await Promise.all([
    recruitingRows(db, owner),
    db.prepare(
      `SELECT id, payload_json, committed_at FROM lab_records WHERE owner_id = ?
       AND record_type = 'opportunity_monitor_run' ORDER BY committed_at DESC LIMIT 1`,
    ).bind(owner).first<{ id: string; payload_json: string; committed_at: string }>(),
  ]);
  const expectedScheduledFor = latestExpectedMonitorRun(new Date());
  const expectedRunKey = expectedScheduledFor ? monitorRunKey(expectedScheduledFor) : "";
  const lastRunPayload = lastRun ? parseJson(lastRun.payload_json) : null;
  return Response.json({
    targets: MONITOR_TARGETS,
    opportunities: publicEffectiveRows(rows),
    monitorHealth: {
      expectedScheduledFor,
      expectedRunKey,
      missedScheduledRun: Boolean(expectedRunKey && text(lastRunPayload?.runKey) !== expectedRunKey),
    },
    lastRun: lastRun ? { id: lastRun.id, ...lastRunPayload, committedAt: lastRun.committed_at } : null,
  });
}

export async function POST(request: Request) {
  const db = await ensureLabSchema();
  const owner = await registeredAutomationOwner(db, request, "opportunity_monitor");
  if (!owner) return Response.json({ error: "Valid registered automation authorization is required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const invalid = validateOpportunityMonitorRun(body, new Date());
  if (invalid) return Response.json({ error: invalid }, { status: 400 });
  const input = body as OpportunityMonitorRunInput;
  const runKey = monitorRunKey(input.scheduledFor);
  const inputFingerprint = monitorInputFingerprint(input);
  const duplicate = await db.prepare(
    `SELECT id, payload_json, committed_at FROM lab_records WHERE owner_id = ?
     AND record_type = 'opportunity_monitor_run'
     AND json_extract(payload_json, '$.runKey') = ? LIMIT 1`,
  ).bind(owner, runKey).first<{ id: string; payload_json: string; committed_at: string }>();
  if (duplicate) {
    const payload = parseJson(duplicate.payload_json);
    if (text(payload.inputFingerprint) !== inputFingerprint) {
      return Response.json({ error: "This scheduled monitor run already exists with different evidence." }, { status: 409 });
    }
    return Response.json({ id: duplicate.id, committedAt: duplicate.committed_at, idempotent: true, ...payload });
  }

  const rows = await recruitingRows(db, owner);
  const opportunities = rows.filter((row) => row.record_type === "recruiting_opportunity");
  const observations = rows.filter((row) => row.record_type === "opportunity_observation");
  const opportunityByIdentity = new Map(opportunities.map((row) => [
    recruitingRecordKey("recruiting_opportunity", parseJson(row.payload_json)),
    row,
  ]));
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  const createdOpportunityIds: string[] = [];
  const observationIds: string[] = [];
  const failures: Array<{ targetKey: string; code: string; summary: string }> = [];
  const learnerDecisions: Array<{ targetKey: string; officialUrl: string; reason: string }> = [];
  const targetResults: Array<{ targetKey: string; outcome: string; snapshots: number; materialRecords: number }> = [];

  for (const check of input.checks) {
    if (check.outcome === "failure") {
      failures.push({ targetKey: check.targetKey, code: check.failureCode, summary: check.failureSummary });
      targetResults.push({ targetKey: check.targetKey, outcome: "failure", snapshots: 0, materialRecords: 0 });
      continue;
    }
    let materialRecords = 0;
    const target = MONITOR_TARGETS.find((candidate) => candidate.key === check.targetKey)!;
    for (const snapshot of check.snapshots) {
      const normalizedUrl = normalizeRecruitingUrl(snapshot.officialUrl);
      const snapshotIdentity = recruitingRecordKey("recruiting_opportunity", {
        normalizedOfficialUrl: normalizedUrl,
        cycleKey: snapshot.cycleKey,
      });
      const existing = opportunityByIdentity.get(snapshotIdentity);
      if (snapshot.decisionRequired) {
        learnerDecisions.push({ targetKey: snapshot.targetKey, officialUrl: normalizedUrl, reason: snapshot.decisionReason });
      }
      if (!existing) {
        const payload = snapshotToOpportunityPayload(snapshot);
        payload.recordKey = recruitingRecordKey("recruiting_opportunity", payload);
        const validationError = validateRecruitingPayload(
          "recruiting_opportunity",
          payload,
          dateInTimeZone(new Date(), snapshot.timezone),
        );
        if (validationError) return Response.json({ error: validationError }, { status: 400 });
        const id = crypto.randomUUID();
        statements.push(insertRecord(db, {
          id,
          owner,
          recordType: "recruiting_opportunity",
          parentId: null,
          title: `${snapshot.firm} — ${snapshot.roleTitle}`,
          payload,
          now,
        }));
        createdOpportunityIds.push(id);
        materialRecords += 1;
        opportunityByIdentity.set(snapshotIdentity, {
          id,
          owner_id: owner,
          record_type: "recruiting_opportunity",
          parent_id: null,
          title: `${snapshot.firm} — ${snapshot.roleTitle}`,
          payload_json: JSON.stringify(payload),
          committed_at: now,
        });
        continue;
      }
      const originalPayload = parseJson(existing.payload_json);
      const effective = effectiveOpportunityPayload(originalPayload, observations
        .filter((observation) => observation.parent_id === existing.id)
        .map((observation) => ({ payload: parseJson(observation.payload_json), committedAt: observation.committed_at })));
      const effectiveSnapshot = { ...snapshot };
      if (text(effective.immigrationState) === "Authorized") {
        effectiveSnapshot.immigrationState = "Authorized";
        effectiveSnapshot.immigrationEvidence = text(effective.immigrationEvidence);
        effectiveSnapshot.authorizationClaim = true;
      }
      const changedFields = materialOpportunityChanges(effective, effectiveSnapshot as unknown as Record<string, unknown>);
      if (!changedFields.length) continue;
      if (snapshot.timezone !== text(originalPayload.timezone) || snapshot.observedOn < text(originalPayload.discoveredOn)) {
        return Response.json({ error: "A monitored observation must preserve its opportunity's timezone and cannot predate discovery." }, { status: 400 });
      }
      const payload = snapshotToObservationPayload(existing.id, target.sourceUrl, effectiveSnapshot as OpportunityMonitorSnapshot, changedFields);
      payload.recordKey = recruitingRecordKey("opportunity_observation", payload);
      const validationError = validateRecruitingPayload(
        "opportunity_observation",
        payload,
        dateInTimeZone(new Date(), snapshot.timezone),
      );
      if (validationError) return Response.json({ error: validationError }, { status: 400 });
      const id = crypto.randomUUID();
      statements.push(insertRecord(db, {
        id,
        owner,
        recordType: "opportunity_observation",
        parentId: existing.id,
        title: `${snapshot.firm} — Opportunity Observation`,
        payload,
        now,
      }));
      observationIds.push(id);
      materialRecords += 1;
      observations.push({
        id,
        owner_id: owner,
        record_type: "opportunity_observation",
        parent_id: existing.id,
        title: `${snapshot.firm} — Opportunity Observation`,
        payload_json: JSON.stringify(payload),
        committed_at: now,
      });
    }
    targetResults.push({ targetKey: check.targetKey, outcome: "reachable", snapshots: check.snapshots.length, materialRecords });
  }

  const notificationReasons = [
    ...(createdOpportunityIds.length ? [`${createdOpportunityIds.length} new opportunity${createdOpportunityIds.length === 1 ? "" : "ies"}`] : []),
    ...(observationIds.length ? [`${observationIds.length} material change${observationIds.length === 1 ? "" : "s"}`] : []),
    ...(failures.length ? [`${failures.length} first-party failure${failures.length === 1 ? "" : "s"}`] : []),
    ...(learnerDecisions.length ? [`${learnerDecisions.length} learner decision${learnerDecisions.length === 1 ? "" : "s"}`] : []),
  ];
  const runId = crypto.randomUUID();
  const runPayload = {
    runKey,
    inputFingerprint,
    scheduledFor: input.scheduledFor,
    timezone: "America/New_York",
    checks: input.checks,
    targetResults,
    createdOpportunityIds,
    observationIds,
    failures,
    learnerDecisions,
    notify: notificationReasons.length > 0,
    notificationReasons,
  };
  statements.unshift(insertRecord(db, {
    id: runId,
    owner,
    recordType: "opportunity_monitor_run",
    parentId: null,
    title: `Official Opportunity Monitor — ${runKey.split("|")[1]}`,
    payload: runPayload,
    now,
  }));
  try {
    await db.batch(statements);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      return Response.json({ error: "The scheduled monitor run or one material observation was already preserved." }, { status: 409 });
    }
    throw error;
  }
  return Response.json({ id: runId, committedAt: now, idempotent: false, ...runPayload }, { status: 201 });
}
