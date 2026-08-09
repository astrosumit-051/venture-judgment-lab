# Diligence development ladder

**Accepted:** 2026-08-08

**Canonical surface:** Private Learning Record; the Sites workspace is a private interaction layer

**Outcome:** Move one locked Snapshot Judgment and Weekly Underwrite into a defensible investment judgment without rewriting the learner's original view, hiding disconfirmation, or converting diligence into a score.

## Decision

Use one **Diligence Case** with seven immutable child stages. The case can open
only from a Weekly Underwrite linked to the same locked Snapshot Judgment. The
stages form one exact prefix: a later stage is unavailable until every earlier
stage exists once, in order.

1. Snapshot and Underwrite foundation.
2. Customer and market evidence.
3. Technical and product assessment.
4. Business-model and economic analysis.
5. Anti-Memo and premortem.
6. Full investment memo.
7. Oral defense and simulated investment committee.

The ladder is evidence-gated, not calendar-gated. It uses the existing
Underwrite and Monthly Calibration practice allocations across as many weeks as
the evidence requires. Recruiting Surge and Exam Mode may pause a case without
catch-up debt. No Diligence Case creates hours above the accepted 10–12-hour
weekly practice budget.

## Logic-prototype finding

A throwaway in-memory state machine tested an attempted Anti-Memo before the
foundation, a duplicate foundation, the complete legal sequence, and a stage
attempt after completion. Counting records alone was insufficient: corrupted
or out-of-order records could otherwise appear to unlock the next stage.

The durable rule therefore verifies that committed stages are the exact
canonical prefix by both stage identity and index. A duplicate, gap, mismatch,
or completed case exposes no legal next stage. The terminal harness was deleted
after this rule was absorbed into the production contract.

## Evidence carried by every stage

Every stage preserves:

- one to twelve public or privacy-bounded private sources;
- the observed evidence and reliability limits for each source;
- known limitations;
- the strongest disconfirming evidence;
- the learner's bounded inference;
- the next evidence required;
- a Decision Delta against the committed evidence before it; and
- confirmation that raw transcripts, contact details, secrets, and unapproved
  confidential material were omitted.

A public source keeps its original HTTP(S) URL. Private evidence keeps only a
concise context description. A source list is not an Evidence Ledger unless the
learner separates observation, reliability, inference, and disconfirmation.

Each stage is dated in the case timezone on the day it is actually committed.
The original Snapshot, Underwrite, case, and earlier stages remain unchanged.
Later corrections, reflections, coaching notes, source status, and hindsight are
appended as bounded, privacy-confirmed History events. They cannot alter stage
identity, satisfy a missing stage, or unlock the next stage.

## Stage contracts

### 1. Snapshot and Underwrite foundation

The learner restates, without revising, the linked Snapshot crux and the
Underwrite's deeper decision. The stage names the unresolved claim that makes
the Diligence Case worth scarce practice time. If the Snapshot and Underwrite do
not refer to the same company and identity chain, the case cannot open.

### 2. Customer and market evidence

Separate observed customer behavior from market inference. Preserve who has the
problem, how urgently they act, current alternatives, buying or adoption
evidence, and the mechanism by which the opportunity can become venture scale.
Name the customer or market unknown that remains load-bearing.

### 3. Technical and product assessment

Separate demonstrated product behavior from technical narrative. Preserve the
product assessment, technical constraints, and evidence for or against
defensibility. A feature, model, credential, or architecture adjective does not
become a durable advantage without a causal mechanism and disconfirming test.

### 4. Business-model and economic analysis

Trace how the company creates, captures, and scales value. Preserve the revenue
mechanism, cost structure, economic assumptions, and the constraint most likely
to break the venture-scale path. Unsupported spreadsheet precision does not
substitute for source-backed assumptions.

### 5. Anti-Memo and premortem

Commit the strongest causal non-investment case before writing the full memo.
It must state:

- the non-investment case;
- the mechanism by which the company fails;
- the leading indicators that failure is becoming more likely; and
- the evidence that would reverse the Anti-Memo.

A generic risks list or weak devil's advocate does not satisfy this stage.

### 6. Full investment memo

Integrate the prior evidence into one Pursue, Watch, or Pass recommendation and
a complete investment memo. Preserve remaining dissent and unresolved evidence
rather than sanding them out for narrative coherence. The memo earns no special
authority over the dated records it cites.

### 7. Oral defense and simulated investment committee

Use three to twelve timed questions, each with a 30–300 second limit. Preserve
the question, answer summary, and explicit concession—or an honest statement
that no concession was made. Then preserve the changed judgment, unresolved
issues, and simulated investment-committee decision with rationale.

No raw audio is required. The defense produces no grade, founder score,
composite score, or claim that a real fund made an investment decision.

## Server and identity gates

- One owner may open at most one Diligence Case for a Weekly Underwrite.
- The case parent must be that owner's Weekly Underwrite, whose parent and
  declared Snapshot identifier must both equal the case's Snapshot identifier.
- The case company and timezone must match the locked Snapshot.
- Every Diligence stage must be owned by the same learner, parented by its
  declared case, dated no earlier than the case, and use the case timezone.
- The server derives stage index, label, and identity; client claims do not
  control sequence.
- A stage can exist only once per case, and only the next canonical stage can be
  committed.
- Database uniqueness backs the application checks for both case and stage
  identity so concurrent retries cannot replace evidence.
- Owner-scoped reads expose the original case and all stages; the write path has
  no update or delete operation.

## Private learning surface

The Diligence workspace shows the full ladder, marks committed stages as
immutable, names the next legal stage, and keeps later stages visibly locked.
It opens cases from unused Underwrites, shows the linked Snapshot and
Underwrite, collects stage-specific evidence, and renders every committed case
and stage in History.

This checkpoint is implemented locally with a generated D1 migration. It is not
deployed independently: the governing completion program permits one private
deployment for Phase 2, after the separate Judgment Coach ticket and synthetic
round-trip gate are complete.

## Boundary with later coaching

This ladder defines admissible evidence and sequence. It does not decide
mastery, reveal a model answer, or generate coach feedback. `coach_request`,
`coach_feedback`, `revision_attempt`, and `mastery_evidence` remain the separate
Judgment Coach decision. A later coach can point to one immutable stage and
require a new revision record; it cannot rewrite the stage or unlock a skipped
stage.
