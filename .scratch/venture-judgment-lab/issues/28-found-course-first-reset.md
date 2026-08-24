# Found the course-first Lab reset

Type: task
Status: resolved
Parent: ../map.md

## Question

Create the immutable curriculum epoch and Practice Day foundation for the
approved course-first reset: version the Daily Operator payload without
breaking historical Briefs, project epoch and checkpoint progress through
Today, and preserve unfinished pre-curriculum conversations outside the new
progression. This ticket does not build the selected visual redesign, start
Day 1, notify the learner, or change the hosted Site.

## Acceptance

- The six breadth rotations, twelve-week structure, 720-minute Normal and
  Calibration weeks, 105-minute weekday route, and post-cycle 70/30 rule are
  expressed and validated as domain contracts.
- A ready v2 Daily Operator run carries one immutable curriculum epoch and
  Practice Day alongside the existing four-reading Brief; v1 runs remain
  valid and readable.
- The operator commits `curriculum_epoch` once per owner and
  `practice_day` once per learner date, links the existing Daily Brief beneath
  the Practice Day, and preserves exact-replay/conflict behavior.
- Today returns `{ epoch, practiceDay, assignment, progress }`; progress is
  derived from linked immutable records and events rather than stored flags.
- Unfinished conversations may be append-only archived as pre-curriculum and
  excluded from active-work projections without deletion.
- Focused tests, the full local release gate, a two-axis review, and a targeted
  commit complete the ticket.

## Comments

- 2026-08-24: Claimed after the learner approved the course-first plan and
  merged desktop visual target. The pre-agreed public seams are the pure
  curriculum/practice-day contract, authenticated Daily Operator POST, and
  learner-facing Today GET projection.
- 2026-08-24: First two-axis review rejected completion-after-readings,
  non-independent discovery counting, multiple same-day Snapshots, and an
  under-specified confirmation cycle. The implementation now withholds course
  completion until every route output exists, counts effective Independent
  discovery only, permits exactly one Snapshot, advances curriculum days in
  order, and locks two evidence-qualified finalists into three-week sprints.
- 2026-08-24: Re-review identified catch-up debt, concurrent third-company
  overfill, backdated finalist selection, cross-date daily evidence, and a
  missing successful completion proof. Curriculum ordinals now derive from
  eligible weekdays, daily company slots and the Snapshot are DB-unique,
  qualification follows Day 30, linked evidence preserves the Practice Day
  date, and API acceptance proves both closed and open completion gates.
- 2026-08-24: Final scope review found that Forecast lacked a submitted date to
  compare. The server now rejects supplied/backdated Forecast dates, derives
  `committedLearnerDate`, and permits the link only on the active Practice Day
  in its preserved timezone.
- 2026-08-24: Resolved after `npm run local:verify` passed with 73 tests, the
  isolated course-first API journey proved both withheld and successful
  completion, and final correctness plus scope reviews found no actionable
  issue in `3222130...08b9a1a`.

## Answer

The local Lab now has the immutable course-first foundation. A versioned Daily
Operator can establish one owner-bound Curriculum Epoch, append eligible-date
Practice Days, nest the existing four-reading Daily Brief below each day, and
project `{ epoch, practiceDay, assignment, progress }` without changing legacy
v1 assignment readability. First-epoch creation preserves unfinished prior
conversations by appending a `pre_curriculum` archive boundary rather than
deleting or rewriting them.

The contracts enforce the six rotations, two evidence-qualified three-week
confirmation sprints, exact 720-minute week variants, 70/30 post-cycle rule,
and no-catch-up-debt calendar. Daily progress counts only effective Independent
discovery, owns exactly three DB-slotted companies and one DB-unique Snapshot,
binds dated evidence and Forecasts to the active Practice Day, and withholds
Preserve until readings, company judgment, Forecast, and recruiting evidence
all exist. The selected Today redesign and actual Day 1 epoch remain the next
ticket; hosted data and external systems were untouched.
