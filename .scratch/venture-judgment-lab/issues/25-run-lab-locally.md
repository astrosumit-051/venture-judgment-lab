# Run the Lab as a fast local web app

Type: task
Status: resolved
Parent: ../map.md

## Question

Move the learner-facing Lab from a ChatGPT-hosted runtime to a single-user web
app served only on `127.0.0.1`, with a fresh persistent local record, fast
initial loading, and no mutation or retirement of the existing private Site.

## Comments

- 2026-08-13: Claimed from the learner-approved local-app plan. The hosted Site
  and its D1 history remain untouched; the local runtime intentionally starts
  with a separate empty database.
- 2026-08-13: The public verification seams are localhost startup and identity,
  scoped record reads, paginated History, normalized append-only write
  responses, persistence across restart, browser behavior, and build-size and
  response-time budgets.
- 2026-08-13: Resolved after the optimized runtime started on loopback with an
  empty local record, persisted a verification record across restart, passed
  the complete 63-test and API suites, and completed browser and large-archive
  performance checks. Both disposable verification databases were removed.
- 2026-08-13: Post-review hardening added a database-backed single-writer Luna
  confirmation boundary, learner-edit retry recovery, canonical Reading Record
  nesting, protected loopback flags, `.env.local` development loading, cached
  cursor-complete reference reads, and record-to-event indexes. The updated
  build and 65 unit/contract tests pass; the committed concurrent API case is
  pending the next local-port verification run because the execution service
  rejected additional elevated usage.

## Answer

The Lab now runs locally through `npm run dev` or the optimized `npm run local`
command. Today is the only eager learner surface; the advanced workspace and
five heavy views load on demand. Reads are view-scoped, History is cursor-
paginated, ordinary record and event writes update the client from normalized
responses, and schema initialization runs once per runtime lifetime.

The eager Lab shell is 5.6 KiB and the advanced workspace is 86.3 KiB. Browser
verification found no console errors; warmed History navigation completed in
273 ms. A disposable 10,000-record and 30,000-event archive returned 25-record
History pages in 9.8–14.7 ms. The real local database remains empty, and the
existing private ChatGPT Site was neither accessed nor changed.
