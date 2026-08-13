import { spawn } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildEntry = resolve(root, "dist/server/index.js");
const watchedRoots = ["app", "db", "worker", "public"].map((path) => resolve(root, path));
const watchedFiles = ["package.json", "package-lock.json", "vite.config.ts", "next.config.ts", "tsconfig.json"]
  .map((path) => resolve(root, path));

async function newestModifiedAt(path) {
  const info = await stat(path);
  if (!info.isDirectory()) return info.mtimeMs;
  const entries = await readdir(path, { withFileTypes: true });
  const values = await Promise.all(entries.map((entry) => newestModifiedAt(resolve(path, entry.name))));
  return Math.max(info.mtimeMs, ...values);
}

async function buildIsFresh() {
  try {
    await access(buildEntry, constants.R_OK);
    const runtimeConfig = JSON.parse(await readFile(resolve(root, "dist/server/wrangler.json"), "utf8"));
    if (runtimeConfig?.vars?.LAB_LOCAL_MODE !== "1") return false;
    const buildTime = (await stat(buildEntry)).mtimeMs;
    const sourceTime = Math.max(...await Promise.all([...watchedRoots, ...watchedFiles].map(newestModifiedAt)));
    return buildTime >= sourceTime;
  } catch {
    return false;
  }
}

function run(command, args, env = process.env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0
      ? resolvePromise()
      : reject(new Error(`${command} exited with ${code ?? signal}.`)));
  });
}

const localEnv = {
  ...process.env,
  LAB_LOCAL_MODE: "1",
  LAB_LOCAL_OWNER_ID: process.env.LAB_LOCAL_OWNER_ID || "local-learner",
};

if (!(await buildIsFresh())) await run("npm", ["run", "build"], localEnv);

const wranglerArgs = [
  "wrangler", "dev",
  "--config", "dist/server/wrangler.json",
  "--local",
  "--ip", "127.0.0.1",
  "--persist-to", resolve(root, process.env.LAB_LOCAL_DATA_PATH || ".private/venture-judgment-lab/local-db"),
  "--log-level", "warn",
  ...process.argv.slice(2),
];
try {
  await access(resolve(root, ".env.local"), constants.R_OK);
  wranglerArgs.push("--env-file", resolve(root, ".env.local"));
} catch {
  // Luna remains visibly unconfigured until the learner adds the private key.
}
await run("npx", wranglerArgs, localEnv);
