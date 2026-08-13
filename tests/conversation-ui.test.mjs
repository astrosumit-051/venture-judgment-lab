import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [labApp, labWorkspace, teacher, provider, runtime] = await Promise.all([
  readFile(new URL("../app/LabApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/LabWorkspace.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/ConversationTeacher.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/teacherProvider.ts", import.meta.url), "utf8"),
  readFile(new URL("../db/runtime.ts", import.meta.url), "utf8"),
]);
const labSurface = `${labApp}\n${labWorkspace}`;

test("Today makes conversation primary while every structured workflow remains available", () => {
  assert.match(labSurface, /teacher-launcher|<TeacherLauncher/);
  assert.match(labSurface, /label: "Teacher"/);
  assert.match(labSurface, /label: "Sourcing"/);
  assert.match(labSurface, /TeacherEntryStrip/);
  assert.match(labSurface, /advancedEntryVisible/);
});

test("the learner sees one-question conversation, structured review, and explicit confirmation", () => {
  assert.match(teacher, /Your answer/);
  assert.match(teacher, /Here’s what I heard/);
  assert.match(teacher, /Edit structured draft/);
  assert.match(teacher, /Confirm and preserve/);
  assert.match(teacher, /Choose a goal/);
  assert.match(teacher, /Do today’s work/);
  assert.match(teacher, /Think through a company/);
  assert.match(teacher, /Talk/);
  assert.match(teacher, /Review/);
  assert.match(teacher, /Preserve/);
  assert.match(teacher, /that isn’t what I meant/);
  assert.match(teacher, /Nothing below is permanent yet/);
  assert.match(teacher, /!\["operation", "recordType"\]\.includes/);
  assert.match(teacher, /Full visible transcripts/);
  assert.match(teacher, /Hidden model reasoning is never stored/);
});

test("the provider boundary is server-only, bounded, and prohibits pre-commit answers", () => {
  assert.match(provider, /LAB_AI_BASE_URL/);
  assert.match(provider, /LAB_AI_API_KEY/);
  assert.match(provider, /LAB_AI_MODEL/);
  assert.match(provider, /Do not supply an investment thesis/);
  assert.match(provider, /Never invent/);
  assert.match(provider, /Never reveal chain-of-thought/);
  assert.doesNotMatch(teacher, /LAB_AI_API_KEY/);
});

test("D1 initializes append-only conversation storage and sequence indexes", () => {
  assert.match(runtime, /CREATE TABLE IF NOT EXISTS lab_conversations/);
  assert.match(runtime, /CREATE TABLE IF NOT EXISTS lab_conversation_turns/);
  assert.match(runtime, /CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_conversation_turns_sequence/);
  assert.match(runtime, /PRAGMA optimize/);
});
