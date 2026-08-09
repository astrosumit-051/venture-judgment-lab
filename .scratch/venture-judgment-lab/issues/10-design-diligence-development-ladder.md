# Design the diligence development ladder

Type: prototype
Status: resolved
Parent: ../map.md
Blocked by: 06, 08

## Question

What sequence of evidence gathering, customer and market work, technical analysis, business-model reasoning, Countercases, memo writing, oral defense, and simulated investment committee practice will move the learner from sourcing handoff to defensible investment judgment?

## Comments

- 2026-08-08: Claimed as the first open, unblocked, unclaimed Wayfinder frontier ticket. The governing completion plan supplies the learner-approved seven-stage Diligence Case sequence and evidence rules; this session will preserve that decision in the Private Learning Record, implement its append-only stage gates in the private Lab, and verify the behavior without touching the separately claimed Pear or immigration work.

## Answer

Accepted and implemented the seven-stage ladder in
[`records/diligence-development-ladder-2026-08-08.md`](../../../records/diligence-development-ladder-2026-08-08.md).
A Diligence Case opens only from one matching locked Snapshot Judgment and
Weekly Underwrite, then advances through foundation, customer and market,
technical and product, business and economics, Anti-Memo, full memo, and oral
defense stages. Every stage is an immutable child with bounded sources,
reliability limits, limitations, disconfirmation, inference, next evidence,
privacy confirmation, and a Decision Delta.

A throwaway state-machine prototype showed that record count alone could expose
later work after a corrupted sequence. The production contract therefore
validates that committed stages are the exact canonical prefix by identity and
index. The prototype harness was deleted after that rule was absorbed.

The private Lab now includes a Diligence workspace, typed server validation,
owner and parent identity checks, database uniqueness for cases and stages,
History rendering, and a generated D1 migration. The server rejects skipped or
duplicate stages, mismatched Snapshot and Underwrite chains, unbounded or
undeclared evidence, missing privacy confirmation, incomplete Anti-Memos,
malformed oral defenses, generic event bypasses, and stages after completion.

Verification passed through the production build, 21 structural and unit tests,
and an isolated owner-scoped API smoke preserving 38 immutable records and the
complete seven-stage sequence. This checkpoint remains local until the separate
Judgment Coach ticket and Phase 2 synthetic round-trip gate are complete; it is
not deployed as an extra phase release.
