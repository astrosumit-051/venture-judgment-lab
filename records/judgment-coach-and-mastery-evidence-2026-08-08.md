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
- the recurring error, stable error kind, and prior occurrence count;
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

Recurring errors use a bounded taxonomy: unsupported causal bridge,
anecdote-to-generalization, source-reliability blind spot, missing
disconfirmation, base-rate neglect, identity or attribution error, calibration
error, founder halo effect, unclear Decision Delta, communication without
evidence, or another explicitly bounded pattern. The diagnosis remains
attempt-specific prose, while the stable kind detects the same failure across
different wording. `other_bounded_pattern` additionally requires a stable,
lowercase underscore sub-key so unrelated errors can never share one recurrence
count. The operator queue exposes prior kinds, keys, counts, and latest
diagnoses only for dimensions represented by currently queued requests. It
returns no historical diagnoses when the queue is empty.

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
Evidence snapshot. A later Revision Attempt atomically produces another
snapshot, so a qualifying revision updates the state even when it arrives after
the third feedback. Feedback and revisions use an optimistic dimension-history
gate inside the same database batch as their resulting Mastery Evidence. If a
concurrent coaching write changes that history, the losing submission
recomputes its recurrence count and mastery snapshot before retrying; stale or
partial derived evidence cannot commit. The state is:

- `observed_once` after one qualifying coached attempt;
- `developing` after more evidence exists but the full threshold is unmet; or
- `repeated_or_corroborated` only when every rule below is true.

The repeated-or-corroborated threshold is exact:

1. at least three distinct committed Independent First Pass attempts;
2. evidence across at least two companies;
3. at least one genuine Revision Attempt or coach-confirmed disconfirming case;
4. no Foundational Error in the latest two attempts.

Company identity is Unicode-normalized, whitespace-normalized, and
case-insensitive for threshold counting, so spelling or capitalization cannot
turn one company into two. Duplicate coaching on one source cannot inflate the attempt count. Older clean
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

Later corrections, reflections, source status, coaching notes, and hindsight
may append to any coaching record only as bounded, privacy-confirmed History
events. Those notes preserve and annotate the original; they do not replace a
typed record or retroactively rewrite its dated Mastery Evidence. A later typed
feedback or revision produces the next evidence snapshot.

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
appends one foundational diagnosis, then two clean diagnoses with taxonomy-backed
recurring-error counts despite different wording. The state remains developing
after the third feedback until a genuine Revision Attempt arrives last and
atomically produces `repeated_or_corroborated`. It also proves bounded
correction, duplicate, owner, generic-event, and bearer boundaries.

This checkpoint remains local. The completion program permits one private
deployment for Phase 2 only after the Diligence Case and Judgment Coach gates
are both complete and the phase receives its fixed-point reviews.
