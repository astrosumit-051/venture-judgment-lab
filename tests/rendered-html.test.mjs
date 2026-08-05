import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the Venture Judgment Lab learning surface", async () => {
  const [layout, app, api] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LabApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/lab/route.ts", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);

  assert.match(layout, /Venture Judgment Lab/);
  assert.match(layout, /Evidence before narrative\./);
  assert.match(app, /Daily Brief/);
  assert.match(app, /Snapshot Judgment/);
  assert.match(app, /Weekly Underwrite/);
  assert.match(app, /Decision Delta/);
  assert.match(api, /INSERT INTO lab_records/);
  assert.match(api, /INSERT INTO lab_events/);
  assert.doesNotMatch(api, /UPDATE lab_records|DELETE FROM lab_records/);
});
