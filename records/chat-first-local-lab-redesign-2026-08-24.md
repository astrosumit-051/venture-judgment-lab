# Chat-First Local Lab Redesign — 24 August 2026

## Decision

The loopback-local Venture Judgment Lab now treats conversation as the default
interface. Today opens with Luna's single composer, while exactly four
destinations remain permanent: Today, Work, Record, and More. The former
feature catalog remains available as a searchable capability and structured
entry escape hatch in More rather than competing with the learner's next step.

## Evidence boundary

Natural-language requests route only into the existing 18 typed conversation
contracts. Explicit and today-context language is deterministic; broader
language may use a bounded private-provider classifier that can select only an
allowlisted workflow. If the provider is absent or uncertain, Luna returns at
most three relevant choices. External actions, invented evidence, validator
bypass, and automatic preservation remain prohibited.

A routed opening message is the first append-only learner turn before any
provider response. Provider failure therefore leaves the learner's thought
visible and recoverable. Every workflow still moves through Talk, Review, and
explicit **Confirm and preserve**. After preservation, Luna explains what was
saved and suggests a next action without starting it.

## Verification

`npm run local:verify` passed lint, the production build, 69 unit and contract
tests, owner-isolated API and conversation smoke, restart persistence, and the
real browser suite. Browser checks covered four-destination desktop and mobile
navigation, no mobile overflow, visible keyboard focus, structured entry,
routed provider recovery, lazy loading, and pagination over 10,000 records and
30,000 events. The browser became usable in 275.8 milliseconds; advanced-entry
feedback appeared in 3.7 milliseconds; the measured 10,000-record page rendered
in 30.9 milliseconds.

The hosted Site was outside this release gate and was not accessed, deployed,
synchronized, migrated, retired, or otherwise changed. Unrelated recruiting
and opportunity-monitor work in the checkout was preserved untouched.
