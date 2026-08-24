import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

async function availablePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolve) => probe.close(resolve));
  if (!port) throw new Error("Could not reserve a loopback verification port.");
  return port;
}

const appPort = await availablePort();
const debugPort = await availablePort();
const aiPort = await availablePort();
const localData = await mkdtemp(join(tmpdir(), "venture-judgment-lab-browser-db-"));
const chromeProfile = await mkdtemp(join(tmpdir(), "venture-judgment-lab-chrome-"));
const baseUrl = `http://127.0.0.1:${appPort}`;
const chromeCandidates = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
assert.ok(chromePath, "Set CHROME_BIN to a Chromium-based browser before running local:verify.");

const aiServer = createHttpServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/v1/chat/completions") return response.writeHead(404).end();
  request.resume();
  request.on("end", () => {
    response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Synthetic provider outage" }));
  });
});
await new Promise((resolve, reject) => aiServer.listen(aiPort, "127.0.0.1", (error) => error ? reject(error) : resolve()));

const server = spawn("npm", ["run", "local", "--", "--port", String(appPort)], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    LAB_LOCAL_DATA_PATH: localData,
    LAB_LOCAL_OWNER_ID: "local-learner",
    LAB_AI_BASE_URL: `http://127.0.0.1:${aiPort}/v1`,
    LAB_AI_API_KEY: "browser-smoke-secret",
    LAB_AI_MODEL: "browser-smoke-model",
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});
let serverOutput = "";
for (const stream of [server.stdout, server.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-12_000); });
}

const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${chromeProfile}`, "about:blank"], { stdio: "ignore", detached: process.platform !== "win32" });

function terminate(child, signal) {
  if (child.exitCode !== null) return;
  try {
    if (process.platform !== "win32") process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    // The scoped disposable process group already exited.
  }
}

async function waitFor(url, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { const response = await fetch(url); if (response.ok) return response; } catch { /* bounded readiness retry */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}.\n${serverOutput}`);
}

async function findD1File(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const candidate = join(path, entry.name);
    if (entry.isDirectory()) {
      const nested = await findD1File(candidate);
      if (nested) return nested;
    } else if (entry.name.endsWith(".sqlite")) {
      const database = new DatabaseSync(candidate);
      const found = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lab_records'").get();
      database.close();
      if (found) return candidate;
    }
  }
  return null;
}

function seedLargeArchive(databasePath) {
  const database = new DatabaseSync(databasePath);
  const insertRecord = database.prepare("INSERT INTO lab_records (id, owner_id, record_type, parent_id, title, payload_json, committed_at, created_at) VALUES (?, 'local-learner', ?, NULL, ?, ?, ?, ?)");
  const insertReading = database.prepare("INSERT INTO lab_records (id, owner_id, record_type, parent_id, title, payload_json, committed_at, created_at) VALUES ('realistic-reading', 'local-learner', 'reading_record', 'realistic-snapshot', 'Grid constraints as an adoption bottleneck', ?, ?, ?)");
  const insertEvent = database.prepare("INSERT INTO lab_events (id, owner_id, record_id, event_type, event_json, occurred_at, created_at) VALUES (?, 'local-learner', ?, 'reflection', ?, ?, ?)");
  database.exec("BEGIN IMMEDIATE");
  try {
    for (let index = 0; index < 10_000; index += 1) {
      const recordId = index === 0 ? "realistic-snapshot" : `synthetic-record-${String(index).padStart(5, "0")}`;
      const timestamp = new Date(Date.UTC(2026, 7, 21, 18, 0, 0) - index * 1_000).toISOString();
      const recordType = index === 0 ? "snapshot_judgment" : "weekly_plan";
      const title = index === 0 ? "HelioGrid — Watch at 62%" : `Synthetic plan ${index}`;
      const payload = index === 0
        ? { company: "HelioGrid", disposition: "Watch", confidence: 62, thesis: "Interconnection queues may create a durable workflow wedge.", crux: "Utilities adopt the workflow before queue reform removes the pain." }
        : { weekOf: "2026-08-17", mode: "Normal Week", rationale: `Synthetic performance record ${index}`, totalMinutes: 690, dailyLoops: 5 };
      insertRecord.run(recordId, recordType, title, JSON.stringify(payload), timestamp, timestamp);
      for (let eventIndex = 0; eventIndex < 3; eventIndex += 1) insertEvent.run(`synthetic-event-${index}-${eventIndex}`, recordId, JSON.stringify({ text: `Synthetic event ${eventIndex}` }), timestamp, timestamp);
    }
    const timestamp = "2026-08-21T18:00:00.000Z";
    insertReading.run(JSON.stringify({ lane: "Market structure", canonicalUrl: "https://example.com/grid", labSummary: "A realistic child reading used to verify History rendering." }), timestamp, timestamp);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally { database.close(); }
}

let socket;
try {
  await waitFor(baseUrl);
  const targets = await (await waitFor(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const pageTarget = targets.find((target) => target.type === "page");
  assert.ok(pageTarget, "Headless Chrome must expose a page target.");
  socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  const requestedUrls = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Network.requestWillBeSent") requestedUrls.push(message.params.request.url);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });
  function cdp(method, params = {}) {
    const id = ++sequence;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }
  async function evaluate(expression) {
    const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.text}: ${result.exceptionDetails.exception?.description ?? expression}`);
    return result.result.value;
  }
  async function waitForExpression(expression, attempts = 100) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (await evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const state = await evaluate("({ url: location.href, title: document.title, body: document.body?.innerText.slice(0, 1000) ?? '' })");
    throw new Error(`Browser condition timed out: ${expression}\n${JSON.stringify(state)}\n${serverOutput}`);
  }
  async function clickNav(label) {
    const encoded = JSON.stringify(label);
    await evaluate(`(() => { const button = [...document.querySelectorAll('nav button')].find((item) => item.querySelector('strong')?.textContent === ${encoded}); if (!button) return false; button.click(); return true; })()`);
  }
  async function clickButton(label) {
    const encoded = JSON.stringify(label);
    await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim().startsWith(${encoded})); if (!button) return false; button.click(); return true; })()`);
  }
  async function clickCapability(label, action) {
    const encodedLabel = JSON.stringify(label);
    const encodedAction = JSON.stringify(action);
    await evaluate(`(() => { const card = [...document.querySelectorAll('.capability-groups article')].find((item) => item.querySelector('strong')?.textContent === ${encodedLabel}); const button = card && [...card.querySelectorAll('button')].find((item) => item.textContent?.trim().startsWith(${encodedAction})); if (!button) return false; button.click(); return true; })()`);
  }

  await Promise.all([cdp("Page.enable"), cdp("Runtime.enable"), cdp("Network.enable")]);
  const launchStarted = performance.now();
  await cdp("Page.navigate", { url: baseUrl });
  await waitForExpression("document.title === 'Venture Judgment Lab' && Boolean(document.body?.innerText.includes('Good morning')) && document.body?.innerText.includes('What are you working through?')");
  const usableMs = performance.now() - launchStarted;
  assert.ok(usableMs < 2_000, `Warm local launch became usable in ${usableMs.toFixed(1)}ms.`);
  assert.equal(await evaluate("document.body.innerText.trim().length > 0"), true, "The Today shell must not be blank.");
  assert.equal(await evaluate("Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay'))"), false, "The browser must not show a framework error overlay.");
  assert.equal(requestedUrls.some((url) => url.includes("LabWorkspace")), true, "The chat-first workspace must load as the primary shell.");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('nav button strong')].map((item) => item.textContent)"), ["Today", "Work", "Record", "More"], "The permanent navigation must expose exactly four destinations.");
  assert.equal(await evaluate("Boolean(document.querySelector('.goal-picker, .workflow-picker'))"), false, "Today must not expose the old workflow chooser.");

  await evaluate(`(() => { const input = document.querySelector('#luna-intent'); const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; setter.call(input, 'FORCE_PROVIDER_FAILURE — I found a startup at a university demo day'); input.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await clickButton("Continue");
  await waitForExpression("Boolean(document.querySelector('[role=alert]')) && document.body.innerText.includes('preserved')");
  await waitForExpression("document.body.innerText.toLowerCase().includes('using') && document.body.innerText.includes('Sourcing lead')");
  assert.equal(await evaluate("document.body.innerText.toLowerCase().includes('using') && document.body.innerText.includes('Sourcing lead')"), true, "Luna must reveal the inferred capability.");
  assert.equal(await evaluate("document.body.innerText.includes('FORCE_PROVIDER_FAILURE — I found a startup at a university demo day')"), true, "The routed opening thought must remain visible after a provider outage.");
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some((button) => button.textContent.includes('Try again'))"), true, "The provider outage must expose a recoverable retry action.");

  await evaluate("[...document.querySelectorAll('nav button')][0].focus(); true");
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("document.activeElement?.tagName === 'BUTTON'"), true, "Keyboard navigation must retain a visible button focus target.");

  await clickButton("Start something else");
  await waitForExpression("document.body.innerText.includes('What are you working through?')");
  await clickNav("More");
  await waitForExpression("document.body.innerText.includes('Everything is still here') && document.querySelectorAll('.capability-groups article').length === 18");
  assert.equal(await evaluate("Boolean(document.querySelector('.capability-search input'))"), true, "More must provide searchable capability access.");

  const navigationStarted = performance.now();
  await clickCapability("Snapshot judgment", "Open structured editor");
  await waitForExpression("document.body.innerText.includes('Opening advanced entry') || document.body.innerText.includes('Commit before you know everything.')", 20);
  const feedbackMs = performance.now() - navigationStarted;
  assert.ok(feedbackMs < 100, `Navigation visual feedback took ${feedbackMs.toFixed(1)}ms.`);
  await waitForExpression("document.body.innerText.includes('Commit before you know everything.')");
  assert.equal(requestedUrls.some((url) => url.includes("AdvancedFormsView")), true, "Advanced forms must load only after an advanced workflow opens.");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('nav button strong')].map((item) => item.textContent)"), ["Today", "Work", "Record", "More"], "Advanced entry must retain the four permanent destinations.");

  await clickNav("Work");
  await waitForExpression("document.body.innerText.includes('Continue by status, not by feature.')");

  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await waitForExpression("document.querySelectorAll('nav button').length === 4");
  assert.equal(await evaluate("document.querySelector('nav').scrollWidth <= document.querySelector('nav').clientWidth"), true, "The four-item mobile navigation must fit without horizontal overflow.");
  await cdp("Emulation.clearDeviceMetricsOverride");

  const databasePath = await findD1File(localData);
  assert.ok(databasePath, "The browser gate must locate its disposable local D1 database.");
  seedLargeArchive(databasePath);
  await clickNav("Record");
  await waitForExpression("document.body.innerText.includes('Originals stay. Updates accumulate.') && document.body.innerText.includes('25+ immutable submissions')", 200);
  assert.equal(requestedUrls.some((url) => url.includes("HistoryView")), true, "History must load its own view module.");
  assert.equal(await evaluate("document.body.innerText.includes('HelioGrid — Watch at 62%')"), true, "A realistic archive record must render in History.");
  assert.equal(await evaluate("document.body.innerText.includes('Grid constraints as an adoption bottleneck')"), true, "Only the relevant child Reading Record must render under its parent.");
  const paginationStarted = performance.now();
  await clickButton("Load 25 older records");
  await waitForExpression("document.body.innerText.includes('50+ immutable submissions')", 200);
  const paginationMs = performance.now() - paginationStarted;
  assert.ok(paginationMs < 300, `Large History browser pagination took ${paginationMs.toFixed(1)}ms.`);
  const warmedHistoryRequests = await evaluate("performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/api/lab/history')).map((entry) => entry.duration)");
  assert.ok(warmedHistoryRequests.every((duration) => duration < 300), `Warmed History requests exceeded 300ms: ${warmedHistoryRequests.join(', ')}`);
  console.log(`Local browser smoke passed: usable in ${usableMs.toFixed(1)}ms; four-destination navigation and advanced-entry feedback in ${feedbackMs.toFixed(1)}ms; 10,000-record pagination in ${paginationMs.toFixed(1)}ms; routed provider recovery, mobile fit, lazy modules, and keyboard focus verified.`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  const chromeExit = new Promise((resolve) => chrome.once("exit", resolve));
  const serverExit = new Promise((resolve) => server.once("exit", resolve));
  terminate(chrome, "SIGTERM");
  terminate(server, "SIGTERM");
  await Promise.all([
    chrome.exitCode === null ? Promise.race([chromeExit, new Promise((resolve) => setTimeout(resolve, 3_000))]) : Promise.resolve(),
    server.exitCode === null ? Promise.race([serverExit, new Promise((resolve) => setTimeout(resolve, 3_000))]) : Promise.resolve(),
  ]);
  terminate(chrome, "SIGKILL");
  terminate(server, "SIGKILL");
  await new Promise((resolve) => aiServer.close(resolve));
  server.stdout.destroy();
  server.stderr.destroy();
  await rm(localData, { recursive: true, force: true });
  await rm(chromeProfile, { recursive: true, force: true });
}
