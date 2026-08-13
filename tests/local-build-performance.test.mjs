import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
const appEntry = manifest["app/LabApp.tsx"];
const workspaceEntry = manifest["app/LabWorkspace.tsx"];

assert.ok(appEntry, "The eager local Lab shell must have a client entry.");
assert.ok(workspaceEntry, "The advanced Lab workspace must have its own client entry.");
assert.ok(appEntry.dynamicImports?.includes("app/LabWorkspace.tsx"), "The advanced workspace must remain lazy.");

const appBytes = (await stat(new URL(`dist/client/${appEntry.file}`, root))).size;
const workspaceBytes = (await stat(new URL(`dist/client/${workspaceEntry.file}`, root))).size;
assert.ok(appBytes < 25_000, `The eager Lab shell is ${appBytes} bytes; budget is 25,000 bytes.`);
assert.ok(workspaceBytes < 120_000, `The advanced Lab workspace is ${workspaceBytes} bytes; budget is 120,000 bytes.`);

for (const lazySurface of ["app/SourcingView.tsx", "app/RecruitingView.tsx", "app/DiligenceView.tsx", "app/CoachView.tsx", "app/HistoryView.tsx"]) {
  assert.ok(workspaceEntry.dynamicImports?.includes(lazySurface), `${lazySurface} must remain view-loaded.`);
}

const eagerCode = await readFile(new URL(`dist/client/${appEntry.file}`, root), "utf8");
for (const advancedCopy of ["Load-Bearing Questions", "Official Opportunity Monitor", "Diligence Case", "Mastery Evidence", "Load 25 older records"]) {
  assert.doesNotMatch(eagerCode, new RegExp(advancedCopy), `${advancedCopy} leaked into the eager shell.`);
}

console.log(`Local build performance passed: eager Lab shell ${(appBytes / 1024).toFixed(1)} KiB; advanced workspace ${(workspaceBytes / 1024).toFixed(1)} KiB with five view-loaded modules.`);
