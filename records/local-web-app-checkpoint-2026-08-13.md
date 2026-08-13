# Local Web App Checkpoint — 13 August 2026

## Decision

The Venture Judgment Lab now has a separate single-user local runtime. It is a
browser-based web app started from this workspace and bound only to
`127.0.0.1`. The local learner identity is fixed server-side, and structured
evidence persists in a new git-ignored local D1 store.

This checkpoint does not import, rewrite, synchronize, retire, or redeploy the
private ChatGPT Site. The hosted Site remains an untouched fallback. The local
record begins empty; the dated Markdown Private Learning Record remains the
durable project history.

## Performance shape

Today and its assignment summary are the only eager learner experience. The
full workspace, Sourcing, Recruiting, Diligence, Coach, and paginated History
load only when opened. View-specific record queries replace the prior startup
download of every record and event, schema initialization is shared for the
runtime lifetime, and ordinary record and event writes return normalized data
for incremental client updates.

## Operating boundary

- `npm run dev` starts the loopback-only development server with persistent
  local state.
- `npm run local` starts the optimized local runtime and rebuilds only when its
  output is missing, stale, or was not produced in local mode.
- `npm run local:verify` runs the complete build, contract, API, and performance
  verification path against isolated disposable data.
- Luna and live-source operations still require internet access and private
  server-side credentials. A provider failure cannot commit or discard the
  learner's draft.

## Verification evidence

- The complete build and 63 unit and contract tests passed.
- API verification passed all immutable record, daily delivery, archive,
  recruiting, sourcing, diligence, coaching, conversation, and local-runtime
  flows.
- The eager Lab shell is 5.6 KiB; the advanced workspace is 86.3 KiB and keeps
  Sourcing, Recruiting, Diligence, Coach, and History in separate view-loaded
  modules.
- The real browser loaded Today without any advanced workspace module, opened
  every major workspace without console errors, and completed warmed History
  navigation in 273 milliseconds.
- A disposable archive containing 10,000 records and 30,000 append-only events
  returned 25-record History pages in 9.8–14.7 milliseconds.
- The local store remained empty after browser verification. Both synthetic
  verification stores were removed. No hosted request, data migration,
  deployment, synchronization, or retirement action occurred.
