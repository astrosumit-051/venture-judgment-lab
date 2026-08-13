import { constants } from "node:fs";
import { access, link, mkdir, open, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRIVATE_ARCHIVE_SECTIONS,
  canonicalizeJson,
  sha256Hex,
} from "../app/privateArchive.ts";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
export const PRIVATE_ARCHIVE_ROOT = join(repositoryRoot, ".private", "venture-judgment-lab", "archive");
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

function archiveFilename(runKey) {
  if (!/^[a-z][a-z0-9-]{0,63}\|\d{4}-\d{2}-\d{2}$/.test(runKey)) {
    throw new TypeError("The export has an invalid canonical run key.");
  }
  return `${runKey.replace("|", "--")}.json`;
}

async function validateBundle(bundle) {
  if (!bundle || typeof bundle !== "object" || !bundle.payload || typeof bundle.payloadDigest !== "string") {
    throw new TypeError("The private export response is not a bundle.");
  }
  const canonicalPayload = canonicalizeJson(bundle.payload);
  if (await sha256Hex(canonicalPayload) !== bundle.payloadDigest) {
    throw new Error("The private export payload digest does not verify.");
  }
  for (const section of PRIVATE_ARCHIVE_SECTIONS) {
    const rows = bundle.payload.sections?.[section];
    if (!Array.isArray(rows) || bundle.payload.counts?.[section] !== rows.length) {
      throw new Error(`The private export ${section} count does not verify.`);
    }
    if (await sha256Hex(canonicalizeJson(rows)) !== bundle.payload.sectionChecksums?.[section]) {
      throw new Error(`The private export ${section} checksum does not verify.`);
    }
  }
  return canonicalizeJson({ payload: bundle.payload, payloadDigest: bundle.payloadDigest });
}

async function syncDirectory(path) {
  const handle = await open(path, constants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function publishPrivateArchive(bundle, archiveRoot = PRIVATE_ARCHIVE_ROOT) {
  const bytes = await validateBundle(bundle);
  await mkdir(archiveRoot, { recursive: true, mode: 0o700 });
  const destination = join(archiveRoot, archiveFilename(bundle.payload.cursor.runKey));
  try {
    await access(destination, constants.F_OK);
    const existing = JSON.parse(await readFile(destination, "utf8"));
    if (existing.payloadDigest !== bundle.payloadDigest || await validateBundle(existing) !== bytes) {
      throw new Error("The archive target already exists with a different digest.");
    }
    return { path: destination, idempotent: true };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const temporary = join(archiveRoot, `.${archiveFilename(bundle.payload.cursor.runKey)}.${crypto.randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${bytes}\n`, { encoding: "utf8" });
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, destination);
    await syncDirectory(archiveRoot);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = JSON.parse(await readFile(destination, "utf8"));
    if (existing.payloadDigest !== bundle.payloadDigest || await validateBundle(existing) !== bytes) {
      throw new Error("The archive target already exists with a different digest.");
    }
    return { path: destination, idempotent: true };
  } finally {
    await unlink(temporary).catch(() => {});
  }
  return { path: destination, idempotent: false };
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) throw new Error("The private export response exceeds its byte bound.");
  const raw = await response.text();
  if (Buffer.byteLength(raw) > MAX_RESPONSE_BYTES) throw new Error("The private export response exceeds its byte bound.");
  let body;
  try { body = JSON.parse(raw); } catch { throw new Error(`Private export returned invalid JSON (${response.status}).`); }
  if (!response.ok) throw new Error(body?.error || `Private export failed (${response.status}).`);
  return body;
}

export async function syncPrivateLearningRecord({ baseUrl, runKey, token, archiveRoot = PRIVATE_ARCHIVE_ROOT }) {
  if (!token) throw new Error("LAB_AUTOMATION_TOKEN is required.");
  const endpoint = new URL("/api/automation/export", baseUrl);
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
    throw new Error("Private export requires HTTPS outside localhost.");
  }
  endpoint.searchParams.set("runKey", runKey);
  const headers = { authorization: `Bearer ${token}` };
  const response = await requestJson(endpoint, { headers });
  const bundle = { payload: response.payload, payloadDigest: response.payloadDigest };
  const failureEndpoint = new URL("/api/automation/export", baseUrl);
  try {
    const publication = await publishPrivateArchive(bundle, archiveRoot);
    const acknowledgement = await requestJson(failureEndpoint, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({
        runKey,
        cursor: bundle.payload.cursor,
        counts: bundle.payload.counts,
        digest: bundle.payloadDigest,
      }),
    });
    return { ...publication, acknowledgement };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Private archive reconciliation failed.";
    const failureKind = /digest|checksum|count|verify/i.test(message)
      ? "verification_failed"
      : /acknowledg|cursor|export/i.test(message)
        ? "acknowledgement_failed"
        : "publication_failed";
    await requestJson(failureEndpoint, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({
        operation: "archive_failed",
        runKey,
        failureKind,
        summary: message,
        nextAction: "Repair the bounded archive failure and replay the same immutable run export.",
      }),
    }).catch(() => {});
    throw error;
  }
}

async function main() {
  const baseUrl = argument("--base-url") || process.env.LAB_PRIVATE_SITE_URL || "";
  const runKey = argument("--run-key");
  if (!baseUrl || !runKey) throw new Error("Usage: node scripts/sync-private-learning-record.mjs --base-url <private-site> --run-key <run-key>");
  const result = await syncPrivateLearningRecord({ baseUrl, runKey, token: process.env.LAB_AUTOMATION_TOKEN || "" });
  process.stdout.write(`${result.acknowledgement.idempotent ? "Reconciled" : "Preserved"} ${runKey}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Private archive sync failed."}\n`);
    process.exitCode = 1;
  });
}
