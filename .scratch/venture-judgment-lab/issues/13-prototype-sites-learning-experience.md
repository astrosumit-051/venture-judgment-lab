# Prototype the Sites learning experience

Type: prototype
Status: claimed
Parent: ../map.md
Blocked by: 03, 04, 05, 06

## Question

How should Venture Judgment Lab present Today, the Daily Brief, company work, Forecasts, Second-Order Maps, feedback, progress, recruiting, and the date-stamped archive so the site behaves like a demanding personal teacher rather than a content dashboard?

## Comments

- 2026-08-05: The Sites project `Venture Judgment Lab` is already provisioned and bound through `.openai/hosting.json`. Live inspection confirmed custom private access for the learner, zero saved versions, and no current preview or production deployment. The local Lab record remains the canonical content source when this ticket reaches the frontier.
- 2026-08-05: The learner chose to build a private v0 now from the accepted core loop instead of waiting for every later curriculum decision. This pass includes Today, Daily Brief, Snapshot Judgment, Weekly Underwrite, and immutable history. Forecast, coaching, recruiting, and calibration behavior will be added only after their standards are resolved.
- 2026-08-05: Private Sites version 1 was published at `https://venture-judgment-lab.sahsumit4545.chatgpt.site`. The ticket remains claimed pending learner review of the teaching flow, terminology, and evidence-preservation behavior.
- 2026-08-05: Learner review exposed a blocking defect: the Daily Brief contained Lab-written orientation summaries but no original reading links. Private version 2 replaces those placeholders with a source-gated 51-minute four-reading Brief and completes Forecast, Second-Order Map, practice-mode, structured Evidence Ledger, and append-only update flows. End-to-end verification preserved ten linked records plus a later event under an isolated identity and rejected invalid evidence and incorrect mode arithmetic. Version 2 is live at `https://venture-judgment-lab.sahsumit4545.chatgpt.site`; this HITL ticket remains claimed until the learner confirms the deployed experience.
- 2026-08-08: Published the single Phase 0 checkpoint as private Sites version 4 from source commit `fb23e71644c8c25a275f10c1d9d9ed296ed02988`. The access policy remained custom owner-only for `sahsumit4545@gmail.com`, with zero groups and zero external visitors; versions 1–3 remain available for rollback. Typecheck, focused tests, production build, schema check, a 16-record/8-event live API smoke suite, two fixed-point reviews, authenticated production document and bundle reads, and the unauthenticated API boundary all passed. The ticket remains claimed pending the learner acceptance checklist in [Sites Phase 0 Private Checkpoint — 2026-08-08](../../../records/sites-phase-0-private-checkpoint-2026-08-08.md).
