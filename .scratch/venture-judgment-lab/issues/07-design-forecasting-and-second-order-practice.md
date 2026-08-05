# Design Forecast and Second-Order Map practice

Type: prototype
Status: resolved
Parent: ../map.md
Blocked by: 03

## Question

How should the Lab elicit falsifiable Forecasts, causal Second-Order Maps, confidence, time horizons, disconfirming evidence, and later scoring so cross-domain foresight becomes calibrated rather than theatrical?

## Comments

- 2026-08-05: Claimed for the learner-requested completion pass. The implementation will preserve immutable Forecasts, require explicit first-, second-, and third-order causal links, and add a monthly Calibration Review that resolves predictions through append-only evidence and measures probabilistic accuracy.
- 2026-08-05: Implemented the accepted Prediction Ledger, three-step causal mapping, and atomic monthly calibration workflow in the private Lab. The production build and learning-surface integrity test pass. Local API smoke verification remains to be rerun in an environment permitted to start the preview server.

## Answer

Use the dated [Forecasting, Calibration, and Causal Mapping Standard](../../../records/forecasting-calibration-and-causal-mapping-2026-08-05.md). Forecasts preserve original odds and receive one evidence-linked resolution. Second-Order Maps explicitly trace direct, actor-response, and third-order consequences before testing the wider system. Monthly Calibration Reviews calculate Brier scores from the original probabilities, diagnose sourcing and reasoning mistakes, change one decision rule, and commit the review and its resolution events atomically.
