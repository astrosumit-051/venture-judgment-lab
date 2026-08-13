import { getChatGPTUser } from "./chatgpt-auth";
import { env } from "cloudflare:workers";

function runtimeValue(key: string): string {
  const workerValue = (env as unknown as Record<string, unknown>)[key];
  if (typeof workerValue === "string" && workerValue.trim()) return workerValue.trim();
  return process.env[key]?.trim() ?? "";
}

export function isLocalLabRuntime(): boolean {
  return runtimeValue("LAB_LOCAL_MODE") === "1";
}

export async function currentLabOwnerId(): Promise<string | null> {
  if (isLocalLabRuntime() && runtimeValue("LAB_API_SMOKE") !== "1") {
    return runtimeValue("LAB_LOCAL_OWNER_ID") || "local-learner";
  }
  const user = await getChatGPTUser();
  if (user) return user.userId;
  return isLocalLabRuntime() || process.env.NODE_ENV === "development"
    ? runtimeValue("LAB_LOCAL_OWNER_ID") || "local-learner"
    : null;
}
