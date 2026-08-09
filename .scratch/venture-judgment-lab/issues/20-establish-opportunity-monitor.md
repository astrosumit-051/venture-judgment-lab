# Establish the official opportunity monitor

Type: task
Status: resolved
Parent: ../map.md

## Question

Create a weekly first-party monitor for qualifying internships, Investing Milestones, application deadlines, visa restrictions, and status changes without duplicating or silently overwriting prior observations.

## Comments

- 2026-08-08: Claimed for the Phase 1 Opportunity Monitor session. Scope is the Monday 8:00 AM Eastern heartbeat, first-party target registry, bounded append-only observation endpoint, idempotency and material-change rules, failure and decision notifications, synthetic verification, and creation of the live automation. It will not send outreach, submit an application, or deploy the private phase checkpoint.
- 2026-08-08: Implemented the seven-target first-party registry, stable role-cycle identity, complete bounded immutable runs, owner-bound bearer registration, exact replay, material observations, stale-deadline decisions, missed-run health with completion grace, authorization and external-action boundaries, private Recruiting status UI, and the active Monday heartbeat. The production build, 17-test suite, six migrations, changed-module lint, and a 30-record/8-event live D1 smoke run passed. Fixed-point Standards and Spec re-reviews returned PASS after the auditability, cycle, and timing corrections. No outreach, application, publication, or phase deployment occurred.

## Answer

Operate one Official Opportunity Monitor every Monday at 8:00 AM Eastern against the seven registered first-party pages for Bessemer, Pear Fellows, Dorm Room Fund, Keyhorse Capital, Contrary, Insight Partners, and Y Combinator. Every run accounts for all targets, keeps its exact checked times and bounded snapshots or failure evidence, and is idempotent by scheduled run key. Replays return the existing run; conflicting evidence cannot replace it.

Give each role or program cycle a stable identity made from its normalized official URL and lowercase cycle key. A new annual cycle on a reused page becomes a new immutable Recruiting Opportunity, including when the prior and next cycle appear together. A material change within one cycle becomes a dated Opportunity Observation; a recheck alone creates no child record. Open pages past their deadline require learner judgment, and a scheduled run is reported missed only after a six-hour completion grace.

The authenticated learner registers a private bearer credential whose one-way fingerprint binds the monitor to one owner. First-party snapshots cannot assert role authorization, Authorized evidence already preserved privately is carried forward, raw page content and undeclared fields are rejected, and generic endpoints cannot mutate monitor records. Notifications are limited to new opportunities, material changes, bounded source failures, and learner decisions. The active heartbeat records evidence only: it cannot contact a firm, submit an application, publish an artifact, or claim work authorization. The private endpoint secret and live registration remain part of the later Phase 1 private checkpoint deployment gate.
