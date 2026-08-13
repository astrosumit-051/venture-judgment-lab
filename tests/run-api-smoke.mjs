import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
};
const server = spawn("npm", ["run", "dev", "--", "--port", port], {
  cwd: new URL("..", import.meta.url),
  env: runEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
for (const stream of [server.stdout, server.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    serverOutput = `${serverOutput}${chunk}`.slice(-12_000);
  });
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

try {
  await waitForServer();
  await runSmoke();
  await runPhase3Smoke();
} finally {
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
  await rm(persistencePath, { recursive: true, force: true });
}
