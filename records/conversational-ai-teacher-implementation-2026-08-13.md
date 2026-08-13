# Conversational AI Teacher Implementation — 13 August 2026

## Decision preserved

Conversational entry is now the Venture Judgment Lab's default learning
interaction. The learner answers one adaptive question at a time, reviews a
bounded structured draft, and must explicitly choose **Confirm and preserve**
before the Lab creates an immutable record. Existing structured entry remains
available behind **Edit structured draft** or **Advanced entry**.

The Independent First Pass remains protected. Before commitment, the teacher
may clarify the learner's evidence and assumptions but cannot supply a model
answer or competing investment conclusion. The full visible transcript is
append-only and owner-scoped; hidden reasoning, credentials, authorization
headers, unrelated records, raw correspondence, and undeclared provider
metadata are not stored or sent.

## Implemented surface

- Today now makes **Talk to Coach** the primary action and resumes incomplete
  conversations.
- Source is renamed **Sourcing**. Today and Brief otherwise retain their prior
  role and visual structure.
- All 18 existing workflow kinds can be started from the Teacher or their
  retained review surface.
- Conversation APIs support start, resume, sequenced turns, idempotent commit,
  and append-only abandonment.
- D1 adds owner-indexed conversation headers and strictly sequenced visible
  turns without transforming or backfilling any existing record.
- Commitment delegates to the same record and event validators used by manual
  entry. Provider failures preserve the submitted learner turn, never commit a
  partial artifact, and offer retry or structured editing.
- History exposes completed conversation transcripts in a collapsed view.

## Validation evidence

The release passed the production build, 62 unit and contract tests, type
checking, the unchanged API smoke suite, the new owner-isolated conversational
round trip, append-only and idempotency checks, desktop interaction review, and
390 by 844 mobile review. The generated D1 migration and owner/session and
session/sequence indexes were inspected; runtime initialization retains
`PRAGMA optimize`.

## Private release and provider boundary

Sites version 6 was privately released to the owner-only Venture Judgment Lab
on 13 August 2026 at:

https://venture-judgment-lab.sahsumit4545.chatgpt.site

The deployment deliberately contains no hard-coded provider choice or secret.
Until `LAB_AI_BASE_URL`, `LAB_AI_API_KEY`, and `LAB_AI_MODEL` are configured as
private server settings, the Teacher preserves the learner's answer, performs
no partial commit, and shows a bounded setup message. A laptop-compatible
endpoint remains a local-development option only and is never a production
fallback.
