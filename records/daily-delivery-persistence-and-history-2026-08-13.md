# Daily Delivery, Persistence, and History — 13 August 2026

## Decision

The first operating Lab will deliver one owner-scoped, immutable Daily Brief
outcome for each expected learner date from D1. Sites will never import a
compile-time Brief, silently repeat an earlier Brief, or accept curation
metadata from the learner browser. The Codex Daily Operator prepares the
assignment through a bearer-protected endpoint; the authenticated browser only
reads the accepted assignment and appends learner work.

D1 remains the operational source of truth. After every completed or boundedly
failed operator run, a local sync runner exports the owner's dated records to
an ignored append-only Private Archive. This is an operating-contract decision,
not a deployment claim: Sites version 5 still awaits learner acceptance, and
the Phase 3 implementation and five-day release gate remain in ticket 15.

## Stable domain model

### Lab Profile

A Lab Profile is an immutable version of one owner's IANA timezone, canonical
Eastern schedule, practice mode, expected dates, notification preference, and
automation binding. A changed timezone or mode appends a higher version
effective on a future learner date; it never edits an earlier version. Only one
version may be effective for an owner and learner date.

Profiles cannot expand the sustainable weekly budget. Normal and Monthly modes
expect five weekday Briefs, Recruiting Surge expects at least three selected
weekday loops, Exam Mode expects one selected Brief, and an activated Investing
Milestone Substitution may replace standalone Brief work with only its approved
bounded reflection.

### Lab Assignment

A Lab Assignment is the immutable delivery outcome for one owner and learner
date under one profile version. Its stable key is
`owner_id + learner_date`; a database constraint permits at most one canonical
outcome for that date:

- `ready`: one validated Daily Brief and four Reading Records;
- `brief_unavailable`: no complete valid Brief could be produced; or
- `intentionally_displaced`: the active practice mode did not require a
  standalone Brief that day.

A ready Brief passes all twelve gates in the existing Daily Brief Curation and
Reading Record Standard before delivery. That includes exactly four distinct
lanes within 55 minutes; complete or explicitly unknown bibliographic,
publisher, author/organization, identifier, date, access, rights, archive, and
version metadata; original resolving URLs; source role and type; claim role and
issuer interest; assigned sections; lawful access and material reviewed;
freshness or a valid exception; source/context/claim/evidence/corroboration
review; publisher, author, sector, and viewpoint diversity; duplicate,
continuation, and revisit handling; teaching purpose, carry question, downstream
target, and comparative selection rationale; copyright bounds; and Independent
First Pass withholding. At least two selections are evidence-owner anchored,
and material Current Signal claims have owner evidence or independent
corroboration. The assignment points to immutable `lab_records`; its dedicated
row contains identity, schedule, state, run provenance, and payload checksum.

Unavailable and displaced are evidence, not empty successes. Each has a bounded
reason and any next intervention, but no invented reading. Neither can later be
replaced by a second live assignment for that date.

### Lab Automation Run

A Lab Automation Run is the append-only account of one expected operator slot.
Its stable key is `owner_id + operator_kind + scheduled_for`. It records the
profile version, input-evidence checksum, assignment outcome, bounded source
status, Coach identifiers, missed-practice action, and notification intent. It
stores no raw page bodies, contact details,
correspondence, credentials, or confidential material.

The dedicated row fixes run identity, input checksum, and assignment provenance.
An immutable `automation_run` record and typed events then preserve
`assignment_committed`, `archive_preserved`, or bounded `failed` lifecycle
evidence. This allows archive reconciliation after the D1 transaction without
mutating a purportedly final run. Effective completion is derived only from
the assignment and required dated `archive_preserved` event. An identical replay
returns the existing run and assignment. Different evidence for an existing
run key returns a conflict and cannot overwrite it.

### Private Archive Export

A Private Archive Export is a deterministic owner-scoped projection of D1
records, events, profiles, assignments, and runs through a stable cursor. One
bounded read-only D1 batch returns explicit owner-filtered counts and rows in a
total database-defined order. The export contains a schema version, inclusive
cursor, deterministic counts, a SHA-256 checksum per section, and a checksum of
the UTF-8 RFC 8785 JCS-canonicalized payload. Retrieval time is wrapper metadata
excluded from that checksum, so exact replay stays identical.

Archive completeness is explicitly bounded by that declared cursor. After the
bundle is safely published, D1 appends `archive_preserved` with the run key,
cursor, counts, and digest. That event cannot be inside the bundle whose
successful publication it attests without circular self-reference; by
contract, the next successful export includes it. No bundle is rewritten, and
recovery never claims rows after its manifest cursor.

## Storage contract

Three narrow tables supplement `lab_records` and `lab_events`:

1. `lab_profiles`: immutable owner configuration versions, unique on
   `(owner_id, profile_version)`, with an effective learner date.
2. `lab_assignments`: one immutable outcome per
   `(owner_id, learner_date)`, linked to its profile, run, and evidence record.
3. `lab_automation_runs`: one immutable run per
   `(owner_id, operator_kind, scheduled_for)` with its evidence checksum.

Every table has owner-first indexes. Foreign-owner references are
indistinguishable from missing records. Generated migration `0008` must match
the runtime schema and be inspected before deployment.

A ready transaction atomically writes the run identity, initial run record,
assignment, Daily Brief, and four Reading Records. An unavailable or displaced
transaction atomically writes the run identity, initial run record, assignment,
and bounded top-level record. Later archive and notification results append
typed events to the run record. The server recomputes identity, invariants, and
the canonical checksum.

Initial records never contain learner answers. A learner response, artifact
link, later-usefulness note, source-status change, correction, replacement,
revisit, continuation, or missed-practice fact appends a typed `lab_event`.
Overlays may change effective presentation, but History always retains the
original. Generic events cannot impersonate typed events.

## API and ownership boundary

The existing bearer registration is generalized to
`lab_automation_registration`, binding one token fingerprint, one owner, and
an allowlist of operator capabilities. Existing monitor registrations are
preserved and bridged, never rewritten or silently broadened. Requests never
accept an owner identifier from the caller.

The Phase 3 surface is:

- `GET /api/automation/daily`: bounded profile, assignment state, recent
  source identities for no-repeat checks, queued Coach work, and source-status
  work for the credential-bound owner;
- `POST /api/automation/daily`: one validated run bundle with exactly one
  assignment outcome and references to bounded Coach or event work;
- the existing Coach endpoint for queue reads and append-only feedback;
- `GET /api/automation/export`: deterministic export for only the
  credential-bound owner and cursor; and
- browser `GET /api/lab/assignment/today`: the authenticated owner's effective
  learner-date assignment plus typed event overlays.

Learner responses and artifacts use browser-session routes. The browser cannot
post a Brief, choose curation metadata, bind an automation owner, read another
owner, or call the private export.

## Schedule and run lifecycle

The canonical operator time is 7:00 AM `America/New_York`, Monday through
Friday. While the scheduler is anchored in `America/Chicago`, the heartbeat
uses 6:00 AM local time; Chicago and New York retain a one-hour difference and
switch daylight-saving time together. Implementation tests both DST
transitions and five distinct weekday slots rather than adding 24-hour
intervals.

For each expected profile date the operator:

1. reads the operating record, active profile, bounded prior source identities,
   and queued Coach work;
2. curates four non-duplicative lanes or selects the truthful unavailable or
   displaced outcome;
3. validates URLs, sections, rights/access, freshness, purpose, downstream use,
   balance, and time cap before delivery;
4. prepares bounded Coach feedback and supported source-status or prior
   missed-practice events;
5. posts the complete run and confirms D1 accepted an immutable identity or
   exact replay;
6. exports the accepted D1 state through a fixed cursor, preserves the bundle,
   and appends its `archive_preserved` event; and
7. notifies only after D1 acceptance and that archive reconciliation, either that
   the Brief is ready or that intervention is required.

A run is not called missed while starting. Health checks wait six hours after
the expected slot before appending a missed-run observation. A practice day is
missed only after its learner date ends without a completion event. Neither
case creates catch-up debt or rolls an assignment forward.

If the endpoint or owner registration is unavailable, the operator preserves
the failure in the heartbeat task because D1 cannot truthfully accept it. If
the archive fails after D1 delivery, the operator appends that bounded run
failure and cannot claim reconciliation. A
later broken source gets a `source_status` event; a suitable alternative gets
a `replacement_link` event while the original remains visible. If no valid
four-lane Brief can be accepted, `brief_unavailable` is the only truthful
delivery state.

## Sites behavior

Today derives date, timezone, practice mode, assignment state, and readings
from the authenticated API. It has explicit loading, ready, unavailable,
intentionally displaced, missed, and completed views. It never imports
`app/dailyBrief.ts` as live state; that module may remain only as a fixture.

History groups each assignment with its profile version, state, run evidence,
original readings, learner responses, source failures, replacements,
corrections, later usefulness, and completion or missed events. Archive health
is bounded metadata; Sites exposes no local paths, fingerprints, raw source
material, or export contents.

## Local archive and recovery

The sync runner writes beneath the repository-relative, explicitly ignored
`.private/venture-judgment-lab/archive/` root, which is also excluded from
deployment.
It writes a temporary file, verifies counts and checksums, and atomically
creates one bundle named by cursor or run key. An identical existing bundle is
an idempotent replay; a different checksum is a hard conflict. The runner never
deletes, edits, or compacts a prior bundle.

Recovery creates a fresh D1 environment, verifies a manifest, imports in
deterministic dependency order, and reconciles owner/table counts and checksums
through the manifest cursor before traffic moves. The archive's own later
`archive_preserved` event is outside that cursor by definition and may be
reconstructed only as new dated recovery evidence, never represented as part
of the restored historical bundle. Rollback restores the prior private Sites
code while retaining all D1 and archive evidence.

## Notification and external-action boundary

The heartbeat asks for attention only when a Brief is accepted and ready or
when intervention is required for an unavailable Brief, source failure,
credential or endpoint boundary, archive mismatch, conflict, or overdue run.
Exact replay and intentional displacement do not produce a second ready alert.
No snapshot or alert may claim work authorization, send outreach, submit an
application, publish an artifact, or expose the Private Learning Record.

## Implementation and release proof

Ticket 15 must prove the entire operating slice before claiming Phase 3:

- schema/runtime/migration parity and owner isolation for all three tables;
- one outcome per owner/date, exact replay, conflicting replay, and concurrent
  duplicate rejection;
- all twelve existing pre-publication gates, including complete metadata,
  claim role, issuer interest, corroboration, carry questions, comparative
  rationales, withholding, diversity, deduplication, and the immutable
  pre-delivery write; plus no compile-time fallback;
- unavailable, displaced, late-source, replacement, correction, learner
  response, completion, missed-day, and no-catch-up behavior;
- bounded Coach queue and feedback round-trip in the same operator run;
- weekday and DST scheduling with no more than one result per date;
- deterministic export, ignored archive, replay/conflict, recovery, and D1
  count/checksum reconciliation;
- typecheck, production build, structural tests, isolated live D1 API smoke,
  migration inspection, and two fixed-point reviews; and
- five actual scheduled test days, a private Phase 3 deployment, confirmed
  runtime credential/owner registration, learner-visible status, and retained
  prior release for rollback.

Synthetic time travel establishes edge-case correctness but cannot replace the
five scheduled days or live endpoint/archive reconciliation.

## Source boundary

The accompanying primary-source note records the platform facts used here.
Scheduler and notification behavior must be rechecked against the installed
Codex automation contract at implementation time. D1 claims remain limited to
official transaction, consistency, and export documentation. The six-hour
grace, archive layout, assignment states, and API composition are Lab design
decisions rather than source claims.
