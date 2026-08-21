import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

async function availablePort() {
  if (process.env.LAB_API_SMOKE_PORT) return process.env.LAB_API_SMOKE_PORT;
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  const port = typeof address === "object" && address ? String(address.port) : null;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  if (!port) throw new Error("Could not reserve an isolated API smoke port.");
  return port;
}

const port = await availablePort();
const aiPort = await availablePort();
const baseUrl = `http://localhost:${port}`;
const persistencePath = await mkdtemp(join(tmpdir(), "venture-judgment-lab-api-smoke-"));
const smokeClock = new Date();
smokeClock.setUTCMinutes(0, 0, 0);
while (true) {
  const eastern = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(smokeClock).map((part) => [part.type, part.value]));
  if (!new Set(["Sat", "Sun"]).has(eastern.weekday) && eastern.hour === "08") break;
  smokeClock.setTime(smokeClock.getTime() - 3_600_000);
}
const runEnv = {
  ...process.env,
  LAB_API_SMOKE: "1",
  LAB_API_SMOKE_NOW: smokeClock.toISOString(),
  LAB_AUTOMATION_TOKEN: `local-opportunity-monitor-verification-${Date.now()}`,
  LAB_SMOKE_OWNER_ID: `verification-owner-${Date.now()}`,
  LAB_TEST_PERSIST_PATH: persistencePath,
  LAB_AI_BASE_URL: `http://127.0.0.1:${aiPort}/v1`,
  LAB_AI_API_KEY: "conversation-smoke-secret-never-returned",
  LAB_AI_MODEL: "conversation-smoke-model",
};
const aiServer = createHttpServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
    response.writeHead(404).end();
    return;
  }
  let submitted = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => { submitted += chunk; });
  request.on("end", () => {
    if (submitted.includes("FORCE_PROVIDER_FAILURE")) {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Synthetic provider outage" }));
      return;
    }
    const input = JSON.parse(submitted);
    assert.equal(input.model, "conversation-smoke-model");
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      message: "I heard a complete causal chain. Review it carefully before you choose whether to preserve it.",
      draftPatch: {
        title: "Second-Order Map — AI infrastructure demand",
        payload: {
          trigger: "AI infrastructure demand increases rapidly.",
          firstOrder: "Specialized compute capacity tightens.",
          secondOrder: "Buyers redesign workloads around constrained supply.",
          thirdOrder: "Software that manages heterogeneous capacity gains bargaining power.",
          bottlenecks: "Power, networking, and advanced packaging.",
          incentives: "Suppliers prioritize high-margin committed demand.",
          suppliers: "Chip, power, networking, and data-center operators.",
          customers: "Model developers and enterprise infrastructure teams.",
          substitutes: "Smaller models, delayed workloads, and alternative accelerators.",
          regulation: "Power interconnection and semiconductor controls may constrain supply.",
          adjacentEffects: "Capacity planning becomes a software procurement decision.",
          disconfirmingEvidence: "Utilization or model-efficiency gains could loosen demand faster than supply tightens.",
          timezone: "America/Chicago"
        }
      },
      missingRequirements: [],
      contradictions: [],
      phase: "review_ready"
    }) } }] }));
  });
});
await new Promise((resolve, reject) => aiServer.listen(aiPort, "127.0.0.1", (error) => error ? reject(error) : resolve()));
let serverOutput = "";
function startLabServer() {
  const child = spawn("npm", ["run", "dev", "--", "--port", port], {
    cwd: new URL("..", import.meta.url), env: runEnv, stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-12_000); });
  }
  return child;
}
let server = startLabServer();

async function stopLabServer() {
  server.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 3_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Lab server exited before readiness.\n${serverOutput}`);
    try {
      const response = await fetch(baseUrl);
      if (response.status < 500) return;
    } catch {
      // The bounded retry below is the readiness gate.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Lab server did not become ready at ${baseUrl}.\n${serverOutput}`);
}

function runSmoke() {
  return new Promise((resolve, reject) => {
    const smoke = spawn(process.execPath, ["tests/api-smoke.mjs", baseUrl], { env: runEnv, stdio: "inherit" });
    smoke.once("error", reject);
    smoke.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`API smoke exited with ${code ?? signal}.`)));
  });
}

function runPhase3Smoke() {
  return new Promise((resolve, reject) => {
    const smoke = spawn(process.execPath, ["tests/phase3-api-smoke.mjs", baseUrl], { env: runEnv, stdio: "inherit" });
    smoke.once("error", reject);
    smoke.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`Phase 3 API smoke exited with ${code ?? signal}.`)));
  });
}

function runConversationSmoke() {
  return new Promise((resolve, reject) => {
    const smoke = spawn(process.execPath, ["tests/conversation-api-smoke.mjs", baseUrl], { env: runEnv, stdio: "inherit" });
    smoke.once("error", reject);
    smoke.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`Conversation API smoke exited with ${code ?? signal}.`)));
  });
}

function runLocalSmoke() {
  return new Promise((resolve, reject) => {
    const smoke = spawn(process.execPath, ["tests/local-api-smoke.mjs", baseUrl], { env: runEnv, stdio: "inherit" });
    smoke.once("error", reject);
    smoke.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`Local API smoke exited with ${code ?? signal}.`)));
  });
}

async function findD1File(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const candidate = join(path, entry.name);
    if (entry.isDirectory()) {
      const nested = await findD1File(candidate);
      if (nested) return nested;
    } else if (entry.name.endsWith(".sqlite")) {
      const candidateDb = new DatabaseSync(candidate);
      const found = candidateDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lab_records'").get();
      candidateDb.close();
      if (found) return candidate;
    }
  }
  return null;
}

function seedLargeArchive(databasePath) {
  const database = new DatabaseSync(databasePath);
  const insertRecord = database.prepare("INSERT INTO lab_records (id, owner_id, record_type, parent_id, title, payload_json, committed_at, created_at) VALUES (?, 'local-learner', 'weekly_plan', NULL, ?, ?, ?, ?)");
  const insertEvent = database.prepare("INSERT INTO lab_events (id, owner_id, record_id, event_type, event_json, occurred_at, created_at) VALUES (?, 'local-learner', ?, 'reflection', ?, ?, ?)");
  database.exec("BEGIN IMMEDIATE");
  try {
    for (let index = 0; index < 10_000; index += 1) {
      const recordId = `synthetic-record-${String(index).padStart(5, "0")}`;
      const timestamp = new Date(Date.UTC(2026, 7, 20, 12, 0, 0) - index * 1_000).toISOString();
      insertRecord.run(recordId, `Synthetic plan ${index}`, JSON.stringify({ weekOf: "2026-08-17", mode: "Normal Week", rationale: `Synthetic performance record ${index}`, totalMinutes: 690, dailyLoops: 5 }), timestamp, timestamp);
      for (let eventIndex = 0; eventIndex < 3; eventIndex += 1) {
        insertEvent.run(`synthetic-event-${index}-${eventIndex}`, recordId, JSON.stringify({ text: `Synthetic event ${eventIndex}` }), timestamp, timestamp);
      }
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally { database.close(); }
}

try {
  await waitForServer();
  await runSmoke();
  await runPhase3Smoke();
  await runConversationSmoke();
  await runLocalSmoke();
  await stopLabServer();

  serverOutput = "";
  server = startLabServer();
  await waitForServer();
  const persisted = await fetch(`${baseUrl}/api/lab/bootstrap`).then((response) => response.json());
  assert.deepEqual(persisted.counts, { records: 1, events: 1, conversations: 0 }, "Local records must survive a server restart.");
  await stopLabServer();

  const databasePath = await findD1File(persistencePath);
  assert.ok(databasePath, "The disposable local D1 file must be discoverable for the large-archive gate.");
  seedLargeArchive(databasePath);
  serverOutput = "";
  server = startLabServer();
  await waitForServer();
  await fetch(`${baseUrl}/api/lab/history?type=weekly_plan&limit=25`);
  const durations = [];
  let cursor = null;
  for (let page = 0; page < 5; page += 1) {
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl}/api/lab/history?type=weekly_plan&limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    const body = await response.json();
    durations.push(performance.now() - startedAt);
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.records.length, 25);
    cursor = body.nextCursor;
  }
  assert.ok(durations.every((duration) => duration < 300), `Large History pages exceeded 300ms: ${durations.map((value) => value.toFixed(1)).join(", ")}`);
  console.log(`Local persistence and large-archive smoke passed: restart retained data; 10,000 records and 30,000 events served in ${durations.map((value) => value.toFixed(1)).join("/" )}ms.`);
} finally {
  if (server.exitCode === null) await stopLabServer();
  await new Promise((resolve) => aiServer.close(resolve));
  await rm(persistencePath, { recursive: true, force: true });
}
