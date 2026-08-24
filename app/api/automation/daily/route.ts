import { registeredAutomationOwner } from "@/app/automationRegistration";
import { validateAssignmentEvent } from "@/app/assignmentEvents";
import { dateInTimeZone, isValidTimeZone } from "@/app/calibration";
import {
  canonicalJson,
  dailyRunChecksum,
  sha256Hex,
  validateDailyRun,
  type DailyRunInput,
} from "@/app/dailyAssignment";
import type { CourseFirstCurriculumInput } from "@/app/courseCurriculum";
import { dailyOperatorRunKey } from "@/app/dailyOperator";
import { ensureLabSchema } from "@/db/runtime";
import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  profile_version: string;
  timezone: string;
  practice_mode: string;
  expected_weekdays_json: string;
  effective_learner_date: string;
};

function parseJson(value: string): Record<string, unknown> {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

function text(value: unknown, max = 10_000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function currentInstant(): Date {
  const smokeInstant = typeof env.LAB_API_SMOKE_NOW === "string" ? env.LAB_API_SMOKE_NOW : undefined;
  if (smokeInstant) {
    const parsed = new Date(smokeInstant);
    if (Number.isFinite(parsed.getTime()) && parsed.toISOString() === smokeInstant) return parsed;
  }
  return new Date();
}

async function appendOperatorEvent(
  db: D1Database,
  owner: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const recordId = text(body.recordId, 80);
  const eventType = text(body.eventType, 60);
  const eventData = body.eventData;
  if (!recordId || !["source_status", "replacement_link", "missed_practice"].includes(eventType) || !isObject(eventData)) {
    return Response.json({ error: "The Daily Operator accepts only bounded source-status, replacement, or missed-practice evidence." }, { status: 400 });
  }
  const parent = await db.prepare(
    "SELECT id, record_type, payload_json FROM lab_records WHERE id = ? AND owner_id = ? LIMIT 1",
  ).bind(recordId, owner).first<{ id: string; record_type: string; payload_json: string }>();
  if (!parent) return Response.json({ error: "The owner-bound assignment record was not found." }, { status: 404 });
  const invalid = validateAssignmentEvent(parent.record_type, eventType, eventData);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });
  if (eventType === "missed_practice") {
    const payload = parseJson(parent.payload_json);
    const assignedDate = text(payload.assignedDate, 20);
    const timezone = text(payload.timezone, 100);
    if (eventData.learnerDate !== assignedDate || !isValidTimeZone(timezone) || dateInTimeZone(currentInstant(), timezone) <= assignedDate) {
      return Response.json({ error: "Missed practice can be preserved only after the matching learner date has ended." }, { status: 400 });
    }
  }
  const id = crypto.randomUUID();
  const now = currentInstant().toISOString();
  try {
    await db.prepare(
      `INSERT INTO lab_events
       (id, owner_id, record_id, event_type, event_json, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, owner, recordId, eventType, JSON.stringify(eventData), now, now).run();
  } catch (error) {
    if (
      eventType === "missed_practice"
      && error instanceof Error
      && error.message.toLowerCase().includes("unique")
    ) {
      return Response.json({ error: "This Daily Brief already has an immutable terminal outcome." }, { status: 409 });
    }
    throw error;
  }
  return Response.json({ id, recordId, eventType, occurredAt: now }, { status: 201 });
}

function weekdayInTimeZone(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(new Date(value));
}

function insertRecord(db: D1Database, values: {
  id: string; owner: string; recordType: string; parentId: string | null;
  title: string; payload: Record<string, unknown>; now: string;
}) {
  return db.prepare(
    `INSERT INTO lab_records
     (id, owner_id, record_type, parent_id, title, payload_json, committed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(values.id, values.owner, values.recordType, values.parentId, values.title,
    JSON.stringify(values.payload), values.now, values.now);
}

async function activeProfile(db: D1Database, owner: string, learnerDate: string): Promise<ProfileRow | null> {
  return db.prepare(
    `SELECT id, profile_version, timezone, practice_mode, expected_weekdays_json, effective_learner_date
     FROM lab_profiles WHERE owner_id = ? AND effective_learner_date <= ?
     ORDER BY effective_learner_date DESC, created_at DESC, id DESC LIMIT 1`,
  ).bind(owner, learnerDate).first<ProfileRow>();
}

async function duplicateRun(db: D1Database, owner: string, scheduledFor: string) {
  return db.prepare(
    `SELECT run.id, run.scheduled_for, run.input_checksum, run.evidence_record_id, run.created_at,
            assignment.id AS assignment_id, assignment.state,
            assignment.evidence_record_id AS assignment_record_id,
            assignment_record.record_type AS assignment_record_type,
            assignment_record.payload_json AS assignment_record_payload,
            EXISTS(SELECT 1 FROM lab_events event WHERE event.owner_id = run.owner_id
              AND event.record_id = run.evidence_record_id AND event.event_type = 'archive_preserved') AS archive_preserved
     FROM lab_automation_runs run
     JOIN lab_assignments assignment ON assignment.owner_id = run.owner_id AND assignment.automation_run_id = run.id
     JOIN lab_records assignment_record ON assignment_record.owner_id = assignment.owner_id
       AND assignment_record.id = assignment.evidence_record_id
     WHERE run.owner_id = ? AND run.operator_kind = 'daily_operator' AND run.scheduled_for = ? LIMIT 1`,
  ).bind(owner, scheduledFor).first<{
    id: string; scheduled_for: string; input_checksum: string; evidence_record_id: string; created_at: string;
    assignment_id: string; state: string; assignment_record_id: string; assignment_record_type: string;
    assignment_record_payload: string; archive_preserved: number;
  }>();
}

function replayResponse(run: NonNullable<Awaited<ReturnType<typeof duplicateRun>>>, inputChecksum: string) {
  if (run.input_checksum !== inputChecksum) {
    return Response.json({ error: "This scheduled Daily Operator run already exists with different evidence." }, { status: 409 });
  }
  const assignmentPayload = parseJson(run.assignment_record_payload);
  const practiceDayId = run.assignment_record_type === "practice_day" ? run.assignment_record_id : null;
  const dailyBriefId = practiceDayId
    ? text(assignmentPayload.dailyBriefId, 80)
    : run.assignment_record_type === "daily_brief" ? run.assignment_record_id : null;
  return Response.json({
    runId: run.id,
    runKey: dailyOperatorRunKey(run.scheduled_for),
    assignmentId: run.assignment_id,
    assignmentRecordId: dailyBriefId ?? run.assignment_record_id,
    practiceDayId,
    dailyBriefId,
    evidenceRecordId: run.evidence_record_id,
    state: run.state,
    archivePreserved: Boolean(run.archive_preserved),
    effectiveStatus: run.archive_preserved ? "archive_preserved" : "assignment_committed",
    committedAt: run.created_at,
    idempotent: true,
  });
}

async function referencesBelongToOwner(db: D1Database, owner: string, input: DailyRunInput): Promise<boolean> {
  const coachIds = [...new Set(input.coachRequestIds)];
  const feedbackIds = [...new Set(input.coachFeedbackIds)];
  const sourceEventIds = [...new Set(input.sourceStatusEventIds)];
  if (coachIds.length !== input.coachRequestIds.length || feedbackIds.length !== input.coachFeedbackIds.length || sourceEventIds.length !== input.sourceStatusEventIds.length) return false;
  const [queuedCoach, coach, feedback, events] = await Promise.all([
    db.prepare(
      `SELECT id FROM lab_records request WHERE owner_id = ? AND record_type = 'coach_request'
       AND NOT EXISTS (SELECT 1 FROM lab_records feedback WHERE feedback.owner_id = request.owner_id
         AND feedback.record_type = 'coach_feedback' AND feedback.parent_id = request.id)
       ORDER BY committed_at ASC, id ASC LIMIT 21`,
    ).bind(owner).all<{ id: string }>(),
    coachIds.length ? db.prepare(
      `SELECT COUNT(*) AS count FROM lab_records WHERE owner_id = ? AND record_type = 'coach_request'
       AND id IN (${coachIds.map(() => "?").join(",")})`,
    ).bind(owner, ...coachIds).first<{ count: number }>() : { count: 0 },
    feedbackIds.length ? db.prepare(
      `SELECT COUNT(*) AS count FROM lab_records feedback
       WHERE feedback.owner_id = ? AND feedback.record_type = 'coach_feedback'
       AND feedback.id IN (${feedbackIds.map(() => "?").join(",")})
       AND feedback.parent_id IN (${coachIds.map(() => "?").join(",")})`,
    ).bind(owner, ...feedbackIds, ...coachIds).first<{ count: number }>() : { count: 0 },
    sourceEventIds.length ? db.prepare(
      `SELECT COUNT(*) AS count FROM lab_events WHERE owner_id = ? AND event_type = 'source_status'
       AND id IN (${sourceEventIds.map(() => "?").join(",")})`,
    ).bind(owner, ...sourceEventIds).first<{ count: number }>() : { count: 0 },
  ]);
  const queuedCoachIds = (queuedCoach.results ?? []).map((row) => row.id);
  return queuedCoachIds.length === 0
    && Number(coach?.count ?? 0) === coachIds.length
    && Number(feedback?.count ?? 0) === feedbackIds.length
    && Number(events?.count ?? 0) === sourceEventIds.length;
}

async function noAccidentalPriorDuplicates(db: D1Database, owner: string, input: DailyRunInput): Promise<boolean> {
  if (input.assignment.state !== "ready") return true;
  const brief = input.assignment.brief as { readings: Array<Record<string, unknown>> };
  const prior = await db.prepare(
    `SELECT id, payload_json FROM lab_records WHERE owner_id = ? AND record_type = 'reading_record'
     ORDER BY committed_at DESC LIMIT 200`,
  ).bind(owner).all<{ id: string; payload_json: string }>();
  const rows = (prior.results ?? []).map((row) => ({ id: row.id, payload: parseJson(row.payload_json) }));
  const learnerDate = input.assignment.learnerDate;
  const priorBriefDates = [...new Set(rows
    .map((row) => text(row.payload.assignedDate, 20))
    .filter((date) => date && date < learnerDate))]
    .sort()
    .slice(-4);
  const rollingRows = rows.filter((row) => priorBriefDates.includes(text(row.payload.assignedDate, 20)));
  const publisherCounts = new Map<string, number>();
  const authorCounts = new Map<string, number>();
  for (const row of rollingRows) {
    const publisher = text(row.payload.publisher).toLowerCase();
    const author = text(row.payload.authorOrOrganization).toLowerCase();
    if (publisher) publisherCounts.set(publisher, (publisherCounts.get(publisher) ?? 0) + 1);
    if (author) authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
  }
  for (const reading of brief.readings) {
    const status = text(reading.deduplicationStatus);
    const related = text(reading.relatedReadingId);
    if ((status === "continuation" || status === "revisit") && !rows.some((row) => row.id === related)) return false;
    const url = text(reading.canonicalUrl).toLowerCase();
    const identifier = text(reading.persistentIdentifier).toLowerCase();
    const fingerprint = `${text(reading.title).toLowerCase()}|${text(reading.authorOrOrganization).toLowerCase()}`;
    const publisher = text(reading.publisher).toLowerCase();
    const author = text(reading.authorOrOrganization).toLowerCase();
    publisherCounts.set(publisher, (publisherCounts.get(publisher) ?? 0) + 1);
    authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
    if ((publisherCounts.get(publisher) ?? 0) > 3 || (authorCounts.get(author) ?? 0) > 2) return false;
    if (status !== "new") continue;
    const claimFingerprint = text(reading.underlyingEventOrClaimFingerprint, 300).toLowerCase();
    const recentClaimDuplicate = rows.some((row) => {
      const priorDate = text(row.payload.assignedDate, 20);
      const age = Math.floor((Date.parse(`${learnerDate}T00:00:00Z`) - Date.parse(`${priorDate}T00:00:00Z`)) / 86_400_000);
      return age >= 0 && age <= 7
        && text(row.payload.underlyingEventOrClaimFingerprint, 300).toLowerCase() === claimFingerprint;
    });
    if (status === "new" && recentClaimDuplicate) {
      const addsDistinctEvidence = text(reading.sourceRole) === "Evidence owner"
        || text(reading.viewpointRole) === "contrary"
        || /correction|retraction|update/i.test(text(reading.versionStatus));
      if (!addsDistinctEvidence) return false;
    }
    if (rows.some((row) => {
      const priorUrl = text(row.payload.canonicalUrl).toLowerCase();
      const priorIdentifier = text(row.payload.persistentIdentifier).toLowerCase();
      const priorFingerprint = `${text(row.payload.title).toLowerCase()}|${text(row.payload.authorOrOrganization).toLowerCase()}`;
      return priorUrl === url || (identifier !== "not stated" && priorIdentifier === identifier) || priorFingerprint === fingerprint;
    })) return false;
  }
  const weeklyRows = [...rollingRows.map((row) => row.payload), ...brief.readings];
  if (priorBriefDates.length >= 4 && !weeklyRows.some((reading) => text(reading.viewpointRole) === "contrary")) return false;
  return true;
}

export async function GET(request: Request) {
  const db = await ensureLabSchema();
  const owner = await registeredAutomationOwner(db, request, "daily_operator");
  if (!owner) return Response.json({ error: "Valid owner-bound Daily Operator authorization is required." }, { status: 401 });
  const profiles = await db.prepare(
    `SELECT id, profile_version, timezone, practice_mode, expected_weekdays_json, effective_learner_date
     FROM lab_profiles WHERE owner_id = ? ORDER BY effective_learner_date DESC LIMIT 20`,
  ).bind(owner).all<ProfileRow>();
  const now = currentInstant();
  const profile = (profiles.results ?? []).find((candidate) => candidate.effective_learner_date <= dateInTimeZone(now, candidate.timezone));
  if (!profile) return Response.json({ error: "No active Lab Profile exists for this registered owner." }, { status: 409 });
  const learnerDate = dateInTimeZone(now, profile.timezone);
  const [assignment, recent, coachQueue] = await Promise.all([
    db.prepare(`SELECT id, state, evidence_record_id, created_at FROM lab_assignments WHERE owner_id = ? AND learner_date = ? LIMIT 1`)
      .bind(owner, learnerDate).first<{ id: string; state: string; evidence_record_id: string; created_at: string }>(),
    db.prepare(`SELECT id, payload_json, committed_at FROM lab_records WHERE owner_id = ? AND record_type = 'reading_record' ORDER BY committed_at DESC LIMIT 100`)
      .bind(owner).all<{ id: string; payload_json: string; committed_at: string }>(),
    db.prepare(
      `SELECT id FROM lab_records request WHERE owner_id = ? AND record_type = 'coach_request'
       AND NOT EXISTS (SELECT 1 FROM lab_records feedback WHERE feedback.owner_id = request.owner_id
         AND feedback.record_type = 'coach_feedback' AND feedback.parent_id = request.id)
       ORDER BY committed_at ASC LIMIT 20`,
    ).bind(owner).all<{ id: string }>(),
  ]);
  return Response.json({
    learnerDate,
    profile: {
      version: profile.profile_version,
      timezone: profile.timezone,
      practiceMode: profile.practice_mode,
      expectedWeekdays: parseJson(`{"value":${profile.expected_weekdays_json}}`).value ?? [],
    },
    currentAssignment: assignment ?? null,
    recentSourceIdentities: (recent.results ?? []).map((row) => {
      const payload = parseJson(row.payload_json);
      return {
        recordId: row.id,
        canonicalUrl: text(payload.canonicalUrl),
        persistentIdentifier: text(payload.persistentIdentifier),
        title: text(payload.title),
        authorOrOrganization: text(payload.authorOrOrganization),
        committedAt: row.committed_at,
      };
    }),
    queuedCoachRequestIds: (coachQueue.results ?? []).map((row) => row.id),
  });
}

export async function POST(request: Request) {
  const db = await ensureLabSchema();
  const owner = await registeredAutomationOwner(db, request, "daily_operator");
  if (!owner) return Response.json({ error: "Valid owner-bound Daily Operator authorization is required." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (isObject(body) && body.operation === "append_event") {
    return appendOperatorEvent(db, owner, body);
  }
  const invalid = validateDailyRun(body, currentInstant());
  if (invalid) return Response.json({ error: invalid }, { status: 400 });
  const input = body as DailyRunInput;
  const inputChecksum = await dailyRunChecksum(input);
  const existing = await duplicateRun(db, owner, input.scheduledFor);
  if (existing) return replayResponse(existing, inputChecksum);

  const profile = await activeProfile(db, owner, input.assignment.learnerDate);
  if (!profile) return Response.json({ error: "The referenced active Lab Profile was not found." }, { status: 404 });
  if (profile.profile_version !== input.profileVersion) {
    return Response.json({ error: "The requested profile version is stale for this learner date; use the latest effective Lab Profile." }, { status: 409 });
  }
  if (profile.timezone !== input.assignment.timezone
    || dateInTimeZone(new Date(input.scheduledFor), profile.timezone) !== input.assignment.learnerDate) {
    return Response.json({ error: "The assignment learner date and timezone must match its active Lab Profile and scheduled slot." }, { status: 400 });
  }
  const expectedWeekdays = JSON.parse(profile.expected_weekdays_json) as string[];
  const expectedToday = expectedWeekdays.includes(weekdayInTimeZone(input.scheduledFor, profile.timezone));
  if (input.assignment.state === "intentionally_displaced" ? expectedToday : !expectedToday) {
    return Response.json({ error: "The assignment outcome conflicts with the profile's expected practice dates." }, { status: 400 });
  }
  if (!await referencesBelongToOwner(db, owner, input)) {
    return Response.json({ error: "Referenced supporting work was not found in this private owner record." }, { status: 404 });
  }
  if (!await noAccidentalPriorDuplicates(db, owner, input)) {
    return Response.json({ error: "A reading duplicates prior owner evidence or lacks a valid continuation or revisit link." }, { status: 409 });
  }

  const now = currentInstant().toISOString();
  const runId = crypto.randomUUID();
  const runRecordId = crypto.randomUUID();
  const assignmentId = crypto.randomUUID();
  const assignmentRecordId = crypto.randomUUID();
  const assignmentCommittedEventId = crypto.randomUUID();
  const runKey = dailyOperatorRunKey(input.scheduledFor);
  const assignmentChecksum = await sha256Hex(canonicalJson(input.assignment));
  const state = input.assignment.state;
  const statements: D1PreparedStatement[] = [];
  let readingIds: string[] = [];
  let assignmentPayload: Record<string, unknown>;
  let epochId: string | null = null;
  let practiceDayId: string | null = null;
  let dailyBriefId: string | null = null;
  let assignmentEvidenceRecordId = assignmentRecordId;
  const curriculum = input.curriculum as CourseFirstCurriculumInput | undefined;

  if (curriculum) {
    const priorEpochs = await db.prepare(
      `SELECT id, payload_json FROM lab_records WHERE owner_id = ? AND record_type = 'curriculum_epoch'
       ORDER BY committed_at ASC, id ASC LIMIT 2`,
    ).bind(owner).all<{ id: string; payload_json: string }>();
    const epochs = priorEpochs.results ?? [];
    const matchingEpoch = epochs.find((row) => text(parseJson(row.payload_json).epochKey, 120) === curriculum.epoch.epochKey);
    if (epochs.length > 0 && !matchingEpoch) {
      return Response.json({ error: "A different immutable Curriculum Epoch already exists for this private owner." }, { status: 409 });
    }
    if (matchingEpoch && canonicalJson(parseJson(matchingEpoch.payload_json)) !== canonicalJson(curriculum.epoch)) {
      return Response.json({ error: "This Curriculum Epoch key already exists with different immutable evidence." }, { status: 409 });
    }
    epochId = matchingEpoch?.id ?? crypto.randomUUID();
    practiceDayId = crypto.randomUUID();
    dailyBriefId = assignmentRecordId;
    assignmentEvidenceRecordId = practiceDayId;
    if (!matchingEpoch) {
      statements.push(insertRecord(db, {
        id: epochId, owner, recordType: "curriculum_epoch", parentId: null,
        title: `Course-first curriculum — ${curriculum.epoch.startedLearnerDate}`,
        payload: curriculum.epoch, now,
      }));
      const unfinished = await db.prepare(
        `SELECT conversation.id, latest.sequence, latest.draft_json
         FROM lab_conversations conversation
         JOIN lab_conversation_turns latest ON latest.conversation_id = conversation.id
           AND latest.owner_id = conversation.owner_id
           AND latest.sequence = (
             SELECT MAX(candidate.sequence) FROM lab_conversation_turns candidate
             WHERE candidate.conversation_id = conversation.id AND candidate.owner_id = conversation.owner_id
           )
         WHERE conversation.owner_id = ?
           AND NOT EXISTS (
             SELECT 1 FROM lab_conversation_turns terminal
             WHERE terminal.conversation_id = conversation.id AND terminal.owner_id = conversation.owner_id
               AND terminal.role = 'system'
               AND json_extract(terminal.metadata_json, '$.kind') IN ('committed', 'abandoned')
           )
         ORDER BY conversation.created_at ASC, conversation.id ASC`,
      ).bind(owner).all<{ id: string; sequence: number; draft_json: string }>();
      for (const conversation of unfinished.results ?? []) {
        statements.push(db.prepare(
          `INSERT INTO lab_conversation_turns
           (id, conversation_id, owner_id, sequence, role, visible_text, draft_json, metadata_json, created_at)
           VALUES (?, ?, ?, ?, 'system', ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(), conversation.id, owner, Number(conversation.sequence) + 1,
          "Conversation archived outside the course-first progression; every original turn remains preserved.",
          conversation.draft_json,
          JSON.stringify({
            kind: "abandoned",
            phase: "abandoned",
            archiveReason: "pre_curriculum",
            curriculumEpochKey: curriculum.epoch.epochKey,
          }),
          now,
        ));
      }
    }
  }

  if (state === "ready") {
    const brief = input.assignment.brief as Record<string, unknown> & { readings: Array<Record<string, unknown>> };
    readingIds = brief.readings.map(() => crypto.randomUUID());
    const totalMinutes = brief.readings.reduce((sum, reading) => sum + Number(reading.estimatedMinutes), 0);
    assignmentPayload = {
      briefVersion: brief.briefVersion,
      assignedDate: input.assignment.learnerDate,
      timezone: input.assignment.timezone,
      carryForward: brief.carryForward,
      totalMinutes,
      readingIds,
      prePublicationGatesPassed: 12,
      immutableBeforeDelivery: true,
      ...(practiceDayId && epochId ? { practiceDayId, curriculumEpochId: epochId } : {}),
    };
    if (curriculum && practiceDayId && epochId) {
      statements.push(insertRecord(db, {
        id: practiceDayId, owner, recordType: "practice_day", parentId: epochId,
        title: `Practice Day ${curriculum.practiceDay.curriculumDay} — ${input.assignment.learnerDate}`,
        payload: {
          ...curriculum.practiceDay,
          curriculumEpochId: epochId,
          dailyBriefId: assignmentRecordId,
          assignedDate: input.assignment.learnerDate,
          timezone: input.assignment.timezone,
        },
        now,
      }));
    }
    statements.push(insertRecord(db, {
      id: assignmentRecordId, owner, recordType: "daily_brief", parentId: practiceDayId,
      title: `Daily Brief — ${input.assignment.learnerDate}`, payload: assignmentPayload, now,
    }));
    for (let index = 0; index < brief.readings.length; index += 1) {
      const reading = brief.readings[index];
      statements.push(insertRecord(db, {
        id: readingIds[index], owner, recordType: "reading_record", parentId: assignmentRecordId,
        title: text(reading.title, 180),
        payload: {
          ...reading,
          assignedDate: input.assignment.learnerDate,
          assignedTimezone: input.assignment.timezone,
          dailyBriefId: assignmentRecordId,
          ...(practiceDayId && epochId ? { practiceDayId, curriculumEpochId: epochId } : {}),
        },
        now,
      }));
    }
  } else {
    assignmentPayload = {
      assignedDate: input.assignment.learnerDate,
      timezone: input.assignment.timezone,
      state,
      reason: input.assignment.reason,
      nextAction: input.assignment.nextAction,
      noCatchUpDebt: true,
    };
    statements.push(insertRecord(db, {
      id: assignmentRecordId, owner, recordType: state, parentId: null,
      title: `${state === "brief_unavailable" ? "Brief Unavailable" : "Practice Intentionally Displaced"} — ${input.assignment.learnerDate}`,
      payload: assignmentPayload, now,
    }));
  }
  statements.unshift(insertRecord(db, {
    id: runRecordId, owner, recordType: "automation_run", parentId: null,
    title: `Daily Operator — ${input.assignment.learnerDate}`,
    payload: {
      runKey, operatorKind: "daily_operator", scheduledFor: input.scheduledFor,
      profileVersion: input.profileVersion, inputChecksum, assignmentState: state,
      coachRequestIds: input.coachRequestIds, coachFeedbackIds: input.coachFeedbackIds,
      sourceStatusEventIds: input.sourceStatusEventIds,
      notificationIntent: input.notificationIntent, effectiveStatus: "assignment_committed",
    }, now,
  }));
  statements.push(
    db.prepare(
      `INSERT INTO lab_events
       (id, owner_id, record_id, event_type, event_json, occurred_at, created_at)
       VALUES (?, ?, ?, 'assignment_committed', ?, ?, ?)`,
    ).bind(assignmentCommittedEventId, owner, runRecordId, JSON.stringify({
      runKey,
      assignmentRecordId,
      assignmentEvidenceRecordId,
      practiceDayId,
      assignmentState: state,
      learnerDate: input.assignment.learnerDate,
      originalPreserved: true,
    }), now, now),
    db.prepare(
      `INSERT INTO lab_automation_runs
       (id, owner_id, operator_kind, scheduled_for, profile_id, input_checksum, evidence_record_id, notification_intent, created_at)
       VALUES (?, ?, 'daily_operator', ?, ?, ?, ?, ?, ?)`,
    ).bind(runId, owner, input.scheduledFor, profile.id, inputChecksum, runRecordId, input.notificationIntent, now),
    db.prepare(
      `INSERT INTO lab_assignments
       (id, owner_id, learner_date, profile_id, automation_run_id, evidence_record_id, state, payload_checksum, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(assignmentId, owner, input.assignment.learnerDate, profile.id, runId, assignmentEvidenceRecordId, state, assignmentChecksum, now),
  );
  try {
    await db.batch(statements);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      const raced = await duplicateRun(db, owner, input.scheduledFor);
      if (raced) return replayResponse(raced, inputChecksum);
      return Response.json({ error: "This learner date already has a different immutable Daily Assignment." }, { status: 409 });
    }
    throw error;
  }
  return Response.json({
    runId, runKey, assignmentId, evidenceRecordId: runRecordId, assignmentRecordId,
    epochId, practiceDayId, dailyBriefId,
    readingIds, state, archivePreserved: false, effectiveStatus: "assignment_committed",
    committedAt: now, idempotent: false,
  }, { status: 201 });
}
