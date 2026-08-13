function assertUnicodeScalarString(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError("Canonical JSON strings must contain only Unicode scalar values.");
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError("Canonical JSON strings must contain only Unicode scalar values.");
    }
  }
}

function canonicalize(value: unknown, ancestors: Set<object>): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON numbers must be finite.");
    return JSON.stringify(value);
  }
  if (typeof value === "string") { assertUnicodeScalarString(value); return JSON.stringify(value); }
  if (!value || typeof value !== "object") throw new TypeError("Canonical JSON accepts only JSON values.");
  if (ancestors.has(value)) throw new TypeError("Canonical JSON cannot contain cycles.");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item, ancestors)).join(",")}]`;
    const object = value as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(object);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("Canonical JSON objects must be plain objects.");
    return `{${Object.keys(object).sort().map((key) => {
      assertUnicodeScalarString(key);
      return `${JSON.stringify(key)}:${canonicalize(object[key], ancestors)}`;
    }).join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalJson(value: unknown): string { return canonicalize(value, new Set()); }

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
