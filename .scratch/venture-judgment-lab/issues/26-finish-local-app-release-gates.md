# Finish the local app release gates

Type: task
Status: resolved
Parent: ../map.md

## Question

Close the remaining local-runtime gaps before learner testing: make lint clean,
defer Teacher and advanced workflow code until opened, and make restart,
provider-failure, browser, and large-archive verification reproducible through
`npm run local:verify` without touching the hosted Site or learner-owned work.

## Comments

- 2026-08-21: Claimed after the learner asked to finish every outstanding task.
  The agreed seams remain the local npm commands, owner-scoped API contracts,
  and browser-visible workflow and performance behavior.
- 2026-08-21: Resolved after `npm run local:verify` reproduced lint, build,
  immutable-contract, restart-persistence, provider-failure, full-workspace
  browser, lazy-loading, keyboard, and 10,000-record / 30,000-event History
  gates against disposable local state. Teacher implementation code now waits
  for Teacher itself, and Brief responses again append through the normalized
  write contract.

## Answer

The local app is ready for learner testing. Today remains the only eager shell;
the navigation workspace, full Teacher, advanced judgment forms, Sourcing,
Recruiting, Diligence, Coach, and History are view-loaded. Non-Teacher entry
strips do not fetch the Teacher implementation, advanced judgment views do not
fetch Today’s assignment, and recoverable Luna failures preserve the visible
learner turn and retry action.

The release command uses disposable state only, verifies persistence across a
server restart, renders every workspace, paginates History in a real browser
with at least 10,000 records and 30,000 events, and removes its database and
browser profile afterward. No hosted request or external mutation is part of
the verification path. The final run passed 65 tests, served five large API
pages in 9.3–10.9 milliseconds, became browser-usable in 107.7 milliseconds,
showed navigation feedback in 1.7 milliseconds, and rendered the second large
History page in 32.4 milliseconds.
