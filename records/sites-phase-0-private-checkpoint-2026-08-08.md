# Sites Phase 0 Private Checkpoint — 2026-08-08

Status: deployed; awaiting learner acceptance

## Scope

This checkpoint publishes the already accepted core Lab together with the
Forecasting, Founder Evidence, and Sourcing systems. It is the one private
Sites release permitted for Phase 0. The local Markdown workspace remains the
canonical durable record.

## Deployment identity

- Sites project: `Venture Judgment Lab`
- Production URL: <https://venture-judgment-lab.sahsumit4545.chatgpt.site>
- Saved Sites version: 4
- Source commit: `fb23e71644c8c25a275f10c1d9d9ed296ed02988`
- Deployment result: succeeded

## Access boundary

Access was checked immediately before and after deployment:

- access mode: custom;
- current caller role: owner;
- allowed users: `sahsumit4545@gmail.com` as owner;
- allowed groups: 0; and
- external visitors: 0.

The release therefore used the owner-only private deployment path. No access
token or private learner record is preserved in this document.

## Verification evidence

The exact source state passed:

- TypeScript typecheck;
- all three focused Node tests;
- production build;
- schema generation with no migration change;
- the live local API smoke suite with 16 immutable records and 8 append-only
  events under an isolated verification identity; and
- two fixed-point reviews with no remaining actionable findings.

The API smoke explicitly covered future-only Forecasts, prospective Sourcing
Experiments, server-stamped lead chronology, experiment-window and timezone
invariants, correction overlays, attribution and channel funnel metrics,
Founder Evidence safeguards, calibration scoring, and owner isolation.

After deployment, the private authorization path returned HTTP 200 for the
production document and current client bundle. The deployed bundle contains
Forecast, Founder Evidence, and Sourcing Progress surfaces. A production API
read without a ChatGPT learner identity returned HTTP 401 `Authentication
required`, preserving the authenticated data boundary.

The shared browser profile was occupied and the bundled isolated browser CLI
was unavailable, so the final authenticated learner-session interaction is
the explicit acceptance step below rather than a claimed automated result.

## Rollback evidence

Sites versions 1, 2, and 3 remain saved alongside version 4. Version 3 still
points to commit `9569923c5b475aa29551a2b4ffcf86efd0da0482`, so the previous
checkpoint remains available if version 4 is rejected.

## Learner acceptance gate

Before Phase 1 begins, the learner should open the private URL while signed in
as `sahsumit4545@gmail.com` and confirm:

1. Forecasting, Founder Evidence, and Sourcing are visible and understandable.
2. Sourcing cohorts show qualified, reply, meeting, Snapshot, and Underwrite
   evidence by attribution class and channel.
3. Forecasts require a future resolution date.
4. The History surface still presents immutable records and appended events.
5. No terminology, teaching-flow, privacy, or evidence-preservation issue
   blocks continued use.

Ticket 13 remains claimed until that acceptance or a dated rejection is
recorded. No Phase 1 Sites deployment should begin before this gate closes.
