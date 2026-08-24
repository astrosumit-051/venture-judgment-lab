# Course-first curriculum foundation checkpoint

Date: 2026-08-24
Scope: local Venture Judgment Lab only
Curriculum state: not started

## Preserved decision

The accepted course-first reset now has a versioned, immutable data foundation.
One Curriculum Epoch owns dated Practice Days; each ready Practice Day owns one
Daily Brief and its four Reading Records. Historical Daily Brief payloads remain
readable. This checkpoint does not create the learner's actual Day 1 epoch.

The contract preserves the six ordered breadth rotations, two three-week
confirmation sprints, 105-minute weekdays, exact 720-minute Normal and
Calibration weeks, and the post-cycle 70/30 allocation. Daily sourcing supplies
only a search surface and falsifiable hypothesis; company names remain withheld.

## Evidence boundaries

- Checkpoint progress is projected from immutable records and events, never
  stored as mutable completion flags.
- Three owner-linked Sourcing Leads are required before a Practice Day Snapshot
  can lock, and the selected lead must belong to that same Practice Day.
- Existing unfinished conversations are preserved by appending a
  `pre_curriculum` abandonment turn when the first epoch is committed.
- Practice Day links are owner-validated before they can contribute to progress.
- Daily Operator replay remains checksum-idempotent; legacy v1 assignments
  remain accepted and readable.

## Verification

- `npm run local:verify` passed on 2026-08-24.
- 72 unit and contract tests passed.
- The isolated API journey passed epoch/Practice Day creation, two-draft
  archival, owner isolation, exact replay/conflict, reading responses, linked
  Forecast progress, deterministic export, restart persistence, and 10,000-row
  archive performance.
- The local browser smoke passed navigation, provider recovery, responsive fit,
  lazy loading, keyboard focus, and large-history pagination.

## Deliberately deferred

The selected Today visual redesign, Practice/Evidence navigation, actual Day 1
route acceptance, live source curation, reminder work, hosted deployment, and
all external recruiting actions remain separate approval-gated work.
