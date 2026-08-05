# Forecasting, Calibration, and Causal Mapping Standard — 2026-08-05

This record defines how Venture Judgment Lab turns predictions and causal maps
into measurable judgment practice. It completes the learner-approved addition
of a Prediction Ledger and explicit first-, second-, and third-order mapping
without adding hours to the sustainable weekly architecture.

## Forecast commitment

Every Forecast preserves a falsifiable event, an original probability between
1% and 99%, a real calendar resolution date, the learner's timezone, supporting
evidence or a base rate, a condition that would disconfirm the claim, and a named resolution source. A Forecast may
link to a Snapshot Judgment but never inherits certainty from it.

The original probability is immutable. Outcomes, evidence, source corrections,
and interpretation are later dated events rather than edits.

## Three-step causal mapping

A Second-Order Map must make three causal steps explicit:

1. the first-order consequence directly caused by the trigger;
2. the second-order consequence caused by actors responding to that first
   effect; and
3. the third-order consequence describing the resulting behavior, equilibrium,
   or adjacent-domain effect.

The map then stress-tests bottlenecks, incentives, suppliers, customers,
substitutes, regulation, adjacent domains, and the evidence that would break
the causal chain. A list of trends without causal links does not qualify.

## Monthly Calibration Review

A Monthly Calibration Review occupies the existing 60-minute calibration block
and may resolve any previously committed Forecast whose outcome is now
observable. Each resolution preserves:

- the original probability;
- a binary occurred or did-not-occur outcome;
- outcome evidence and its source; and
- the link to the review that recorded the resolution.

The Lab calculates the mean Brier score across Forecasts resolved in that
review: `(probability - outcome)^2`, using probabilities expressed from 0 to 1.
Zero is perfect and lower is better. A review with no resolvable Forecasts is
preserved as unscored rather than inventing an outcome.

An event that already occurred may be resolved before the horizon when the
named source makes it observable. Non-occurrence cannot be resolved until the
committed resolution date has fully elapsed in the Forecast's timezone.

Scoring is diagnostic, not a grade. The learner must also record sourcing
results, analytical mistakes, calibration findings, one changed decision rule,
and a concrete restart plan. A good outcome reached through bad reasoning still
requires correction; a bad outcome does not by itself prove that the process
was poor.

## Integrity rules

- A Forecast can receive only one resolution event.
- The database enforces that uniqueness even when two review attempts overlap.
- Resolution evidence must name a valid source.
- The score is calculated from the preserved original probability, never a
  learner-supplied replacement.
- The Calibration Review and its Forecast-resolution events are committed
  together so the record cannot show a score without its evidence.
- Historical Forecasts and maps remain readable even when later standards add
  stronger fields.
