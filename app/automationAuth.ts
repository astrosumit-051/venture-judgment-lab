import { env } from "cloudflare:workers";

const developmentToken = "local-opportunity-monitor-verification-token";

function configuredToken(): string {
  const workerValue = typeof env.LAB_AUTOMATION_TOKEN === "string" ? env.LAB_AUTOMATION_TOKEN.trim() : "";
  const processValue = typeof process.env.LAB_AUTOMATION_TOKEN === "string" ? process.env.LAB_AUTOMATION_TOKEN.trim() : "";
  const value = workerValue || processValue;
  if (value) return value;
  return process.env.NODE_ENV === "development" ? developmentToken : "";
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function configuredAutomationFingerprint(): Promise<string | null> {
  const token = configuredToken();
  if (!token || (process.env.NODE_ENV !== "development" && token.length < 32)) return null;
  return sha256(token);
}

export async function verifyAutomationBearer(request: Request): Promise<{ fingerprint: string } | null> {
  const token = configuredToken();
  if (!token || (process.env.NODE_ENV !== "development" && token.length < 32)) return null;
  const authorization = request.headers.get("authorization") ?? "";
  const submitted = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!submitted || !constantTimeEqual(submitted, token)) return null;
  return { fingerprint: await sha256(token) };
}
