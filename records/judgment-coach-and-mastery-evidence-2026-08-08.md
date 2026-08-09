# Judgment Coach and Mastery Evidence Standard — 2026-08-08

## Decision

The Judgment Coach is a strict diagnostic layer applied only after the learner
commits an Independent First Pass. It identifies the weakest causal bridge and
demands an evidence-based revision when that gap is foundational. It never
grades a learner, supplies a model answer, rewards completion, or turns the five
judgment dimensions into a composite score.

The five dimensions are Sourcing, Diligence, Forecasting, Founder judgment,
and Communication. Evidence remains separate by dimension because strength in
one cannot compensate for a Foundational Error in another.

## Immutable coaching chain

### Coach Request

A Coach Request links to one already committed learner artifact. The learner
chooses one eligible dimension, states the exact diagnostic question, and
records a self-diagnosis before any competing interpretation or benchmark is
visible. The request confirms that the source is the learner's Independent
First Pass and contains only approved, bounded private evidence.

A source can have at most one request per dimension. A request cannot link to
another owner's work, an uncommitted draft, or a record whose contract does not
support the chosen dimension.

### Coach Feedback

The Codex operator appends one feedback record to one queued request. Feedback
must identify:

- the precise unsupported inference;
- the evidence gap;
- the recurring error and its prior occurrence count;
- the required revision;
- the next difficulty adjustment;
- a competing interpretation;
- a benchmark for defensible reasoning;
- whether the error is foundational; and
- whether the attempt already demonstrates a genuine disconfirming case.

The permitted difficulty adjustments are repeat at the same scope, narrow to
the foundation, require disconfirming evidence, transfer across a company,
increase ambiguity, timed defense, or advance independently. A Foundational
Error cannot advance independently.

Grades, weighted rubrics, school-style ratings, prestige points, and model
answers are undeclared data and are rejected rather than merely hidden in the
interface.

### Revision Attempt

One Revision Attempt answers one Coach Feedback record. It preserves the
revised judgment, evidence added or reinterpreted, response to the unsupported
inference, strongest disconfirming case, and Decision Delta. The learner
confirms that the change is genuine and privacy-bounded. The original source,
request, and feedback remain unchanged.

If a later coaching round is needed, it begins from a distinct committed work
artifact rather than replacing this chain.

### Mastery Evidence

Every appended Coach Feedback produces a new dimension-specific Mastery
Evidence snapshot. The state is:

- `observed_once` after one qualifying coached attempt;
- `developing` after more evidence exists but the full threshold is unmet; or
- `repeated_or_corroborated` only when every rule below is true.

The repeated-or-corroborated threshold is exact:

1. at least three distinct committed Independent First Pass attempts;
2. evidence across at least two companies;
3. at least one genuine Revision Attempt or coach-confirmed disconfirming case;
4. no Foundational Error in the latest two attempts.

Duplicate coaching on one source cannot inflate the attempt count. Older clean
attempts cannot conceal a Foundational Error in either of the latest two.
Mastery Evidence names its attempt, company, latest-feedback, revision or
disconfirmation basis and every remaining gap. It does not claim permanent
mastery and it can be superseded only by another dated evidence snapshot.

## Withholding and queue boundary

Sites creates requests and revisions through the authenticated learner session.
Only the bearer-protected automation route can read the queue or append Coach
Feedback and Mastery Evidence. The configured automation credential is mapped
to one private owner through the existing active automation registration.

The operator receives only queued requests and an explicit bounded projection
of each linked source. It does not receive unrelated records. Source projections
use record-type allowlists, cap nested values and total size, and remove
undeclared transcript, contact, secret, credential, rating, score, grade, and
model-answer fields. A handled request leaves the queue because its immutable
feedback child exists; no mutable status flag is required.

The automation route never sends correspondence, publishes work, submits an
application, or changes a learner record. It accepts one bounded feedback
object and atomically appends feedback plus the resulting Mastery Evidence.

## Edge cases

- A convincing result with a missing causal bridge is still a Foundational
  Error.
- A disagreement is not foundational unless the learner's inference is
  unsupported or the missing evidence makes the judgment unreliable.
- Repeating the same company three times cannot earn repeated-or-corroborated.
- Three companies with unresolved Foundational Errors cannot earn it either.
- A cosmetic rewrite does not satisfy the revision requirement.
- A genuine disconfirming case can satisfy the revision-or-disconfirmation
  branch, but not the attempt, company, or latest-two-clear rules.
- Feedback appended to another owner's request is not found, preserving owner
  isolation without revealing that the foreign record exists.
- Generic History events cannot replace any typed coaching record.

## Synthetic round-trip gate

The isolated API proof commits three Diligence attempts across two companies,
queues exactly those bounded sources, rejects pre-revealed answers and grades,
appends one foundational diagnosis, preserves a genuine Revision Attempt,
appends two later clean diagnoses with deterministic recurring-error counts,
and produces `repeated_or_corroborated` only on the third attempt. It also
proves duplicate, owner, generic-event, and bearer boundaries.

This checkpoint remains local. The completion program permits one private
deployment for Phase 2 only after the Diligence Case and Judgment Coach gates
are both complete and the phase receives its fixed-point reviews.
