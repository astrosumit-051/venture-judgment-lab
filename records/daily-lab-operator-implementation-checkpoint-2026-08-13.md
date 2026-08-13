# Daily Lab Operator Implementation Checkpoint — 13 August 2026

## Implemented locally

The Phase 3 operating slice now has owner-scoped D1 Lab Profiles, Lab Assignments, and
Lab Automation Runs; a bearer-protected Daily Operator endpoint; authenticated
current-assignment delivery; dynamic Today and Brief views; typed append-only
learner, source, replacement, usefulness, completion, and missed-practice
events; a deterministic Private Archive Export; and a no-overwrite ignored local
archive runner.

The local recovery boundary validates an archive manifest, requires a fresh
owner-scoped D1 environment, imports in dependency order, and reconciles the
recovered counts, section checksums, and payload digest through the fixed cursor.

The live Brief source is no longer the compile-time fixture. A scheduled run
can commit exactly one of three immutable outcomes for a learner date:
`ready`, `brief_unavailable`, or `intentionally_displaced`. A ready
assignment must pass all twelve publication gates before its Daily Brief and
four Reading Records are written atomically.

Logical exactly-once behavior does not depend on the scheduler. An identical
owner/slot replay returns the accepted identity; different evidence conflicts.
The Daily Operator can append bounded source-status, replacement, and
missed-practice evidence, but cannot mutate an assignment or supply learner
answers. The learner browser can append one Independent First Pass per reading
and completion evidence only through typed validation. Completion is accepted
only after all four current Reading Records have distinct learner responses. A
run must also cite the latest profile effective for its learner date; a stale
profile version conflicts before anything is written.

The Private Archive Export reads one owner-filtered, explicitly ordered D1 batch,
reconciles counts, canonicalizes the fixed-cursor payload, and hashes it with
SHA-256. The local runner publishes one mode-0600 bundle beneath
`.private/venture-judgment-lab/archive/` without overwriting an existing
different digest, then appends `archive_preserved` to D1. That acknowledgement
is intentionally included by the next export rather than the bundle it attests.

## Verification at this checkpoint

- production build exposes Daily Operator, Private Archive Export, and Today routes;
- 54 structural and unit tests pass;
- the existing 62-record/11-event isolated D1 smoke remains green;
- a separate Phase 3 smoke proves owner-bound registration, ready Lab Assignment,
  latest-profile enforcement, exact replay and conflicting evidence, four
  distinct learner responses before terminal completion, deterministic Private Archive Export,
  archive acknowledgement replay, and owner isolation;
- generated migrations 0008 through 0012 match the runtime schema; and
- the compile-time Daily Brief remains only as a historical fixture.

## Honest release boundary

This checkpoint is local and ticket 15 remains open and blocked by learner review. No weekday heartbeat,
runtime secret revision, production owner registration, private Sites version,
or real archive bundle is claimed yet. The learner has not accepted Sites
version 5, so the private Phase 3 deployment and final ticket resolution remain
gated. After that acceptance, deploy the reviewed source and migrations, set
and deploy the secret environment revision, register the owner/profile, create
the 6:00 AM America/Chicago weekday heartbeat for the canonical 7:00 AM Eastern
run, and complete five real scheduled-day proofs before resolving ticket 15.

The future heartbeat must read the Daily Delivery decision, Daily Brief
standard, and this checkpoint; validate the canonical Eastern slot; curate or
truthfully mark unavailable/displaced; process the bounded Coach queue; append
supported source or missed evidence; POST the run; execute
`npm run archive:sync -- --base-url <private-site> --run-key <accepted-run-key>`;
and notify only after D1 acceptance plus archive reconciliation, or when a
bounded intervention is required. It never sends outreach, submits an
application, publishes an artifact, or exposes private source content.
