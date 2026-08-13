import vinext from "vinext";
import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;
const fileEnv = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
const runtimeEnv = { ...fileEnv, ...process.env };

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const apiSmokeToken = runtimeEnv.LAB_API_SMOKE === "1" ? runtimeEnv.LAB_AUTOMATION_TOKEN : undefined;
const apiSmokePersistPath = runtimeEnv.LAB_API_SMOKE === "1" ? runtimeEnv.LAB_TEST_PERSIST_PATH : undefined;
const apiSmokeNow = runtimeEnv.LAB_API_SMOKE === "1" ? runtimeEnv.LAB_API_SMOKE_NOW : undefined;
const localMode = runtimeEnv.LAB_LOCAL_MODE === "1";
const localOwnerId = runtimeEnv.LAB_LOCAL_OWNER_ID || "local-learner";
const localPersistPath = resolve(runtimeEnv.LAB_TEST_PERSIST_PATH || runtimeEnv.LAB_LOCAL_DATA_PATH || ".private/venture-judgment-lab/local-db");
const localTeacherVars = Object.fromEntries(
  ["LAB_AI_BASE_URL", "LAB_AI_API_KEY", "LAB_AI_MODEL"]
    .map((key) => [key, runtimeEnv[key]])
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1])),
);

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
  ...(localMode || apiSmokeToken || Object.keys(localTeacherVars).length ? {
    vars: {
      ...(localMode ? { LAB_LOCAL_MODE: "1", LAB_LOCAL_OWNER_ID: localOwnerId } : {}),
      ...(runtimeEnv.LAB_API_SMOKE === "1" ? { LAB_API_SMOKE: "1" } : {}),
      ...(apiSmokeToken ? { LAB_AUTOMATION_TOKEN: apiSmokeToken } : {}),
      ...(apiSmokeNow ? { LAB_API_SMOKE_NOW: apiSmokeNow } : {}),
      ...localTeacherVars,
    },
  } : {}),
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
        ...((localMode || apiSmokePersistPath) ? { persistState: { path: localPersistPath } } : {}),
      }),
    ],
  };
});
