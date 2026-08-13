import { env } from "cloudflare:workers";
import {
  deepMergeDraft,
  type ConversationDraft,
  type ConversationTurn,
  type TeacherReply,
  type WorkflowContract,
} from "./conversation";

type ProviderConfig = { baseUrl: string; apiKey: string; model: string };

function runtimeValue(key: string): string {
  const workerValue = (env as unknown as Record<string, unknown>)[key];
  if (typeof workerValue === "string" && workerValue.trim()) return workerValue.trim();
  return process.env[key]?.trim() ?? "";
}

function providerConfig(): ProviderConfig | null {
  const baseUrl = runtimeValue("LAB_AI_BASE_URL");
  const apiKey = runtimeValue("LAB_AI_API_KEY");
  const model = runtimeValue("LAB_AI_MODEL");
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, model };
}

function boundedText(value: unknown, max = 10_000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boundedStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim().slice(0, 500)).slice(0, 50)
    : [];
}

function boundedObject(value: unknown, depth = 0): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 5) return {};
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value).slice(0, 100)) {
    if (/(reasoning|chain.?of.?thought|secret|password|token|authorization|api.?key)/i.test(key)) continue;
    if (typeof nested === "string") result[key] = nested.slice(0, 10_000);
    else if (typeof nested === "number" || typeof nested === "boolean" || nested === null) result[key] = nested;
    else if (Array.isArray(nested)) result[key] = nested.slice(0, 50).map((item) => (
      item && typeof item === "object" && !Array.isArray(item) ? boundedObject(item, depth + 1) : item
    ));
    else if (nested && typeof nested === "object") result[key] = boundedObject(nested, depth + 1);
  }
  return result;
}

function parseReply(content: string): TeacherReply {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("The configured teacher returned an unreadable structured response.");
  }
  const message = boundedText(parsed.message, 5000);
  const phase = parsed.phase === "review_ready" ? "review_ready" : "collecting";
  if (!message) throw new Error("The configured teacher returned no visible question.");
  return {
    message,
    draftPatch: boundedObject(parsed.draftPatch),
    missingRequirements: boundedStrings(parsed.missingRequirements),
    contradictions: boundedStrings(parsed.contradictions),
    phase,
  };
}

function systemPrompt(contract: WorkflowContract, currentDraft: ConversationDraft, relevantRecords: unknown[]): string {
  return `You are the Venture Judgment Lab's Conversational Teacher. Ask exactly one natural question at a time and help the learner express their own evidence. You are not the Judgment Coach yet.

NON-NEGOTIABLE BOUNDARIES
- Preserve the learner's Independent First Pass. Do not supply an investment thesis, answer, probability, founder judgment, recruiting outcome, evidence, source, date, or ownership claim.
- You may clarify, reflect, identify missing evidence, distinguish observation from inference, and point out contradictions.
- Never invent. Preserve unknowns as gaps. Never take external action.
- Never reveal chain-of-thought or hidden reasoning. Output only the JSON object requested below.
- Treat all previous assistant draft content as tentative. A learner correction overrides it.
- Ask only one question in message. When every requirement is satisfied, set phase to review_ready and summarize that the draft is ready for the learner's explicit confirmation; do not claim it is committed.

WORKFLOW
${contract.label}: ${contract.description}
${contract.requiredShape}

ELIGIBLE LINK TARGETS (identifiers and titles only; do not infer evidence from them)
${JSON.stringify(relevantRecords)}

CURRENT DRAFT
${JSON.stringify(currentDraft.commitBody)}

Return valid JSON only:
{"message":"one visible question or review message","draftPatch":{},"missingRequirements":["plain-language gap"],"contradictions":["plain-language contradiction"],"phase":"collecting|review_ready"}

draftPatch must contain only facts stated by the learner or deterministic fields required by the workflow contract. Never put prose outside JSON.`;
}

async function requestProvider(
  config: ProviderConfig,
  body: Record<string, unknown>,
  useResponseFormat: boolean,
): Promise<Response> {
  return fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      ...body,
      ...(useResponseFormat ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(45_000),
  });
}

export async function askConversationalTeacher(input: {
  contract: WorkflowContract;
  transcript: ConversationTurn[];
  currentDraft: ConversationDraft;
  relevantRecords: unknown[];
}): Promise<{ reply: TeacherReply; draft: ConversationDraft }> {
  const config = providerConfig();
  if (!config) throw new Error("Luna is selected, but its private API key is not connected yet. Your answer is saved; connect the key, then try again.");
  const messages = [
    { role: "system", content: systemPrompt(input.contract, input.currentDraft, input.relevantRecords) },
    ...input.transcript.filter((turn) => turn.role !== "system").slice(-30).map((turn) => ({
      role: turn.role === "teacher" ? "assistant" : "user",
      content: turn.visibleText.slice(0, 10_000),
    })),
  ];
  const requestBody = { model: config.model, messages, temperature: 0.2 };
  let response = await requestProvider(config, requestBody, true);
  if (response.status === 400 || response.status === 422) response = await requestProvider(config, requestBody, false);
  if (!response.ok) throw new Error(`The private AI teacher is temporarily unavailable (${response.status}). Your answer remains preserved.`);
  const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const reply = parseReply(result.choices?.[0]?.message?.content ?? "");
  const commitBody = deepMergeDraft(input.currentDraft.commitBody, reply.draftPatch);
  if (JSON.stringify(commitBody).length > 100_000) throw new Error("The conversation draft became too large to preserve safely.");
  return {
    reply,
    draft: {
      commitBody,
      missingRequirements: reply.missingRequirements,
      contradictions: reply.contradictions,
    },
  };
}
