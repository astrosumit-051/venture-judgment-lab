import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [labApp, labWorkspace, advancedForms, teacher, conversationHistory, provider, runtime] = await Promise.all([
  readFile(new URL("../app/LabApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/LabWorkspace.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/AdvancedFormsView.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/ConversationTeacher.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/ConversationHistory.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/teacherProvider.ts", import.meta.url), "utf8"),
  readFile(new URL("../db/runtime.ts", import.meta.url), "utf8"),
]);
const historyRoute = await readFile(new URL("../app/api/lab/history/route.ts", import.meta.url), "utf8");
const commitRoute = await readFile(new URL("../app/api/lab/conversations/[conversationId]/commit/route.ts", import.meta.url), "utf8");
const labSurface = `${labApp}\n${labWorkspace}\n${advancedForms}`;

test("Today makes conversation primary while every structured workflow remains available", () => {
  assert.match(labSurface, /teacher-launcher|<TeacherLauncher/);
  for (const destination of ["Today", "Work", "Record", "More"]) {
    assert.match(labSurface, new RegExp(`label: "${destination}"`));
  }
  assert.doesNotMatch(labApp, /label: "Snapshot"|label: "Forecast"|label: "Diligence"/);
  assert.match(labSurface, /More/);
  assert.match(labSurface, /advanced|structured/i);
});

test("the learner sees one-question conversation, structured review, and explicit confirmation", () => {
  assert.match(teacher, /Your answer/);
  assert.match(teacher, /Here’s what I heard/);
  assert.match(teacher, /Edit structured draft/);
  assert.match(teacher, /Confirm and preserve/);
  assert.match(teacher, /What are you working through/);
  assert.match(teacher, /Using/);
  assert.doesNotMatch(teacher, /Choose a goal/);
  assert.doesNotMatch(teacher, /goal-picker/);
  assert.doesNotMatch(teacher, /workflow-picker/);
  assert.match(teacher, /Talk/);
  assert.match(teacher, /Review/);
  assert.match(teacher, /Preserve/);
  assert.match(teacher, /that isn’t what I meant/);
  assert.match(teacher, /Nothing below is permanent yet/);
  assert.match(teacher, /!\["operation", "recordType"\]\.includes/);
  assert.match(conversationHistory, /Full visible transcripts/);
  assert.match(conversationHistory, /Hidden model reasoning is never stored/);
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
  assert.match(runtime, /lab_conversation_commits/);
  assert.match(commitRoute, /reserveConversationCommit/);
});

test("History only nests canonical Reading Records", () => {
  assert.match(historyRoute, /record_type = 'reading_record'/);
});
