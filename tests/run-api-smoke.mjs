import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = process.env.LAB_API_SMOKE_PORT ?? "4319";
const baseUrl = `http://localhost:${port}`;
const persistencePath = await mkdtemp(join(tmpdir(), "venture-judgment-lab-api-smoke-"));
const runEnv = {
  ...process.env,
  LAB_API_SMOKE: "1",
  LAB_AUTOMATION_TOKEN: `local-opportunity-monitor-verification-${Date.now()}`,
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

try {
  await waitForServer();
  await runSmoke();
} finally {
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
  await rm(persistencePath, { recursive: true, force: true });
}
