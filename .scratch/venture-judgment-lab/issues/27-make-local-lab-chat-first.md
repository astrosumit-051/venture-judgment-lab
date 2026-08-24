# Make the local Lab chat-first

Type: task
Status: resolved
Parent: ../map.md

## Question

Replace the local app's fifteen-workspace catalog with a chat-first Today
experience and four permanent destinations, route natural-language intent into
the existing allowlisted Learning Conversation workflows, preserve the Review
then Preserve evidence boundary, and retain searchable manual access without
touching the hosted Site.

## Comments

- 2026-08-24: Claimed after the learner approved the chat-first redesign. The
  agreed seams are the owner-scoped intent-routing API, conversation creation
  API, browser-visible Today/Work/Record/More experience, and existing local
  release command.
- 2026-08-24: Implemented and reviewed the local-only redesign. Standards and
  specification review hardened action-language routing, current-date context,
  atomic first-turn preservation, bounded unfinished-work queries, clarified
  opening-message retention, Work resume/error states, and timezone display.
  `npm run local:verify` passed lint, build, 69 unit and contract tests, all API
  and persistence suites, and real desktop/mobile browser smoke including the
  10,000-record archive.

## Answer

The local Lab now opens with one Luna composer and exactly four permanent
destinations: Today, Work, Record, and More. Natural language first uses
deterministic routing and then, only when needed and configured, a bounded
allowlist classifier over the existing 18 workflow contracts. The opening
learner thought is preserved before Luna replies, provider failure cannot lose
it, and every workflow still requires structured Review and explicit Confirm
and preserve before an immutable write. Work groups resumable drafts,
upcoming commitments, and preserved reference by status; More keeps searchable
conversation and structured-entry escape hatches within two actions. The
hosted Site and its release state were not accessed or changed.
