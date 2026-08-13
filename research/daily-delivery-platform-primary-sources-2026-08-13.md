# Daily Delivery Platform Primary Sources — 2026-08-13

## Research question

Which platform contracts should govern a weekday 7:00 AM `America/New_York` Daily Brief, Codex notification, owner-scoped Sites persistence and export, and an ignored append-only local archive?

This note separates **platform fact** from **recommended Lab inference**. It does not create an automation, change a hosted environment variable, or deploy Sites.

## Source hierarchy and inspection boundary

The installed Codex and Sites contracts are the primary sources for product behavior that is not fully documented on the public web:

- installed `codex_app__automation_update` tool description and schema, inspected 2026-08-13;
- the existing local heartbeat configuration at `/Users/sumitkumarsah/.codex/automations/official-opportunity-monitor/automation.toml`, inspected 2026-08-13;
- installed Sites skills at `/Users/sumitkumarsah/.codex/plugins/cache/openai-bundled/sites/0.1.34/skills/sites-building/SKILL.md` and `/Users/sumitkumarsah/.codex/plugins/cache/openai-bundled/sites/0.1.34/skills/sites-hosting/SKILL.md`;
- installed `mcp__codex_apps__sites_update_environment_variables`, `sites_save_site_version`, `sites_deploy_private_site_version`, and deployment-status tool descriptions and schemas, inspected 2026-08-13; and
- the current project declarations in [`.openai/hosting.json`](../.openai/hosting.json), [`app/automationAuth.ts`](../app/automationAuth.ts), and [`types/sites-runtime.d.ts`](../types/sites-runtime.d.ts).

Official OpenAI documentation search found general Codex automation and Sites use cases, but no public page that specifies heartbeat recurrence timezone interpretation, retry guarantees, notification policy evaluation, or Sites environment-revision semantics. Those details below are therefore attributed to the installed contracts rather than presented as public OpenAI guarantees. The general public overview only confirms that Codex supports automation-oriented workflows and Sites-hosted internal apps. [OpenAI Codex use cases](https://developers.openai.com/codex/use-cases)

## 1. Codex heartbeat scheduling and notifications

### Platform facts

1. The installed automation contract says a **heartbeat attached to the current local thread is the default** for recurring follow-ups. A detached cron job is reserved for a user request for a new task per run or standalone project work. A heartbeat therefore matches the learner's desire for one continuing Lab coaching thread. _Source: installed `codex_app__automation_update` tool contract, inspected 2026-08-13._

2. The automation contract persists a recurrence rule, target thread, status, prompt, and optional `notificationPolicy`. Its current tool guidance maps “do not notify me” to `failed_runs_only` and removes that override when unmuting. Notification preferences belong in the policy field, not embedded in the automation prompt. _Source: installed `codex_app__automation_update` tool contract, inspected 2026-08-13._

3. A heartbeat turn must finish with exactly one decision block: `NOTIFY` with a short learner-facing message, or `DONT_NOTIFY` with a quiet-status message. The prompt can therefore decide whether a particular successful run deserves attention, independently of whether the recurrence itself executed. _Source: installed heartbeat response contract in the active Codex runtime, inspected 2026-08-13._

4. The installed recurrence schema exposes an RRULE string but no explicit IANA timezone field. The existing opportunity monitor stores `FREQ=WEEKLY;BYDAY=MO;BYHOUR=7;BYMINUTE=0`; its own prompt explicitly identifies that as 7:00 AM `America/Chicago` and therefore 8:00 AM `America/New_York`. This is direct local evidence that the current saved recurrence is interpreted against the local Chicago clock. _Source: `/Users/sumitkumarsah/.codex/automations/official-opportunity-monitor/automation.toml`, inspected 2026-08-13._

5. The installed contract does **not** promise exactly-once execution, a maximum start delay, automatic retries, or durable delivery of the learner notification. It also does not expose a per-automation timezone field in the callable schema. Absence of such a promise must not be treated as a guarantee.

### Recommended Lab inference

- Create one thread-attached weekday heartbeat with a local recurrence equivalent to `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=6;BYMINUTE=0` while the host is in `America/Chicago`. Chicago and New York currently move daylight-saving time together and remain one hour apart, so 6:00 AM Chicago maps to 7:00 AM New York. Treat this as an environment-dependent mapping, not an intrinsic RRULE timezone.
- Put `America/New_York` and the canonical scheduled local date inside the operator contract. On every wake, independently validate with `Intl.DateTimeFormat` that the intended run is a Monday–Friday 07:00 Eastern run. If the host timezone changes, update the saved recurrence rather than silently accepting drift.
- Treat the heartbeat as an **at-least-once, possibly late wake-up signal**. Sites, not the scheduler, must enforce one logical automation run and at most one versioned Brief per owner and Eastern date. A stable run key such as `daily-operator|<owner-fingerprint>|YYYY-MM-DD` plus an input fingerprint should make an identical replay return the existing result and a different replay for the same key fail with a conflict.
- Let the heartbeat return `NOTIFY` only after either (a) a validated Brief is durably committed and ready, or (b) intervention is required because a source, API, archive, or missed-day check failed. Return `DONT_NOTIFY` for an identical replay or a complete run with no new learner-facing state. Keep `notificationPolicy` at its normal/unmuted setting so the per-run heartbeat decision is effective.
- Do not equate “the heartbeat fired” with “the Brief exists.” `lab_automation_runs` should preserve `scheduled`, `started`, `brief_committed`, `archive_preserved`, `completed`, and bounded `failed` evidence. A grace-window health check should append `missed_practice` or `brief_unavailable` only after it can prove that no terminal run/assignment exists for the expected Eastern date.

## 2. Sites runtime variables and deployment behavior

### Platform facts

1. Sites expects `.openai/hosting.json` to contain only the opaque project ID and optional logical D1/R2 bindings. Runtime values are managed through Sites, not stored in that file. The current project already declares project `appgprj_6a72b85533b88191bc59410b0951d2c1` and logical D1 binding `DB`; no R2 binding is declared. _Sources: installed `sites-hosting` skill and [`.openai/hosting.json`](../.openai/hosting.json)._

2. The Sites environment-variable contract updates only the listed keys; unlisted keys remain unchanged. Keys are case-sensitive, and sensitive values can be marked `is_secret` so their plaintext is not returned. The response creates a monotonically numbered environment revision. _Source: installed `mcp__codex_apps__sites_update_environment_variables` tool contract, inspected 2026-08-13._

3. An environment-variable update is not applied to production merely because the revision was created. The installed contract requires deploying a **saved site version** after the change. Each deployment records the environment-set revision it used (`env_set_revision`). _Sources: installed Sites environment-update and deploy tool contracts, inspected 2026-08-13._

4. Sites versions are saved from a pushed commit SHA and, when supplied, an archive built from that exact source state. Saving a version does not deploy it. Production deployment uses a saved version; every Sites deployment URL is production. The private deployment path is permitted only after verifying owner-only access. _Sources: installed `sites_save_site_version`, `sites_deploy_private_site_version`, and `sites-hosting` contracts, inspected 2026-08-13._

5. Sites owns the real D1 resource and deployment wiring. The installed persistence guidance says to keep the logical `DB` declaration in `.openai/hosting.json`, put schema in `db/schema.ts`, use prepared statements, pass exactly one SQL statement to each `prepare()`, and use `batch([...])` for a multi-statement operation. [Installed Sites persistence guidance](../.openai/hosting.json) is reflected in the project, while Cloudflare documents the underlying D1 binding behavior. [Cloudflare D1 Workers Binding API](https://developers.cloudflare.com/d1/worker-api/)

6. The project already reads `LAB_AUTOMATION_TOKEN` from the Workers `env` binding in production, falls back to `process.env` locally, refuses a production token shorter than 32 characters, and stores/compares its SHA-256 fingerprint rather than the plaintext credential. [Current automation authentication implementation](../app/automationAuth.ts)

### Recommended Lab inference

- Reuse one high-entropy `LAB_AUTOMATION_TOKEN` only for the bounded Lab Operator surface if the authorization design intentionally maps that credential to one owner. Store the local copy in a gitignored `.env` file with restrictive permissions; set the hosted copy through Sites with `is_secret: true`. Never place it in `.openai/hosting.json`, Markdown, an automation prompt, a request body, logs, deployment archives, or Git.
- After setting or rotating the hosted secret, deploy the already validated Phase 3 saved version and record the returned `env_set_revision` in the private deployment checkpoint. Until that deployment succeeds, report the runtime as unconfigured; do not infer that an environment update reached production.
- Register the credential from the authenticated learner session. Automation routes should resolve the owner only from the stored one-way credential fingerprint and must reject caller-supplied owner IDs. Browser routes continue resolving the owner through ChatGPT authentication.
- Keep Phase 3 schema migrations in the exact source/archive used to save the version. A deployment rollback may change application code but must never delete or reverse D1 learning evidence.

## 3. D1 consistency, query, and export constraints

### Platform facts

1. D1 `batch()` executes prepared statements sequentially and non-concurrently. Cloudflare describes a batch as a SQL transaction: if one statement fails, the sequence aborts or rolls back, and results preserve statement order. [Cloudflare D1 `batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)

2. If read replication is enabled, replicas are asynchronously updated and may lag. A D1 Session provides **sequential consistency**, and `withSession("first-primary")` routes the first query to the primary so the session begins from the latest database version. Later reads in the session are at least as current as the session bookmark. This is not a documented fixed snapshot across independently paginated requests; a later query may see a newer bookmark. [Cloudflare D1 read replication and Sessions](https://developers.cloudflare.com/d1/best-practices/read-replication/)

3. D1 limits relevant to export include 50 queries per Worker invocation on Free or 1,000 on Paid, 2 MB per string/BLOB/row, 100 KB per SQL statement, 100 bound parameters per query, and 30 seconds maximum SQL query duration. The 30-second API limit also applies to an entire batch. Query execution and result serialization additionally run inside Workers CPU and memory limits. [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [Cloudflare D1 FAQ](https://developers.cloudflare.com/d1/reference/faq/)

4. D1 result metadata reports success, rows read/written, changes, database size, attempts, and whether the primary served the query. This metadata is useful for bounded export reconciliation but is not itself a checksum of returned content. [Cloudflare D1 result objects](https://developers.cloudflare.com/d1/worker-api/return-object/)

5. Cloudflare's administrative `wrangler d1 export` creates a whole-database or single-table SQL file. A running export blocks other database requests, does not support virtual tables, and may lose precision when JavaScript retrieves large `int64` values. The administrative API can also leave D1 unavailable while an export is in progress. [Cloudflare D1 import/export guidance](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [Cloudflare D1 export API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/)

### Recommended Lab inference

- Do **not** use `wrangler d1 export` as the routine learner archive mechanism. It is not owner-scoped, it can block the operational database, and it produces an administrative SQL dump rather than the bounded application record required by this Lab.
- Implement a bearer-protected application export endpoint that binds the resolved owner to every query (`WHERE owner_id = ?`). For the current bounded dataset, issue one read-only `db.batch()` containing explicit counts and explicit-column `SELECT`s for every exported table. Order every array by a total stable key, for example `(committed_at, id)` for records and `(occurred_at, id)` for events; never rely on insertion or result order without `ORDER BY`.
- Return a versioned envelope containing the stable automation run key, export schema version, generated timestamp, owner fingerprint (not raw credential), per-table counts, ordered rows, and the canonical payload checksum. Ensure the counts and rows come from the same batch transaction. Reject the export if any result is unsuccessful, a count differs, a row exceeds the contract, or the response would exceed an explicit application cap.
- Keep the first Phase 3 export intentionally bounded and fail closed rather than streaming an inconsistent partial archive. If the record grows beyond one safe batch/response, add a server-assigned monotonic archive sequence and export immutable deltas through a recorded high-water mark. Do not assume Sessions alone gives snapshot isolation across multiple HTTP pages; Cloudflare documents sequential consistency, not a frozen multi-request snapshot.
- Store `payload_json` and `event_json` as their exact text plus parsed data only when validation needs it. Avoid JavaScript-number round trips for values outside the safe integer range because Cloudflare explicitly documents 52-bit numeric precision constraints.

## 4. Deterministic checksum and safe local publication

### Platform facts

1. Repeating a cryptographic hash requires invariant input bytes. RFC 8785 defines JSON Canonicalization Scheme (JCS) using I-JSON constraints, deterministic property sorting, ECMAScript primitive serialization, and UTF-8 output to produce hashable JSON. It is an Informational RFC rather than an Internet Standards Track standard. [RFC 8785](https://www.rfc-editor.org/info/rfc8785/)

2. Cloudflare Workers exposes `crypto.subtle.digest("SHA-256", bytes)` without requiring Node compatibility, and its documentation includes SHA-256 as a supported digest. [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)

3. Node provides `createHash("sha256")` for local file checksums. Its filesystem documentation warns that promise-based filesystem operations are not synchronized and concurrent modifications to the same file may corrupt data; related operations must be explicitly awaited. [Node.js Crypto](https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options), [Node.js file system API](https://nodejs.org/api/fs.html)

4. On the current macOS platform, `rename(2)` requires source and destination to be on the same filesystem and guarantees that an instance of the destination name always exists even if the system crashes during the operation. `fsync(2)` flushes modified file data and attributes toward permanent storage, while the macOS manual cautions that stricter power-loss ordering requires `F_FULLFSYNC`. _Sources: local macOS `rename(2)` and `fsync(2)` system manuals, inspected 2026-08-13._

### Recommended Lab inference

- Define one checksum algorithm and byte contract: `sha256` over UTF-8 JCS-canonicalized **payload only**. Put the resulting lowercase hex digest, algorithm, schema version, and counts in an outer manifest. Do not hash ordinary `JSON.stringify()` output whose object insertion order may differ across implementations.
- Keep arrays in their database-defined total order before canonicalization. Normalize dates to exact ISO 8601 strings, preserve text exactly, reject non-I-JSON numbers, and include the export schema version so a future serializer change cannot masquerade as content corruption.
- Preserve one ignored local bundle per logical automation run, for example `.private/venture-judgment-lab/archive/<run-key>.json`, with file mode `0600`. The bundle contains both manifest and canonical payload; the manifest's digest covers the payload, avoiding a non-atomic sidecar checksum.
- The sync runner should create a temporary file **inside the same archive directory**, open it with exclusive creation, write and flush it, close it, then publish it under the final run-key name without overwriting an existing file. Serialize one sync runner at a time. On macOS, an implementation needing strict no-replace publication should prefer an exclusive same-filesystem primitive (for example, hard-linking the completed temporary inode to a new final name and treating `EEXIST` as replay/conflict) rather than relying on `rename()`'s replacement behavior.
- If the final file already exists, parse and verify its manifest. An identical run key and checksum is an idempotent replay; a different checksum for the same run key is a bounded conflict and must never replace the original. Remove only the runner's verified temporary file after successful publication. A crash residue without a valid final manifest is incomplete evidence, not a completed archive run.
- Add the exact private archive root to `.gitignore` before operation and exclude it from Sites packaging. The existing `.gitignore` ignores `.env*`, build output, and temporary output but does not yet name a canonical private archive root; this must be explicit before the first real sync.

## 5. Consolidated contract for ticket 14

The evidence supports the following design:

1. **Scheduler:** one Monday–Friday thread heartbeat mapped from 6:00 AM Chicago to 7:00 AM New York in the current host environment, plus an internal Eastern-time schedule validator.
2. **Exactly-once logical state:** stable owner/date run keys and assignment keys, unique constraints, replay fingerprints, and conflict-on-different-evidence semantics. Scheduler delivery itself is not trusted as exactly once.
3. **Atomic assignment:** the automation endpoint validates all four distinct lanes, the 55-minute cap, source roles, original URLs, assigned sections, rights/access metadata, downstream purpose, and deduplication before committing the versioned Brief and its four immutable assignment rows in one D1 transaction.
4. **Failure truth:** a failed curation or source gate atomically commits `brief_unavailable` as that date's immutable assignment outcome. It cannot later become a second live Brief. Replacement events apply only when a source in an already-ready assignment later becomes unavailable; yesterday's Brief is never silently reused. Missed days are derived only after a grace period and append evidence rather than backfill work or create catch-up debt.
5. **Notification:** notify after durable readiness or when intervention is required; suppress identical-replay/no-change attention while still preserving the run.
6. **Credential boundary:** one owner-bound bearer secret in ignored local environment and a Sites secret; only its fingerprint is persisted. Environment changes become live only after a saved-version deployment using the new environment revision.
7. **Operational store and archive:** D1 remains authoritative for live operation. A bounded owner-scoped export reads a transactionally consistent ordered set, canonicalizes it, hashes it with SHA-256, and publishes one no-overwrite ignored local bundle per run.
8. **Reconciliation:** each completed run records D1 counts, export counts, checksum, archive path identity, and environment/deployment version. A run is not fully reconciled until those counts and checksum verify; archive failure does not erase an already committed Brief but does require intervention.

## Limitations and open verification

- Public OpenAI documentation does not currently establish heartbeat timezone, retry, lateness, or notification-delivery guarantees. The Phase 3 implementation must test the installed scheduler with five real scheduled days and keep logical idempotency independent of product wake-up behavior.
- The current Sites type shim exposes `prepare()` and `batch()` but not D1 Sessions. This design does not require Sessions for its bounded single-batch export. If future pagination or read replication is introduced, extend the runtime types only after verifying the deployed Sites runtime capability.
- A D1 batch is documented as transactional, but Cloudflare does not claim in the cited material that multiple HTTP pages share one frozen snapshot. That is why future large exports require an application high-water mark rather than bookmark-only pagination.
- No local filesystem primitive can make a hosted D1 commit and a local disk write one distributed atomic transaction. The correct recovery model is an immutable D1 automation run plus idempotent archive reconciliation: a later runner may safely recreate the missing local bundle from the same bounded export, but it may not mutate either prior D1 evidence or an existing different archive file.
- The platform sources do not prove that a Codex desktop process will be awake, online, authorized, or able to reach the private Sites endpoint at every scheduled minute. The five-day phase gate must preserve late, offline, authentication, and unavailable-source evidence rather than treating those conditions as impossible.
