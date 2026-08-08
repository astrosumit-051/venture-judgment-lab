# Design the sourcing mastery system

Type: prototype
Status: resolved
Parent: ../map.md
Blocked by: 02, 03

## Question

How should the Lab develop differentiated company discovery, fast qualification, founder outreach, conversion, relationship quality, funnel measurement, and attribution while building on the learner's Awesome Fund experience?

## Comments

- 2026-08-08: Claimed for the completion pass. The implementation will turn sourcing into an auditable funnel with dated provenance, signal and channel evidence, qualification reasoning, next actions, outcomes, and calibration against later company quality.
- 2026-08-08: Fixed-point review cleared the primary functional findings but found that typed metadata corrections were preserved without becoming the effective value used by metrics, display, and Snapshot identity checks. Issue 09 remains claimed until the latest valid correction is applied as an overlay while the original stays immutable.
- 2026-08-08: Implemented and verified the effective correction overlay, atomic provenance correction, linked-experiment channel invariant, and all-event discovery-date boundary. Production build, typecheck, three focused tests, staged-diff validation, and the 17-record/8-event live API smoke suite pass. Both fixed-point reviewers returned PASS with no actionable blockers.

## Answer

Use three linked, immutable evidence types: a bounded Sourcing Experiment that commits the discovery hypothesis and stop rule before results; one domain-unique Sourcing Lead that preserves original attribution, signal, fast qualification, disqualifier, outreach angle, and next action; and dated Sourcing updates that advance the funnel one evidenced stage at a time or append rediscovery and typed correction evidence without rewriting origin. Only explicitly independent origins count as independent discovery, and contradictory database, assignment, channel, visibility, and experiment combinations are rejected. The latest valid correction becomes the effective value for current display, cohort metrics, and downstream identity checks while the original remains preserved. A lead must reach Qualified before it can parent a Snapshot; downstream Snapshots and Underwrites then provide conversion evidence by experiment, attribution class, and channel. Relationship quality is behavioral rather than scored, private material is bounded and consent-confirmed, and the work uses existing Daily Loop, Weekly Underwrite, and recruiting allocations rather than adding hours. The full durable standard is [Sourcing Mastery System — 2026-08-08](../../../records/sourcing-mastery-system-2026-08-08.md).
