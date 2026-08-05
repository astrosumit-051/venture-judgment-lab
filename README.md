# Venture Judgment Lab

A private, evidence-first practice environment for building venture judgment.
The site is the interactive learning surface; the dated records in this
workspace remain the durable source of truth.

## Working learning system

- **Daily Brief:** open four verified original sources, respond independently, and preserve one immutable Reading Record per source.
- **Snapshot Judgment:** commit a causal view, linked evidence, uncertainty, disposition, and confidence before deeper research.
- **Forecast:** lock a falsifiable claim, probability, resolution date, disconfirming condition, and resolution source.
- **Second-Order Map:** trace explicit first-, second-, and third-order consequences before stress-testing stakeholders, regulation, adjacent effects, and disconfirmation.
- **Weekly Underwrite:** test exactly three Load-Bearing Questions through a claim-linked Evidence Ledger, Founder Evidence, Countercase, and Decision Delta.
- **Practice modes:** preserve the accepted Normal, Monthly Calibration, Recruiting Surge, and Exam Mode arithmetic without hidden backlog.
- **Calibration Review:** resolve eligible Forecasts without changing their original odds, calculate a Brier score, diagnose sourcing and reasoning mistakes, and commit one changed decision rule.
- **History:** keep original submissions read-only and append later evidence, calibration, corrections, resolution, and coaching.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Use `npm test` for the production build and learning-surface integrity check.
With the local preview running, `node tests/api-smoke.mjs` verifies every
persisted workflow under an isolated verification identity. D1 persistence is
declared in `.openai/hosting.json` and initialized by the application.
